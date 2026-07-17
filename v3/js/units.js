// --- Backup units: walkie-talkie dispatch + two ladder trucks (painted) ---
//  Press a walkie-talkie button -> a ladder truck rolls in.
//  Tap the arrived truck once -> the crew does the needful: a firefighter
//  hops out, hooks the hose to the hydrant, the outriggers drop, the ladder
//  raises and extends, and the cannon crew starts soaking nearby fires.
//  Tap again -> ladder packs up (tap once more to redeploy).
window.FF = window.FF || {};

FF.units = (function () {
    const P = FF.PAL;

    const GROUND = 214;          // foreground lane, slightly in front of truck 1
    const BODY_W = 62, BODY_H = 15;
    const RANGE = 175;           // how far a cannon can reach horizontally
    const MAX_LEN = 172;

    const SCHEMES = {
        red:   { light: '#f06a58', base: P.red,      dark: P.redDark, ink: 'rgba(90,18,16,0.6)' },
        green: { light: '#a4d64e', base: '#7fb640',  dark: '#567c26', ink: 'rgba(38,58,14,0.6)' }
    };

    function mkTruck(id, dir, scheme, parkX) {
        return {
            id, dir, scheme, parkX,
            x: dir > 0 ? -BODY_W - 30 : FF.W + 30,
            state: 'IDLE',       // IDLE, DRIVING, WAIT, CREW, CONNECT, RAISE, EXTEND, READY, RETRACT
            stateT: 0,
            wheelRot: 0,
            lightT: Math.random() * 400,
            hoseConnected: false,
            walker: null,        // { x, y, tx, done }
            hydrant: null,
            restAngle: dir > 0 ? 0 : Math.PI,
            ladderAngle: dir > 0 ? 0 : Math.PI,
            ladderLen: 10,
            targetAngle: 0,
            targetLen: 60,
            target: null,
            rescueT: 0,
            wetT: 0,
            gunner: null,        // { x, dir } firefighter on foot for ground-floor fires
            cannonA: 0           // free-cannon angle (follows the pointer)
        };
    }

    function isGroundFloor(win) {
        return win && win.row === FF.scene.buildings[win.b].floors - 1;
    }

    function cabExitX(u) {
        return u.dir > 0 ? u.x + BODY_W + 2 : u.x - 12;
    }

    const trucks = [
        mkTruck(2, -1, SCHEMES.red,   420),  // rolls in from the right
        mkTruck(3,  1, SCHEMES.green, 252)   // rolls in from the left
    ];

    const walkie = {
        x: 0, y: 0, w: 24, h: 32,      // positioned in reset()
        press: [0, 0]                  // press-flash timers per button
    };

    function reset() {
        trucks[0] = mkTruck(2, -1, SCHEMES.red, 420);
        trucks[1] = mkTruck(3, 1, SCHEMES.green, 252);
        walkie.x = FF.W - 30;
        walkie.y = FF.H - 38;
        walkie.press = [0, 0];
        hintT = 6000;
        needBackup = false;
    }

    // --- geometry ---

    function pivot(u) {
        return {
            x: u.dir > 0 ? u.x + 11 : u.x + BODY_W - 11,
            y: GROUND - 22
        };
    }

    function ladderTip(u) {
        const pv = pivot(u);
        return {
            x: pv.x + Math.cos(u.ladderAngle) * u.ladderLen,
            y: pv.y + Math.sin(u.ladderAngle) * u.ladderLen
        };
    }

    function truckRect(u) {
        return { x: u.x - 4, y: GROUND - 38, w: BODY_W + 8, h: 40 };
    }

    function btnRect(i) {
        return {
            x: walkie.x + 2 + i * 10.6, y: walkie.y + 16.5,
            w: 9.4, h: 8.5
        };
    }

    function inRect(ix, iy, r, pad) {
        pad = pad || 0;
        return ix >= r.x - pad && ix <= r.x + r.w + pad &&
               iy >= r.y - pad && iy <= r.y + r.h + pad;
    }

    // normalize an aim angle into the truck's continuous "above ground" band
    function aimAngle(u, ex, ey) {
        const pv = pivot(u);
        let a = Math.atan2(ey - pv.y, ex - pv.x);
        if (u.dir < 0 && a < Math.PI / 2) a += Math.PI * 2;  // (PI .. 2PI) band
        return a;
    }

    function computeGoal(u, win) {
        const pv = pivot(u);
        const ex = win.x + win.w / 2 + (u.dir > 0 ? -6 : 6);
        const ey = win.y + win.h + 12;
        u.targetAngle = aimAngle(u, ex, ey);
        u.targetLen = Math.min(MAX_LEN, Math.hypot(ex - pv.x, ey - pv.y));
    }

    function defaultGoal(u) {
        u.targetAngle = u.dir > 0 ? -1.25 : Math.PI * 2 - 1.85;  // tilted toward downtown
        u.targetLen = 62;
        u.target = null;
    }

    function acquireTarget(u) {
        const pv = pivot(u);
        const other = trucks.find(o => o !== u);
        const cands = FF.scene.windows.filter(w =>
            (w.state === 'fire' || w.state === 'help') &&
            Math.abs(w.x + w.w / 2 - pv.x) <= RANGE
        );
        if (!cands.length) return null;
        const free = cands.filter(w => w !== other.target && w !== FF.truck.target);
        const pool = free.length ? free : cands;
        // trapped people come first, then nearest fire
        pool.sort((a, b) => {
            if (a.state !== b.state) return a.state === 'help' ? -1 : 1;
            return Math.hypot(a.x + a.w / 2 - pv.x, a.y - pv.y) -
                   Math.hypot(b.x + b.w / 2 - pv.x, b.y - pv.y);
        });
        return pool[0];
    }

    function flash(msg, ms) {
        if (FF.game && FF.game.flash) FF.game.flash(msg, ms);
    }

    // --- dispatch + tap handling ---

    function call(u) {
        if (u.state !== 'IDLE') return;
        u.state = 'DRIVING';
        u.stateT = 0;
        if (FF.audio) { FF.audio.ensure(); FF.audio.sirenStart(); }
        flash('BACKUP IS ON THE WAY! 🚒', 1800);
    }

    function truckTapped(u) {
        switch (u.state) {
            case 'WAIT':
                if (FF.audio) FF.audio.tap();
                if (!u.hoseConnected) {
                    // crew hops out and walks to the hydrant
                    const hyds = FF.scene.HYDRANTS;
                    u.hydrant = hyds.reduce((a, b) =>
                        Math.abs(a.cx - (u.x + BODY_W / 2)) < Math.abs(b.cx - (u.x + BODY_W / 2)) ? a : b
                    );
                    const exitRight = u.hydrant.cx > u.x + BODY_W / 2;
                    u.walker = {
                        x: exitRight ? u.x + BODY_W + 2 : u.x - 12,
                        y: GROUND - 14,
                        tx: u.hydrant.cx + (exitRight ? -12 : 7),
                        done: false
                    };
                    u.state = 'CREW';
                    u.stateT = 0;
                    flash('HOOKING UP THE HOSE! 👨‍🚒', 1800);
                } else {
                    u.state = 'RAISE';
                    u.stateT = 0;
                    const w = acquireTarget(u);
                    if (w) { u.target = w; computeGoal(u, w); } else defaultGoal(u);
                    if (FF.audio) FF.audio.ratchet();
                    flash('LADDER UP! 🪜', 1600);
                }
                return true;
            case 'READY':
                if (FF.audio) FF.audio.tap();
                u.state = 'RETRACT';
                u.stateT = 0;
                u.target = null;
                return true;
        }
        return false;
    }

    function handleTap(ix, iy) {
        // walkie-talkie buttons
        for (let i = 0; i < 2; i++) {
            if (inRect(ix, iy, btnRect(i), 4)) {
                walkie.press[i] = 180;
                const u = trucks[i];
                if (u.state === 'IDLE') call(u);
                else truckTapped(u);
                return true;
            }
        }
        // the trucks themselves
        for (const u of trucks) {
            if (u.state === 'IDLE' || u.state === 'DRIVING') continue;
            if (inRect(ix, iy, truckRect(u))) {
                truckTapped(u);
                return true;
            }
        }
        return false;
    }

    // --- update ---

    function anyDriving() {
        return trucks.some(u => u.state === 'DRIVING');
    }

    // --- discoverability: nudge the player toward the walkie-talkie ---

    let hintT = 6000;
    let needBackup = false;

    function updateHints(dt) {
        const anyIdle = trucks.some(u => u.state === 'IDLE');
        const helps = FF.scene.windows.some(w => w.state === 'help');
        const fires = FF.scene.windows.filter(w => w.state === 'fire').length;
        needBackup = anyIdle && (helps || fires >= 2);
        if (!needBackup) { hintT = Math.min(hintT, 6000); return; }
        hintT += dt;
        if (hintT >= 9000) {
            hintT = 0;
            flash(helps
                ? 'THEY NEED THE BIG LADDER! USE THE WALKIE-TALKIE! 📻'
                : 'LOTS OF FIRE! CALL BACKUP ON THE WALKIE-TALKIE! 📻', 3000);
        }
    }

    // spray landed on a backup truck? give it a wet sheen
    function markWetAt(x, y) {
        for (const u of trucks) {
            if (u.state === 'IDLE') continue;
            if (x >= u.x && x <= u.x + BODY_W &&
                y >= GROUND - 8 - BODY_H - 4 && y <= GROUND) {
                u.wetT = Math.min(15000, u.wetT + 2500);
                return true;
            }
        }
        return false;
    }

    function update(dt) {
        const step = dt / 16.67;
        walkie.press[0] = Math.max(0, walkie.press[0] - dt);
        walkie.press[1] = Math.max(0, walkie.press[1] - dt);

        updateHints(dt);

        trucks.forEach(u => {
            u.stateT += dt;
            u.lightT += dt;
            if (u.wetT > 0) u.wetT -= dt;

            switch (u.state) {
                case 'DRIVING': {
                    const speed = 1.5 * step;
                    const d = u.parkX - u.x;
                    if (Math.abs(d) <= speed) {
                        u.x = u.parkX;
                        u.state = 'WAIT';
                        u.stateT = 0;
                        if (FF.audio) {
                            if (!anyDriving() && FF.truck.state !== 'DRIVING') FF.audio.sirenStop();
                            FF.audio.airBrake();
                        }
                        flash('BACKUP IS HERE! TAP THE TRUCK! 🚒', 2200);
                    } else {
                        u.x += Math.sign(d) * speed;
                        u.wheelRot += Math.sign(d) * speed * 0.5;
                    }
                    break;
                }
                case 'CREW': {
                    const w = u.walker;
                    const d = w.tx - w.x;
                    const speed = 0.85 * step;
                    if (Math.abs(d) <= speed) {
                        w.x = w.tx;
                        u.state = 'CONNECT';
                        u.stateT = 0;
                        if (FF.audio) FF.audio.ratchet();
                    } else {
                        w.x += Math.sign(d) * speed;
                    }
                    break;
                }
                case 'CONNECT':
                    if (u.stateT > 900) {
                        u.hoseConnected = true;
                        u.walker.done = true;
                        u.state = 'RAISE';
                        u.stateT = 0;
                        const w = acquireTarget(u);
                        if (w) { u.target = w; computeGoal(u, w); } else defaultGoal(u);
                        if (FF.audio) FF.audio.saveChime();
                        flash('WATER ON! LADDER UP! 💧🪜', 2000);
                    }
                    break;
                case 'RAISE':
                    u.ladderAngle += (u.targetAngle - u.ladderAngle) * 0.08 * step;
                    if (Math.abs(u.targetAngle - u.ladderAngle) < 0.03) {
                        u.ladderAngle = u.targetAngle;
                        u.state = 'EXTEND';
                        u.stateT = 0;
                    }
                    break;
                case 'EXTEND': {
                    const d = u.targetLen - u.ladderLen;
                    const speed = 1.2 * step;
                    if (Math.abs(d) <= speed) {
                        u.ladderLen = u.targetLen;
                        u.state = 'READY';
                        u.stateT = 0;
                        flash('LADDER TRUCK READY! 💦', 1800);
                    } else {
                        u.ladderLen += Math.sign(d) * speed;
                    }
                    break;
                }
                case 'READY': {
                    // keep or find a target window
                    if (!u.target || (u.target.state !== 'fire' && u.target.state !== 'help')) {
                        u.target = acquireTarget(u);
                        u.rescueT = 0;
                        if (u.target && !isGroundFloor(u.target)) computeGoal(u, u.target);
                    }

                    if (u.target && isGroundFloor(u.target)) {
                        // no ladder for the first floor — a firefighter goes on foot
                        easeLadder(u, u.dir > 0 ? -1.25 : Math.PI * 2 - 1.85, 62, step);
                        updateGunner(u, u.target, step);
                    } else if (u.target) {
                        returnGunner(u, step);
                        u.ladderAngle += (u.targetAngle - u.ladderAngle) * 0.06 * step;
                        const dl = u.targetLen - u.ladderLen;
                        u.ladderLen += Math.max(-1.1 * step, Math.min(1.1 * step, dl));
                        const aimed = Math.abs(u.targetAngle - u.ladderAngle) < 0.12 &&
                                      Math.abs(dl) < 14;
                        if (!aimed) {
                            u.rescueT = 0;
                        } else if (u.target.state === 'fire') {
                            sprayAt(u, u.target);
                        } else {
                            // hold the ladder while the trapped people climb down
                            u.rescueT += dt;
                            if (u.rescueT > 2200) {
                                u.rescueT = 0;
                                if (FF.game && FF.game.onWindowRescued) {
                                    FF.game.onWindowRescued(u.target);
                                }
                                u.target = null;
                            }
                        }
                    } else {
                        // nothing for the crew to do: the cannon follows the player
                        returnGunner(u, step);
                        easeLadder(u, u.dir > 0 ? -1.25 : Math.PI * 2 - 1.85, 62, step);
                        followPointer(u);
                    }
                    break;
                }
                case 'RETRACT':
                    if (u.ladderLen > 10) {
                        u.ladderLen = Math.max(10, u.ladderLen - 1.4 * step);
                    } else {
                        u.ladderAngle += (u.restAngle - u.ladderAngle) * 0.1 * step;
                        if (Math.abs(u.restAngle - u.ladderAngle) < 0.05) {
                            u.ladderAngle = u.restAngle;
                            u.state = 'WAIT';
                            u.stateT = 0;
                        }
                    }
                    break;
            }

            // if the truck packs up, the ground firefighter heads home too
            if (u.state !== 'READY' && u.gunner) returnGunner(u, step);
        });
    }

    function easeLadder(u, angle, len, step) {
        u.ladderAngle += (angle - u.ladderAngle) * 0.06 * step;
        const dl = len - u.ladderLen;
        u.ladderLen += Math.max(-1.1 * step, Math.min(1.1 * step, dl));
    }

    // --- firefighter on foot for ground-floor fires ---

    function updateGunner(u, win, step) {
        if (!u.gunner) u.gunner = { x: cabExitX(u), dir: 1 };
        const g = u.gunner;
        const sx = win.x + win.w / 2 - 14;
        const d = sx - g.x;
        const sp = 0.9 * step;
        if (Math.abs(d) <= sp) {
            g.x = sx;
            g.spraying = true;
            // spray up into the window from the street
            const nx = g.x + (win.x + win.w / 2 > g.x + 5 ? 9 : 1);
            const ny = GROUND - 14 + 7;
            const grav = 0.012;
            for (let i = 0; i < 2; i++) {
                const aimX = win.x + 3 + Math.random() * (win.w - 6);
                const aimY = win.y + 2 + Math.random() * (win.h - 4);
                const dx = aimX - nx, dy = aimY - ny;
                const dd = Math.max(6, Math.hypot(dx, dy));
                const spd = 1.8 + Math.random() * 0.3;
                const tf = dd / spd;
                FF.particles.spawnDrop(
                    nx, ny,
                    dx / tf + (Math.random() - 0.5) * 0.08,
                    dy / tf - 0.5 * grav * tf + (Math.random() - 0.5) * 0.08,
                    grav,
                    tf * (1.02 + Math.random() * 0.1)
                );
            }
        } else {
            g.spraying = false;
            g.dir = Math.sign(d);
            g.x += g.dir * sp;
        }
    }

    function returnGunner(u, step) {
        if (!u.gunner) return;
        const g = u.gunner;
        g.spraying = false;
        const hx = cabExitX(u);
        const d = hx - g.x;
        const sp = 0.9 * step;
        if (Math.abs(d) <= sp) {
            u.gunner = null;
        } else {
            g.dir = Math.sign(d);
            g.x += g.dir * sp;
        }
    }

    // --- free cannon: follows the pointer, sprays with the player (v1-style) ---

    function followPointer(u) {
        if (!FF.game || !FF.game.pointer) return;
        const tip = ladderTip(u);
        const pt = FF.game.pointer;
        u.cannonA = Math.atan2(pt.y - tip.y, pt.x - tip.x);
        const steps = !FF.settings || FF.settings.v.controls !== 'tap';
        if (steps && FF.game.spraying && FF.game.phase === 'READY') {
            const g = 0.014;
            for (let i = 0; i < 2; i++) {
                const dx = pt.x - tip.x, dy = pt.y - tip.y;
                const d = Math.max(8, Math.hypot(dx, dy));
                const sp = 1.6 + Math.random() * 0.4;
                const tf = d / sp;
                FF.particles.spawnDrop(
                    tip.x, tip.y - 2,
                    dx / tf + (Math.random() - 0.5) * 0.1,
                    dy / tf - 0.5 * g * tf + (Math.random() - 0.5) * 0.1,
                    g,
                    tf * (1.02 + Math.random() * 0.12)
                );
            }
        }
    }

    function sprayAt(u, win) {
        const tip = ladderTip(u);
        const g = 0.02;
        for (let i = 0; i < 2; i++) {
            const aimX = win.x + 2 + Math.random() * (win.w - 4);
            const aimY = win.y + 2 + Math.random() * (win.h - 4);
            const dx = aimX - tip.x, dy = aimY - tip.y;
            const d = Math.max(8, Math.hypot(dx, dy));
            const sp = 1.1 + Math.random() * 0.3;
            const tf = d / sp;
            FF.particles.spawnDrop(
                tip.x, tip.y - 2,
                dx / tf + (Math.random() - 0.5) * 0.08,
                dy / tf - 0.5 * g * tf + (Math.random() - 0.5) * 0.08,
                g,
                tf * (1.02 + Math.random() * 0.12)
            );
        }
    }

    // --- drawing ---

    function rr(x, px, py, pw, ph, r) {
        r = Math.min(r, pw / 2, ph / 2);
        x.beginPath();
        x.moveTo(px + r, py);
        x.arcTo(px + pw, py, px + pw, py + ph, r);
        x.arcTo(px + pw, py + ph, px, py + ph, r);
        x.arcTo(px, py + ph, px, py, r);
        x.arcTo(px, py, px + pw, py, r);
        x.closePath();
    }

    function drawHose(x, u) {
        if (!u.hoseConnected || !u.hydrant) return;
        const h = u.hydrant;
        const pv = pivot(u);
        const portX = u.dir > 0 ? u.x + 2 : u.x + BODY_W - 2;
        x.save();
        x.strokeStyle = '#7a2a26';
        x.lineWidth = 2;
        x.lineCap = 'round';
        const gy = 209;
        x.beginPath();
        x.moveTo(h.cx, h.y + 10);
        x.quadraticCurveTo(h.cx, gy + 2, (h.cx + portX) / 2, gy + 2);
        x.quadraticCurveTo(portX, gy + 2, portX, GROUND - 7);
        x.stroke();
        x.strokeStyle = 'rgba(255,255,255,0.18)';
        x.lineWidth = 0.7;
        x.stroke();
        // brass coupling
        x.fillStyle = P.hyd;
        x.beginPath(); x.arc(h.cx, h.y + 10, 1.7, 0, Math.PI * 2); x.fill();
        x.restore();
    }

    function drawLadder(x, u) {
        const pv = pivot(u);
        x.save();
        x.translate(pv.x, pv.y);
        x.rotate(u.ladderAngle);
        const L = Math.ceil(u.ladderLen);
        x.strokeStyle = P.steel;
        x.lineWidth = 1;
        x.lineCap = 'round';
        x.beginPath(); x.moveTo(0, -2.6); x.lineTo(L, -2.6); x.stroke();
        x.beginPath(); x.moveTo(0, 2.6); x.lineTo(L, 2.6); x.stroke();
        x.strokeStyle = 'rgba(255,255,255,0.25)';
        x.lineWidth = 0.35;
        x.beginPath(); x.moveTo(0, -2.85); x.lineTo(L, -2.85); x.stroke();
        x.strokeStyle = P.steelDark;
        x.lineWidth = 0.7;
        for (let r = 3; r < u.ladderLen - 1; r += 4) {
            x.beginPath(); x.moveTo(r, -2.2); x.lineTo(r, 2.2); x.stroke();
        }
        x.restore();
        // turret
        x.fillStyle = P.steelDark;
        rr(x, pv.x - 4, pv.y - 1.5, 8, 4, 1.5); x.fill();
        x.fillStyle = 'rgba(255,255,255,0.15)';
        rr(x, pv.x - 4, pv.y - 1.5, 8, 1.2, 0.6); x.fill();
    }

    function drawBody(x, u) {
        const C = u.scheme;
        const by = GROUND - 8 - BODY_H;

        // ground shadow
        const sg = x.createRadialGradient(u.x + BODY_W / 2, GROUND, 2, u.x + BODY_W / 2, GROUND, BODY_W * 0.55);
        sg.addColorStop(0, 'rgba(0,0,0,0.35)');
        sg.addColorStop(1, 'rgba(0,0,0,0)');
        x.fillStyle = sg;
        x.beginPath(); x.ellipse(u.x + BODY_W / 2, GROUND, BODY_W * 0.55, 3, 0, 0, Math.PI * 2); x.fill();

        x.save();
        x.translate(u.x, 0);
        if (u.dir < 0) { x.translate(BODY_W, 0); x.scale(-1, 1); }
        const bx = 0;

        // outriggers when deployed
        const deployed = u.state === 'RAISE' || u.state === 'EXTEND' ||
                         u.state === 'READY' || u.state === 'RETRACT';
        if (deployed) {
            [bx + 5, bx + 26].forEach(ox => {
                x.fillStyle = P.steel;
                rr(x, ox, GROUND - 7, 2, 6, 0.8); x.fill();
                x.fillStyle = P.steelDark;
                rr(x, ox - 2, GROUND - 1.4, 6, 2, 1); x.fill();
                x.fillStyle = P.amber;
                rr(x, ox, GROUND - 7, 2, 1, 0.5); x.fill();
            });
        }

        // rear box
        const rg2 = x.createLinearGradient(0, by + 2, 0, by + BODY_H);
        rg2.addColorStop(0, C.light); rg2.addColorStop(0.25, C.base); rg2.addColorStop(1, C.dark);
        x.fillStyle = rg2;
        rr(x, bx, by + 2, 44, BODY_H - 2, 1.6); x.fill();
        x.strokeStyle = C.ink; x.lineWidth = 0.5;
        rr(x, bx, by + 2, 44, BODY_H - 2, 1.6); x.stroke();

        // rear chevron
        x.save();
        rr(x, bx, by + 2, 3.5, BODY_H - 2, 1.6); x.clip();
        for (let i = 0; i < 6; i++) {
            x.fillStyle = i % 2 ? C.dark : P.amber;
            const yy = by + i * 3;
            x.beginPath();
            x.moveTo(bx, yy); x.lineTo(bx + 4, yy + 2.2);
            x.lineTo(bx + 4, yy + 4.4); x.lineTo(bx, yy + 2.2);
            x.closePath(); x.fill();
        }
        x.restore();

        // stripe + pinstripe
        x.fillStyle = P.white;
        rr(x, bx + 2, by + 8, 41, 2, 1); x.fill();
        x.fillStyle = P.amber;
        x.fillRect(bx + 2, by + 10.2, 41, 0.6);

        // gear doors
        [5, 17, 29].forEach(gxo => {
            const gd = x.createLinearGradient(0, by + 11, 0, by + 15);
            gd.addColorStop(0, '#c4cad6'); gd.addColorStop(1, P.steelDark);
            x.fillStyle = gd;
            rr(x, bx + gxo, by + 11, 7.5, 4, 0.8); x.fill();
            x.strokeStyle = 'rgba(60,66,80,0.7)'; x.lineWidth = 0.35;
            x.beginPath();
            x.moveTo(bx + gxo + 0.5, by + 12.3); x.lineTo(bx + gxo + 7, by + 12.3);
            x.moveTo(bx + gxo + 0.5, by + 13.6); x.lineTo(bx + gxo + 7, by + 13.6);
            x.stroke();
        });

        // ladder rack rail
        x.fillStyle = P.steelDark;
        rr(x, bx + 2, by + 0.8, 40, 1.2, 0.6); x.fill();

        // cab
        x.beginPath();
        x.moveTo(bx + 44, by);
        x.lineTo(bx + 58, by);
        x.quadraticCurveTo(bx + BODY_W, by + 0.5, bx + BODY_W, by + 4);
        x.lineTo(bx + BODY_W, by + BODY_H);
        x.lineTo(bx + 44, by + BODY_H);
        x.closePath();
        const cg = x.createLinearGradient(0, by, 0, by + BODY_H);
        cg.addColorStop(0, C.light); cg.addColorStop(0.3, C.base); cg.addColorStop(1, C.dark);
        x.fillStyle = cg;
        x.fill();
        x.strokeStyle = C.ink; x.lineWidth = 0.5;
        x.stroke();

        // door seam + handle
        x.strokeStyle = C.ink; x.lineWidth = 0.5;
        x.beginPath(); x.moveTo(bx + 50, by + 2); x.lineTo(bx + 50, by + BODY_H - 2); x.stroke();
        x.fillStyle = P.hub;
        rr(x, bx + 47.5, by + 7, 2, 0.9, 0.45); x.fill();

        // windshield
        const wg = x.createLinearGradient(0, by + 2, 0, by + 8);
        wg.addColorStop(0, '#c8ecf8'); wg.addColorStop(1, '#6ab8d8');
        x.fillStyle = wg;
        rr(x, bx + 52.5, by + 2, 7.5, 6, 1.2); x.fill();
        x.fillStyle = 'rgba(255,255,255,0.55)';
        x.beginPath();
        x.moveTo(bx + 57, by + 2.4); x.lineTo(bx + 59.1, by + 2.4);
        x.lineTo(bx + 57.1, by + 7.5); x.lineTo(bx + 55.7, by + 7.5);
        x.closePath(); x.fill();

        // grille + bumper + headlight
        x.fillStyle = P.steel;
        rr(x, bx + BODY_W - 0.8, by + 7, 0.9, 4, 0.4); x.fill();
        rr(x, bx + BODY_W - 2.5, by + BODY_H - 4.5, 3.5, 3.6, 1); x.fill();
        x.fillStyle = P.amber;
        x.beginPath(); x.arc(bx + BODY_W - 0.5, by + 5, 1, 0, Math.PI * 2); x.fill();

        // light bar (flashes while driving / waiting for a tap)
        const active = u.state === 'DRIVING' || u.state === 'WAIT';
        const phase = Math.floor(u.lightT / 180) % 2;
        x.fillStyle = P.black;
        rr(x, bx + 48.5, by - 3, 10, 3.2, 1.2); x.fill();
        x.fillStyle = active && phase ? P.lightRed : '#701410';
        rr(x, bx + 49.3, by - 2.6, 4, 2.2, 1); x.fill();
        x.fillStyle = active && !phase ? P.lightBlue : '#1a4a80';
        rr(x, bx + 53.8, by - 2.6, 4, 2.2, 1); x.fill();

        // glossy sheen when the truck has been sprayed
        if (u.wetT > 0) {
            const wa = Math.min(0.3, (u.wetT / 15000) * 0.38);
            const shg = x.createLinearGradient(0, by - 3, 0, by + BODY_H);
            shg.addColorStop(0, 'rgba(205,232,255,' + wa.toFixed(3) + ')');
            shg.addColorStop(0.55, 'rgba(205,232,255,' + (wa * 0.35).toFixed(3) + ')');
            shg.addColorStop(1, 'rgba(205,232,255,0)');
            x.fillStyle = shg;
            rr(x, bx, by - 1, BODY_W, BODY_H + 2, 2); x.fill();
            x.strokeStyle = 'rgba(184,230,248,' + (wa * 1.6).toFixed(3) + ')';
            x.lineWidth = 0.7; x.lineCap = 'round';
            [14, 30, 48].forEach((dxo, i) => {
                const dl = 2 + ((Math.floor(u.lightT / 300) + i) % 3);
                x.beginPath();
                x.moveTo(bx + dxo, by + BODY_H);
                x.lineTo(bx + dxo, by + BODY_H + dl);
                x.stroke();
            });
        }

        // wheels
        [10, 32, 52].forEach(wxo => {
            const wx = bx + wxo;
            x.fillStyle = P.tire;
            x.beginPath(); x.arc(wx, GROUND - 4.4, 4.4, 0, Math.PI * 2); x.fill();
            const g = x.createRadialGradient(wx - 0.6, GROUND - 5, 0.3, wx, GROUND - 4.4, 2.3);
            g.addColorStop(0, '#e8ecf4'); g.addColorStop(1, P.steelDark);
            x.fillStyle = g;
            x.beginPath(); x.arc(wx, GROUND - 4.4, 2.2, 0, Math.PI * 2); x.fill();
            x.fillStyle = P.black;
            x.beginPath(); x.arc(wx, GROUND - 4.4, 0.6, 0, Math.PI * 2); x.fill();
            const a = u.wheelRot;
            x.beginPath();
            x.arc(wx + Math.cos(a) * 1.4, GROUND - 4.4 + Math.sin(a) * 1.4, 0.4, 0, Math.PI * 2);
            x.fill();
        });

        x.restore();

        // beacon glow in world space (not mirrored, cheap)
        if (active) {
            const lx = u.dir > 0 ? u.x + 53 : u.x + BODY_W - 53;
            const gg = x.createRadialGradient(lx, by - 1.5, 0, lx, by - 1.5, 9);
            const lc = phase ? 'rgba(255,80,64,' : 'rgba(88,184,255,';
            gg.addColorStop(0, lc + '0.35)');
            gg.addColorStop(1, lc + '0)');
            x.fillStyle = gg;
            x.fillRect(lx - 9, by - 10, 18, 18);
        }
    }

    function drawFlipped(x, spr, px, py, w, h) {
        x.save();
        x.translate(px + w / 2, 0);
        x.scale(-1, 1);
        x.translate(-(px + w / 2), 0);
        x.drawImage(spr, px, py, w, h);
        x.restore();
    }

    function drawCrew(x, u, t) {
        const S = FF.sprites;

        // hydrant firefighter (walking, connecting, then standing by)
        if (u.walker) {
            const w = u.walker;
            if (u.state === 'CREW') {
                const fr = Math.floor(t / 140) % 2;
                const spr = fr ? S.ffWalk1 : S.ffWalk2;
                if (w.tx < w.x) drawFlipped(x, spr, w.x, w.y, 10, 14);
                else x.drawImage(spr, w.x, w.y, 10, 14);
            } else {
                const facingLeft = u.hydrant && u.hydrant.cx < w.x + 5;
                const spr = S.ffStand;
                if (facingLeft) drawFlipped(x, spr, w.x, w.y, 10, 14);
                else x.drawImage(spr, w.x, w.y, 10, 14);
            }
        }

        // ground firefighter handling a first-floor fire on foot
        if (u.gunner) {
            const g = u.gunner;
            const gy = GROUND - 14;
            let spr, flip;
            if (g.spraying) {
                spr = S.ffSpray;
                flip = u.target && (u.target.x + u.target.w / 2) < g.x + 5;
            } else {
                const fr = Math.floor(t / 140) % 2;
                spr = fr ? S.ffWalk1 : S.ffWalk2;
                flip = g.dir < 0;
            }
            if (flip) drawFlipped(x, spr, g.x, gy, 10, 14);
            else x.drawImage(spr, g.x, gy, 10, 14);
        }

        // cannon firefighter riding the ladder tip
        if ((u.state === 'READY' || u.state === 'EXTEND' || u.state === 'RETRACT') && u.ladderLen > 24) {
            const tip = ladderTip(u);
            const ladderTarget = u.target && !isGroundFloor(u.target) ? u.target : null;
            const freeCannon = u.state === 'READY' && !ladderTarget;
            const playerSpraying = freeCannon && FF.game && FF.game.spraying &&
                                   FF.game.phase === 'READY' &&
                                   (!FF.settings || FF.settings.v.controls !== 'tap');
            const spraying = (u.state === 'READY' && ladderTarget && ladderTarget.state === 'fire') ||
                             playerSpraying;
            const rescuing = u.state === 'READY' && ladderTarget &&
                             ladderTarget.state === 'help' && u.rescueT > 0;
            const spr = spraying ? S.ffSpray : S.ffStand;
            const aimLeft = freeCannon
                ? Math.cos(u.cannonA) < 0
                : (ladderTarget && (ladderTarget.x + ladderTarget.w / 2) < tip.x);
            if (aimLeft) drawFlipped(x, spr, tip.x - 5, tip.y - 12, 10, 14);
            else x.drawImage(spr, tip.x - 5, tip.y - 12, 10, 14);
            if (rescuing && ladderTarget.occupant >= 0) {
                // trapped neighbor climbing onto the ladder
                x.drawImage(S.people[ladderTarget.occupant], tip.x + (aimLeft ? -10 : 4), tip.y - 7, 7, 7);
            }
            // cannon barrel tracking the pointer
            if (freeCannon) {
                x.save();
                x.strokeStyle = P.steel;
                x.lineWidth = 1.6;
                x.lineCap = 'round';
                x.beginPath();
                x.moveTo(tip.x, tip.y - 2);
                x.lineTo(tip.x + Math.cos(u.cannonA) * 4.5, tip.y - 2 + Math.sin(u.cannonA) * 4.5);
                x.stroke();
                x.restore();
            }
        }
    }

    function pulseMark(x, r, t, color) {
        const pulse = Math.floor(t / 250) % 2;
        const grow = pulse ? 3 : 5;
        x.save();
        x.strokeStyle = pulse ? 'rgba(255,255,255,0.95)' : color;
        x.lineWidth = 1.4;
        x.shadowColor = 'rgba(255,217,85,0.8)';
        x.shadowBlur = 4;
        rr(x, r.x - grow, r.y - grow, r.w + grow * 2, r.h + grow * 2, 4);
        x.stroke();
        x.restore();
    }

    function drawWalkie(x, t) {
        const wt = walkie;
        if (!wt.x) { wt.x = FF.W - 30; wt.y = FF.H - 38; }

        // pulsing ring when backup is really needed (fires piling up / rescue waiting)
        if (needBackup) {
            pulseMark(x, { x: wt.x - 1, y: wt.y - 9, w: wt.w + 2, h: wt.h + 9 }, t, P.amber);
        }

        // attention glow until first use
        if (trucks.every(u => u.state === 'IDLE')) {
            const a = 0.25 + 0.15 * Math.sin(t * 0.005);
            const gg = x.createRadialGradient(wt.x + 12, wt.y + 14, 2, wt.x + 12, wt.y + 14, 26);
            gg.addColorStop(0, 'rgba(255,217,85,' + a.toFixed(3) + ')');
            gg.addColorStop(1, 'rgba(255,217,85,0)');
            x.fillStyle = gg;
            x.fillRect(wt.x - 16, wt.y - 14, 56, 56);
        }

        // antenna
        x.fillStyle = '#22242e';
        rr(x, wt.x + 3, wt.y - 8, 2.4, 9, 1.2); x.fill();
        x.fillStyle = P.amber;
        x.beginPath(); x.arc(wt.x + 4.2, wt.y - 8.5, 1.3, 0, Math.PI * 2); x.fill();

        // body
        const bg = x.createLinearGradient(0, wt.y, 0, wt.y + wt.h);
        bg.addColorStop(0, '#4a5064'); bg.addColorStop(1, '#22242e');
        x.fillStyle = bg;
        rr(x, wt.x, wt.y, wt.w, wt.h, 3); x.fill();
        x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = 0.8;
        rr(x, wt.x, wt.y, wt.w, wt.h, 3); x.stroke();
        x.strokeStyle = 'rgba(255,255,255,0.18)'; x.lineWidth = 0.6;
        rr(x, wt.x + 0.7, wt.y + 0.7, wt.w - 1.4, wt.h - 1.4, 2.5); x.stroke();

        // speaker grille
        x.strokeStyle = 'rgba(0,0,0,0.55)';
        x.lineWidth = 1;
        x.lineCap = 'round';
        for (let i = 0; i < 4; i++) {
            x.beginPath();
            x.moveTo(wt.x + 4, wt.y + 4.5 + i * 2.6);
            x.lineTo(wt.x + wt.w - 4, wt.y + 4.5 + i * 2.6);
            x.stroke();
        }

        // call buttons: red truck + green truck
        const cols = [SCHEMES.red, SCHEMES.green];
        for (let i = 0; i < 2; i++) {
            const r = btnRect(i);
            const u = trucks[i];
            const pressed = walkie.press[i] > 0;
            const blink = u.state === 'DRIVING' && Math.floor(t / 200) % 2 === 0;
            const py = r.y + (pressed ? 1 : 0);
            const bgc = x.createLinearGradient(0, py, 0, py + r.h);
            bgc.addColorStop(0, blink || pressed ? '#ffffff' : cols[i].light);
            bgc.addColorStop(1, cols[i].dark);
            x.fillStyle = bgc;
            rr(x, r.x, py, r.w, r.h, 1.6); x.fill();
            x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = 0.6;
            rr(x, r.x, py, r.w, r.h, 1.6); x.stroke();
            // tiny truck glyph
            x.fillStyle = '#fff';
            rr(x, r.x + 1.6, py + 2.6, 4.4, 2.4, 0.6); x.fill();
            rr(x, r.x + 5.6, py + 3.2, 2.2, 1.8, 0.5); x.fill();
            x.fillStyle = '#22242e';
            x.beginPath(); x.arc(r.x + 3, py + 5.6, 0.8, 0, Math.PI * 2); x.fill();
            x.beginPath(); x.arc(r.x + 6.4, py + 5.6, 0.8, 0, Math.PI * 2); x.fill();
        }

        // PTT side button
        x.fillStyle = '#22242e';
        rr(x, wt.x - 1.6, wt.y + 8, 2, 6, 1); x.fill();
    }

    function draw(x, t) {
        trucks.forEach(u => {
            if (u.state === 'IDLE') return;
            drawHose(x, u);
            drawLadder(x, u);
            drawBody(x, u);
            drawCrew(x, u, t);
            if (u.state === 'WAIT') {
                pulseMark(x, truckRect(u), t, u.scheme.base);
            }
        });
        drawWalkie(x, t);
    }

    reset();

    return {
        update, draw, handleTap, reset, markWetAt,
        get trucks() { return trucks; }
    };
})();
