// --- Game logic: two control modes, spawning, spread, building cooldowns ---
//  controls = 'tap'   : tap a burning window, truck handles everything (tier 1)
//  controls = 'steps' : v1-style — tap the truck, tap the hydrant, then aim
//                       the nozzle with the pointer and hold to spray
window.FF = window.FF || {};

FF.game = (function () {
    const CONFIG = {
        tapPad: 8,            // extra hit area around windows (toddler-sized)
        stepPad: 10,          // extra hit area around truck/hydrant taps
        PARK_X: 150,          // where the truck stages in steps mode
        SPRAYER_X: 224        // where the nozzle firefighter stands
    };

    let started = false;
    let savedCount = 0;
    let queue = [];           // tap mode: windows waiting for the truck
    let spawnT = 0;
    let celebrated = false;
    let shakeT = 0;
    let flashMsg = null, flashT = 0;
    let instructionEl, starsEl, celebrateEl;

    // steps mode state
    let phase = 'ARRIVE';     // ARRIVE -> TAP_TRUCK -> TAP_HYDRANT -> READY
    const pointer = { x: 192, y: 110 };
    let spraying = false;

    const S = () => FF.settings;
    const mode = () => (S().v.controls === 'tap' ? 'tap' : 'steps');
    const goal = () => parseInt(S().v.roundGoal, 10);
    const maxFires = () => parseInt(S().v.maxFires, 10);

    function init() {
        instructionEl = document.getElementById('instruction');
        starsEl = document.getElementById('stars');
        celebrateEl = document.getElementById('celebrate');
        reset();
    }

    function reset() {
        FF.scene.init();
        FF.particles.reset();
        FF.truck.reset();
        if (FF.audio) FF.audio.stopAll();
        savedCount = 0;
        queue = [];
        spawnT = 0;
        celebrated = false;
        shakeT = 0;
        flashMsg = null;
        spraying = false;
        celebrateEl.classList.add('hidden');

        if (mode() === 'steps') {
            phase = 'ARRIVE';
            FF.truck.parkOnly(CONFIG.PARK_X);
        } else {
            phase = 'READY';
        }

        igniteRandom();                     // first fire right away
        spawnT = S().num('fireRate') * 0.6; // second one comes fairly soon
        updateHud();
        started = true;
    }

    function activeFires() {
        return FF.scene.windows.filter(w => w.state === 'fire').length;
    }

    function spawnable() {
        return FF.scene.windows.filter(w =>
            w.state === 'ok' && FF.scene.buildings[w.b].cooldown <= 0
        );
    }

    function igniteRandom() {
        const ok = spawnable();
        if (!ok.length) return false;
        ignite(ok[Math.floor(Math.random() * ok.length)]);
        return true;
    }

    function ignite(w) {
        w.state = 'fire';
        w.intensity = 1;
        w.spreadT = 0;
        w.lit = false;
    }

    // fires still needed to reach the goal, beyond the ones already burning
    function budgetLeft() {
        return goal() - savedCount - activeFires();
    }

    function inRect(ix, iy, r, pad) {
        return ix >= r.x - pad && ix <= r.x + r.w + pad &&
               iy >= r.y - pad && iy <= r.y + r.h + pad;
    }

    // --- input ---

    function pointerDown(ix, iy) {
        if (!started || celebrated) return;
        if (FF.audio) FF.audio.ensure();
        pointer.x = ix; pointer.y = iy;

        if (mode() === 'tap') { tapModeTap(ix, iy); return; }

        switch (phase) {
            case 'TAP_TRUCK':
                if (inRect(ix, iy, FF.truck.rect, CONFIG.stepPad)) {
                    if (FF.audio) { FF.audio.tap(); FF.audio.ratchet(); }
                    flash('HOSE CONNECTED! 🚒', 1400);
                    phase = 'TAP_HYDRANT';
                }
                break;
            case 'TAP_HYDRANT':
                if (inRect(ix, iy, FF.scene.HYDRANT, CONFIG.stepPad)) {
                    if (FF.audio) { FF.audio.tap(); FF.audio.saveChime(); }
                    flash('WATER ON! 💧', 1400);
                    phase = 'READY';
                }
                break;
            case 'READY':
                spraying = true;
                if (FF.audio) FF.audio.sprayStart();
                break;
        }
    }

    function pointerMove(ix, iy) {
        pointer.x = ix; pointer.y = iy;
    }

    function pointerUp() {
        if (spraying && FF.audio) FF.audio.sprayStop();
        spraying = false;
    }

    // tap mode: original tier-1 tap-the-fire
    function tapModeTap(ix, iy) {
        const pad = CONFIG.tapPad;
        const hit = FF.scene.windows.find(w =>
            w.state === 'fire' && inRect(ix, iy, w, pad)
        );
        if (!hit) return;
        if (hit === FF.truck.target || queue.includes(hit)) return;

        if (FF.audio) FF.audio.tap();
        if (!FF.truck.busy) {
            FF.truck.dispatch(hit);
        } else {
            queue.push(hit);
        }
    }

    // kept for compatibility (tests, tap mode)
    function tap(ix, iy) { pointerDown(ix, iy); }

    // --- saving windows / buildings ---

    function onWindowSaved(w) {
        w.state = 'saved';
        w.intensity = 0;
        w.soot = true;
        w.sparkleT = 2000;
        savedCount++;
        FF.particles.burstSteam(w);
        FF.particles.starPop(w.x + w.w / 2, w.y - 4);
        if (FF.audio) FF.audio.saveChime();
        FF.truck.finishSpray();
        shakeT = 220;
        updateHud();

        // whole building cleared? give it a shield + cooldown
        const b = FF.scene.buildings[w.b];
        if (!b.windows.some(o => o.state === 'fire')) {
            b.cooldown = S().num('safeTime');
            b.badgeT = 0;
            flash('BUILDING SAFE! 🏢✨', 2600);
            if (FF.audio) FF.audio.fanfare();
        }

        if (savedCount >= goal() && !celebrated) {
            celebrated = true;
            pointerUp();
            setTimeout(celebrate, 1600);
        }
    }

    function celebrate() {
        FF.particles.celebrateConfetti();
        if (FF.audio) FF.audio.fanfare();
        celebrateEl.classList.remove('hidden');
        instructionEl.style.opacity = '0';
    }

    function flash(msg, ms) {
        flashMsg = msg;
        flashT = ms;
    }

    // --- fire spawning / spreading ---

    function updateSpawning(dt) {
        if (celebrated) return;
        if (budgetLeft() <= 0) return;
        if (activeFires() >= maxFires()) return;
        spawnT += dt;
        if (spawnT >= S().num('fireRate')) {
            if (igniteRandom()) spawnT = 0;
        }
    }

    function updateSpread(dt) {
        const interval = S().num('spread');
        if (!interval || celebrated) return;
        FF.scene.windows.forEach(w => {
            if (w.state !== 'fire') return;
            w.spreadT += dt;
            if (w.spreadT >= interval && budgetLeft() > 0) {
                w.spreadT = 0;
                const targets = FF.scene.neighbors(w).filter(o => o.state === 'ok');
                if (targets.length) {
                    ignite(targets[Math.floor(Math.random() * targets.length)]);
                }
            }
        });
    }

    // --- steps mode: the nozzle firefighter ---

    function sprayerPos() {
        return { x: CONFIG.SPRAYER_X, y: 196 };  // sprite top-left, standing on the road
    }

    function nozzlePoint() {
        const f = sprayerPos();
        const left = pointer.x < f.x + 5;
        return { x: left ? f.x : f.x + 9, y: f.y + 7, left };
    }

    function updateAimSpray() {
        if (!spraying || phase !== 'READY' || celebrated) return;
        const n = nozzlePoint();
        const g = 0.012;
        const dx = pointer.x - n.x, dy = pointer.y - n.y;
        const d = Math.max(8, Math.hypot(dx, dy));
        for (let i = 0; i < 3; i++) {
            const sp = 3.0 + Math.random() * 0.5;
            const tf = d / sp;   // frames of flight
            // ballistic aim assist: the arc lands right on the pointer
            FF.particles.spawnDrop(
                n.x, n.y,
                dx / tf + (Math.random() - 0.5) * 0.12,
                dy / tf - 0.5 * g * tf + (Math.random() - 0.5) * 0.12,
                g
            );
        }
    }

    function waterVsFires() {
        const power = S().num('water');
        const drops = FF.particles.drops;
        const fires = FF.scene.windows.filter(w => w.state === 'fire');
        if (!fires.length) return;

        for (const d of drops) {
            if (d.life <= 0) continue;
            for (const w of fires) {
                if (w.state !== 'fire') continue;
                if (d.x >= w.x - 1 && d.x <= w.x + w.w + 1 &&
                    d.y >= w.y - 1 && d.y <= w.y + w.h + 1) {
                    d.life = 0;
                    FF.particles.hitSteam(d.x, d.y);
                    w.intensity -= power;
                    if (w.intensity <= 0) onWindowSaved(w);
                    break;
                }
            }
        }
    }

    // --- per-frame update ---

    function update(dt, t) {
        if (!started) return;

        if (shakeT > 0) shakeT -= dt;
        if (flashT > 0) { flashT -= dt; if (flashT <= 0) flashMsg = null; }

        FF.scene.buildings.forEach(b => {
            if (b.cooldown > 0) b.cooldown -= dt;
        });

        updateSpawning(dt);
        updateSpread(dt);

        if (mode() === 'steps') {
            if (phase === 'ARRIVE' && FF.truck.state === 'STAGED') {
                phase = 'TAP_TRUCK';
            }
            updateAimSpray();
        } else {
            // dispatch queued fires once the truck frees up
            if (!FF.truck.busy && queue.length) {
                const next = queue.shift();
                if (next.state === 'fire') FF.truck.dispatch(next);
            }
        }

        FF.scene.windows.forEach(w => {
            if (w.state === 'fire') FF.particles.spawnFlames(w);
        });

        FF.truck.update(dt);
        FF.scene.update(dt);
        FF.particles.update(dt, t);

        waterVsFires();

        updateInstruction();
    }

    // --- HUD ---

    function updateInstruction() {
        if (celebrated) return;
        let msg;
        if (flashMsg) {
            msg = flashMsg;
        } else if (mode() === 'steps') {
            switch (phase) {
                case 'ARRIVE':
                    msg = FF.truck.state === 'DRIVING' ? 'HERE COMES THE TRUCK! 🚒' : 'FIREFIGHTERS, GO! 👨‍🚒';
                    break;
                case 'TAP_TRUCK':   msg = 'TAP THE FIRE TRUCK! 🚒'; break;
                case 'TAP_HYDRANT': msg = 'TAP THE HYDRANT! 💧'; break;
                default:
                    msg = !anyFires() ? 'GREAT WORK! ⭐'
                        : (spraying ? 'SOAK THE FIRE! 💦' : 'PRESS AND HOLD TO SPRAY! 💦');
            }
        } else {
            switch (FF.truck.state) {
                case 'DRIVING': msg = 'HERE COMES THE TRUCK! 🚒'; break;
                case 'DEPLOY':  msg = 'FIREFIGHTERS, GO! 👨‍🚒'; break;
                case 'RAISE':
                case 'EXTEND':  msg = 'LADDER UP! 🪜'; break;
                case 'SPRAY':   msg = 'SPRAY THE WATER! 💦'; break;
                case 'RETRACT':
                case 'PACK':    msg = 'FIRE\'S OUT! ⭐'; break;
                default:
                    msg = anyFires() ? 'TAP THE FIRE! 🔥' : 'GREAT WORK! ⭐';
            }
        }
        if (instructionEl.textContent !== msg) instructionEl.textContent = msg;
    }

    function anyFires() {
        return FF.scene.windows.some(w => w.state === 'fire');
    }

    function updateHud() {
        const g = goal();
        let s = '';
        for (let i = 0; i < g; i++) s += i < savedCount ? '⭐' : '☆';
        starsEl.textContent = s;
        starsEl.classList.toggle('small', g > 6);
        instructionEl.style.opacity = '1';
    }

    function onSettingChanged(key) {
        if (key === 'roundGoal') updateHud();
        if (key === 'controls') reset();
    }

    // --- world-space overlays ---

    function drawHose(x) {
        const P = FF.PAL;
        const port = FF.truck.portPoint;
        const hyd = FF.scene.HYDRANT;
        x.fillStyle = '#7a2a26';

        // truck -> hydrant (connected once the truck has been tapped)
        if (phase === 'TAP_HYDRANT' || phase === 'READY') {
            const hy = 200;
            x.fillRect(hyd.x + 6, hyd.y + 9, 2, hy - (hyd.y + 9));      // down from hydrant
            x.fillRect(Math.min(hyd.x + 6, port.x), hy, Math.abs(port.x - hyd.x - 6) + 2, 2);
            x.fillRect(port.x, port.y, 2, hy - port.y);                 // up into the pump
            // coupling
            x.fillStyle = P.hyd;
            x.fillRect(hyd.x + 5, hyd.y + 9, 4, 3);
        }

        // truck -> nozzle firefighter
        if (phase === 'READY') {
            const f = sprayerPos();
            x.fillStyle = '#7a2a26';
            const gy = 205;
            x.fillRect(Math.floor(FF.truck.x) + 52, gy, (f.x + 4) - (Math.floor(FF.truck.x) + 52), 2);
            x.fillRect(f.x + 4, f.y + 9, 2, gy - (f.y + 9) + 2);
        }
    }

    function drawSprayer(x, t) {
        if (phase !== 'READY' && phase !== 'TAP_HYDRANT') return;
        const Sp = FF.sprites;
        const f = sprayerPos();
        const n = nozzlePoint();

        const spr = (phase === 'READY') ? Sp.ffSpray : Sp.ffStand;
        if (n.left) {
            x.save();
            x.translate(f.x + 5, 0);
            x.scale(-1, 1);
            x.translate(-(f.x + 5), 0);
            x.drawImage(spr, f.x, f.y);
            x.restore();
        } else {
            x.drawImage(spr, f.x, f.y);
        }

        // nozzle barrel pointing at the aim
        if (phase === 'READY') {
            let dx = pointer.x - n.x, dy = pointer.y - n.y;
            const d = Math.max(8, Math.hypot(dx, dy));
            x.fillStyle = FF.PAL.steel;
            x.fillRect(Math.round(n.x + (dx / d) * 2) , Math.round(n.y + (dy / d) * 2), 2, 2);
        }
    }

    function drawAimCursor(x, t) {
        if (phase !== 'READY' || celebrated) return;
        const pulse = Math.floor(t / 200) % 2;
        x.strokeStyle = pulse ? '#ffffff' : FF.PAL.water1;
        x.lineWidth = 1;
        const px = Math.round(pointer.x), py = Math.round(pointer.y);
        x.strokeRect(px - 4.5, py - 4.5, 9, 9);
        x.fillStyle = spraying ? FF.PAL.water2 : '#ffffff';
        x.fillRect(px, py, 1, 1);
    }

    function drawStepMarker(x, t) {
        let r = null;
        if (phase === 'TAP_TRUCK') r = FF.truck.rect;
        else if (phase === 'TAP_HYDRANT') r = FF.scene.HYDRANT;
        if (!r) return;
        const pulse = Math.floor(t / 250) % 2;
        x.strokeStyle = pulse ? '#ffffff' : FF.PAL.fire1;
        x.lineWidth = 1;
        const g = pulse ? 3 : 5;
        x.strokeRect(r.x - g + 0.5, r.y - g + 0.5, r.w + g * 2 - 1, r.h + g * 2 - 1);
    }

    function draw(x, t) {
        if (mode() === 'steps') {
            drawHose(x);
            drawSprayer(x, t);
            drawStepMarker(x, t);
            drawAimCursor(x, t);
            return;
        }

        // tap mode: reticles on targeted fires
        const marks = [];
        if (FF.truck.target && FF.truck.target.state === 'fire') marks.push(FF.truck.target);
        queue.forEach(w => { if (w.state === 'fire') marks.push(w); });
        const pulse = Math.floor(t / 250) % 2;
        marks.forEach(w => {
            x.strokeStyle = pulse ? '#ffffff' : FF.PAL.fire1;
            x.lineWidth = 1;
            x.strokeRect(w.x - 3.5, w.y - 3.5, w.w + 7, w.h + 7);
        });
    }

    function shakeOffset() {
        if (shakeT <= 0) return { x: 0, y: 0 };
        return {
            x: Math.round((Math.random() - 0.5) * 2),
            y: Math.round((Math.random() - 0.5) * 2)
        };
    }

    return {
        init, reset, tap, pointerDown, pointerMove, pointerUp,
        update, draw, shakeOffset, onSettingChanged, CONFIG,
        get phase() { return phase; },
        get spraying() { return spraying; }
    };
})();
