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
        if (FF.units) FF.units.reset();
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

        const b = FF.scene.buildings[w.b];

        // rule: nobody stays in a burning window — they head to the meeting point
        if (w.occupant >= 0) {
            b.crowd.push(w.occupant);
            w.occupant = -1;
        }

        // sometimes neighbors get trapped and wave for the big ladder
        if (S().v.people !== 'on') return;
        const helpsGlobal = FF.scene.windows.filter(o => o.state === 'help').length;
        const helpsHere = b.windows.some(o => o.state === 'help');
        if (!helpsHere && helpsGlobal < 2 && Math.random() < 0.45) {
            // ground-floor folks can walk out the door — only upper floors get trapped
            const cands = b.windows.filter(o =>
                o.state === 'ok' && o !== w && o.row < b.floors - 1
            );
            const withPeople = cands.filter(o => o.occupant >= 0);
            const pool = withPeople.length ? withPeople : cands;
            const pick = pool[Math.floor(Math.random() * pool.length)];
            if (pick) {
                pick.state = 'help';
                pick.lit = true;
                if (pick.occupant < 0) pick.occupant = Math.floor(Math.random() * FF.sprites.people.length);
                pick.helper2 = (pick.occupant + 1 + Math.floor(Math.random() * 2)) % FF.sprites.people.length;
                flash('SOMEONE NEEDS THE BIG LADDER! 🪜', 2400);
            }
        }
    }

    // a ladder tip reached trapped people — bring them down to the meeting point
    function onWindowRescued(w) {
        if (w.state !== 'help') return;
        const b = FF.scene.buildings[w.b];
        b.crowd.push(w.occupant >= 0 ? w.occupant : 0);
        if (w.helper2 !== undefined) b.crowd.push(w.helper2);
        w.occupant = -1;
        w.helper2 = undefined;
        w.state = 'ok';
        w.lit = true;
        w.sparkleT = 2000;
        savedCount++;
        FF.particles.starPop(w.x + w.w / 2, w.y - 4);
        if (FF.audio) FF.audio.fanfare();
        if (FF.truck.target === w) FF.truck.finishSpray();
        flash('RESCUED! 🙌⭐', 2400);
        shakeT = 220;
        updateHud();
        if (savedCount >= goal() && !celebrated) {
            celebrated = true;
            pointerUp();
            setTimeout(celebrate, 1600);
        }
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

        // walkie-talkie + backup trucks get first crack at the tap
        if (FF.units && FF.units.handleTap(ix, iy)) return;

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

    // tap mode: original tier-1 tap-the-fire (or tap trapped people)
    function tapModeTap(ix, iy) {
        const pad = CONFIG.tapPad;
        const hit = FF.scene.windows.find(w =>
            (w.state === 'fire' || w.state === 'help') && inRect(ix, iy, w, pad)
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

        // whole building cleared (and nobody trapped)? give it a shield + cooldown
        const b = FF.scene.buildings[w.b];
        if (!b.windows.some(o => o.state === 'fire' || o.state === 'help')) {
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
            // ballistic aim assist: the arc lands right on the pointer,
            // and the drop deposits wetness where it lands
            FF.particles.spawnDrop(
                n.x, n.y,
                dx / tf + (Math.random() - 0.5) * 0.12,
                dy / tf - 0.5 * g * tf + (Math.random() - 0.5) * 0.12,
                g,
                tf * (1.02 + Math.random() * 0.14)
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
                    FF.particles.spawnWet(d.x, d.y, false);
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
            // dispatch queued fires/rescues once the truck frees up
            if (!FF.truck.busy && queue.length) {
                const next = queue.shift();
                if (next.state === 'fire' || next.state === 'help') FF.truck.dispatch(next);
            }
        }

        FF.scene.windows.forEach(w => {
            if (w.state === 'fire') FF.particles.spawnFlames(w);
        });

        FF.truck.update(dt);
        if (FF.units) FF.units.update(dt);
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
                case 'SPRAY':
                    msg = (FF.truck.target && FF.truck.target.state === 'help')
                        ? 'RESCUING! 🙌' : 'SPRAY THE WATER! 💦';
                    break;
                case 'WALK':    msg = 'FIREFIGHTERS, GO! 👨‍🚒'; break;
                case 'GSPRAY':  msg = 'SPRAY THE WATER! 💦'; break;
                case 'WALKBACK':
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

    // --- world-space overlays (painted style) ---

    function roundMark(x, r, t, color) {
        const pulse = Math.floor(t / 250) % 2;
        const grow = pulse ? 3 : 5;
        x.save();
        x.strokeStyle = pulse ? 'rgba(255,255,255,0.95)' : color;
        x.lineWidth = 1.4;
        x.shadowColor = 'rgba(255,217,85,0.8)';
        x.shadowBlur = 4;
        const px = r.x - grow, py = r.y - grow, pw = r.w + grow * 2, ph = r.h + grow * 2, rr = 4;
        x.beginPath();
        x.moveTo(px + rr, py);
        x.arcTo(px + pw, py, px + pw, py + ph, rr);
        x.arcTo(px + pw, py + ph, px, py + ph, rr);
        x.arcTo(px, py + ph, px, py, rr);
        x.arcTo(px, py, px + pw, py, rr);
        x.closePath();
        x.stroke();
        x.restore();
    }

    function drawHose(x) {
        const port = FF.truck.portPoint;
        const hyd = FF.scene.HYDRANT;

        x.save();
        x.strokeStyle = '#7a2a26';
        x.lineWidth = 2.2;
        x.lineCap = 'round';
        x.lineJoin = 'round';

        // hydrant -> truck pump (connected once the truck has been tapped)
        if (phase === 'TAP_HYDRANT' || phase === 'READY') {
            const gy = 201;
            x.beginPath();
            x.moveTo(hyd.x + 7, hyd.y + 10);
            x.quadraticCurveTo(hyd.x + 7, gy + 3, (hyd.x + 7 + port.x) / 2, gy + 2);
            x.quadraticCurveTo(port.x, gy + 3, port.x + 1, port.y);
            x.stroke();
            // brass coupling on the hydrant
            x.fillStyle = FF.PAL.hyd;
            x.beginPath(); x.arc(hyd.x + 7, hyd.y + 10, 1.8, 0, Math.PI * 2); x.fill();
        }

        // truck -> nozzle firefighter
        if (phase === 'READY') {
            const f = sprayerPos();
            const gy = 206;
            x.beginPath();
            x.moveTo(Math.floor(FF.truck.x) + 52, gy - 2);
            x.quadraticCurveTo((Math.floor(FF.truck.x) + 52 + f.x) / 2, gy + 3, f.x + 4, f.y + 10);
            x.stroke();
        }

        // subtle top highlight
        x.strokeStyle = 'rgba(255,255,255,0.18)';
        x.lineWidth = 0.8;
        x.stroke();
        x.restore();
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
            x.drawImage(spr, f.x, f.y, 10, 14);
            x.restore();
        } else {
            x.drawImage(spr, f.x, f.y, 10, 14);
        }

        // nozzle barrel pointing at the aim
        if (phase === 'READY') {
            const dx = pointer.x - n.x, dy = pointer.y - n.y;
            const d = Math.max(8, Math.hypot(dx, dy));
            x.save();
            x.strokeStyle = FF.PAL.steel;
            x.lineWidth = 1.6;
            x.lineCap = 'round';
            x.beginPath();
            x.moveTo(n.x, n.y);
            x.lineTo(n.x + (dx / d) * 3.5, n.y + (dy / d) * 3.5);
            x.stroke();
            x.restore();
        }
    }

    function drawAimCursor(x, t) {
        if (phase !== 'READY' || celebrated) return;
        const pulse = 0.75 + 0.25 * Math.sin(t * 0.012);
        const px = pointer.x, py = pointer.y;
        x.save();
        x.strokeStyle = spraying ? 'rgba(111,195,239,0.95)' : 'rgba(255,255,255,0.9)';
        x.lineWidth = 1.4;
        x.shadowColor = 'rgba(111,195,239,0.8)';
        x.shadowBlur = 5;
        x.beginPath();
        x.arc(px, py, 5 * pulse, 0, Math.PI * 2);
        x.stroke();
        x.fillStyle = spraying ? FF.PAL.water2 : '#ffffff';
        x.beginPath();
        x.arc(px, py, 1, 0, Math.PI * 2);
        x.fill();
        x.restore();
    }

    function drawStepMarker(x, t) {
        if (phase === 'TAP_TRUCK') roundMark(x, FF.truck.rect, t, FF.PAL.fire1);
        else if (phase === 'TAP_HYDRANT') roundMark(x, FF.scene.HYDRANT, t, FF.PAL.water2);
    }

    // world-layer bits that trucks should drive IN FRONT of
    // (called from the main loop before FF.units.draw)
    function drawWorld(x, t) {
        if (mode() === 'steps') {
            drawHose(x);
            drawSprayer(x, t);
        }
    }

    function draw(x, t) {
        // trapped people waiting for the big ladder (both modes)
        FF.scene.windows.forEach(w => {
            if (w.state === 'help') roundMark(x, w, t, FF.PAL.water2);
        });

        if (mode() === 'steps') {
            drawStepMarker(x, t);
            drawAimCursor(x, t);
            return;
        }

        // tap mode: glowing reticles on targeted fires
        const marks = [];
        if (FF.truck.target &&
            (FF.truck.target.state === 'fire' || FF.truck.target.state === 'help')) {
            marks.push(FF.truck.target);
        }
        queue.forEach(w => { if (w.state === 'fire' || w.state === 'help') marks.push(w); });
        marks.forEach(w => roundMark(x, w, t, FF.PAL.fire1));
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
        update, draw, drawWorld, shakeOffset, onSettingChanged, CONFIG, flash,
        onWindowRescued,
        get pointer() { return pointer; },
        get phase() { return phase; },
        get spraying() { return spraying; }
    };
})();
