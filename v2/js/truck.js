// --- Fire truck unit: drive, deploy crew, raise ladder, spray ---
window.FF = window.FF || {};

FF.truck = (function () {
    const P = FF.PAL;

    const BODY_W = 56, BODY_H = 16;
    const GROUND = 210;              // wheel contact line on road
    const HOME_X = 8;

    const t = {
        x: HOME_X,
        state: 'IDLE',               // IDLE, DRIVING, DEPLOY, RAISE, EXTEND, SPRAY, RETRACT, PACK, STAGED
        target: null,                // window being fought
        parkMode: false,             // steps controls: just drive up and stage the crew
        parkX: 150,
        wheelRot: 0,
        lightT: 0,
        stateT: 0,
        ladderAngle: 0,              // 0 = stowed flat, animates toward targetAngle
        ladderLen: 10,
        targetAngle: -Math.PI / 2,
        targetLen: 30,
        crewOut: false,
        cheerT: 0
    };

    function pivot() {
        return { x: t.x + 16, y: GROUND - 24 };
    }

    function ladderTip() {
        const pv = pivot();
        return {
            x: pv.x + Math.cos(t.ladderAngle) * t.ladderLen,
            y: pv.y + Math.sin(t.ladderAngle) * t.ladderLen
        };
    }

    function dispatch(win) {
        t.parkMode = false;
        t.target = win;
        t.state = 'DRIVING';
        t.stateT = 0;
        if (FF.audio) FF.audio.sirenStart();
    }

    // steps controls: drive to a fixed spot and stage the crew (no auto ladder)
    function parkOnly(px) {
        t.parkMode = true;
        t.parkX = px;
        t.target = null;
        t.state = 'DRIVING';
        t.stateT = 0;
        if (FF.audio) FF.audio.sirenStart();
    }

    function finishSpray() {
        if (t.state === 'SPRAY') {
            t.state = 'RETRACT';
            t.stateT = 0;
            t.cheerT = 1400;
            if (FF.audio) FF.audio.sprayStop();
        }
    }

    function targetParkX(win) {
        // park so ladder pivot sits a bit left of the window center
        const cx = win.x + win.w / 2;
        return Math.max(4, Math.min(FF.W - BODY_W - 4, cx - 16 - 10));
    }

    function computeLadderGoal() {
        const pv = pivot();
        const win = t.target;
        // stop short of the window so the water visibly arcs into it
        const ex = win.x + win.w / 2 - 12;
        const ey = win.y + win.h + 14;
        t.targetAngle = Math.atan2(ey - pv.y, ex - pv.x);
        t.targetLen = Math.hypot(ex - pv.x, ey - pv.y);
    }

    function update(dt) {
        const step = dt / 16.67;
        t.stateT += dt;
        t.lightT += dt;

        switch (t.state) {
            case 'DRIVING': {
                const px = t.parkMode ? t.parkX : targetParkX(t.target);
                const dir = Math.sign(px - t.x);
                const speed = 1.4 * step;
                if (Math.abs(px - t.x) <= speed) {
                    t.x = px;
                    t.state = 'DEPLOY';
                    t.stateT = 0;
                    t.crewOut = true;
                    if (FF.audio) { FF.audio.sirenStop(); FF.audio.airBrake(); }
                } else {
                    t.x += dir * speed;
                    t.wheelRot += dir * speed * 0.5;
                }
                break;
            }
            case 'DEPLOY':
                if (t.stateT > 700) {
                    if (t.parkMode) {
                        t.state = 'STAGED';
                    } else {
                        computeLadderGoal();
                        t.state = 'RAISE';
                    }
                    t.stateT = 0;
                }
                break;
            case 'RAISE': {
                const goal = t.targetAngle;
                t.ladderAngle += (goal - t.ladderAngle) * 0.08 * step;
                if (Math.abs(goal - t.ladderAngle) < 0.03) {
                    t.ladderAngle = goal;
                    t.state = 'EXTEND';
                    t.stateT = 0;
                    if (FF.audio) FF.audio.ratchet();
                }
                break;
            }
            case 'EXTEND':
                t.ladderLen += 1.1 * step;
                if (t.ladderLen >= t.targetLen) {
                    t.ladderLen = t.targetLen;
                    t.state = 'SPRAY';
                    t.stateT = 0;
                    if (FF.audio) FF.audio.sprayStart();
                }
                break;
            case 'SPRAY': {
                // spawn water from nozzle toward the window
                const tip = ladderTip();
                const win = t.target;
                for (let i = 0; i < 3; i++) {
                    const aimX = win.x + 3 + Math.random() * (win.w - 6);
                    const aimY = win.y + 2 + Math.random() * (win.h - 4);
                    const dx = aimX - tip.x, dy = aimY - tip.y;
                    const d = Math.max(6, Math.hypot(dx, dy));
                    const sp = 0.55 + Math.random() * 0.25;
                    FF.particles.spawnDrop(
                        tip.x + 3, tip.y - 4,
                        (dx / d) * sp,
                        (dy / d) * sp - 0.45   // arc bias upward
                    );
                }
                break;
            }
            case 'RETRACT':
                t.ladderLen -= 1.2 * step;
                if (t.ladderLen <= 10) {
                    t.ladderLen = 10;
                    t.ladderAngle += (0 - t.ladderAngle) * 0.1 * step;
                    if (Math.abs(t.ladderAngle) < 0.05) {
                        t.ladderAngle = 0;
                        t.state = 'PACK';
                        t.stateT = 0;
                    }
                }
                break;
            case 'PACK':
                if (t.cheerT > 0) t.cheerT -= dt;
                if (t.stateT > 1400) {
                    t.state = 'IDLE';
                    t.target = null;
                }
                break;
        }
    }

    // --- drawing ---

    function drawWheel(x, wx) {
        x.fillStyle = P.tire;
        x.fillRect(wx - 4, GROUND - 8, 8, 8);
        x.fillRect(wx - 3, GROUND - 9, 6, 10);
        x.fillStyle = P.hub;
        x.fillRect(wx - 1, GROUND - 5, 2, 2);
        // rotating lug mark
        const a = t.wheelRot;
        x.fillRect(wx - 1 + Math.round(Math.cos(a) * 2), GROUND - 5 + Math.round(Math.sin(a) * 2), 1, 1);
    }

    function drawLadder(x) {
        const pv = pivot();
        x.save();
        x.translate(pv.x, pv.y);
        x.rotate(t.ladderAngle);
        // rails
        x.fillStyle = P.steel;
        x.fillRect(0, -3, Math.ceil(t.ladderLen), 1);
        x.fillRect(0, 2, Math.ceil(t.ladderLen), 1);
        // rungs
        x.fillStyle = P.steelDark;
        for (let r = 3; r < t.ladderLen - 1; r += 4) {
            x.fillRect(r, -2, 1, 4);
        }
        x.restore();
        // turret base
        x.fillStyle = P.steelDark;
        x.fillRect(pv.x - 3, pv.y - 1, 7, 3);
    }

    function drawBody(x) {
        const bx = Math.floor(t.x);
        const by = GROUND - 8 - BODY_H;   // body top

        // chassis shadow
        x.fillStyle = 'rgba(0,0,0,0.35)';
        x.fillRect(bx + 1, GROUND - 1, BODY_W - 2, 2);

        // rear box (pump body)
        x.fillStyle = P.red;
        x.fillRect(bx, by + 2, 40, BODY_H - 2);
        x.fillStyle = P.redDark;
        x.fillRect(bx, by + BODY_H - 3, 40, 3);
        // white stripe + gear panels
        x.fillStyle = P.white;
        x.fillRect(bx + 1, by + 8, 38, 2);
        x.fillStyle = P.steel;
        x.fillRect(bx + 4, by + 11, 6, 4);
        x.fillRect(bx + 14, by + 11, 6, 4);
        x.fillRect(bx + 24, by + 11, 6, 4);

        // cab (front, facing right)
        x.fillStyle = P.red;
        x.fillRect(bx + 40, by, 16, BODY_H);
        x.fillStyle = P.redDark;
        x.fillRect(bx + 40, by + BODY_H - 3, 16, 3);
        x.fillStyle = P.cabGlass;
        x.fillRect(bx + 47, by + 2, 7, 6);
        // bumper + headlight
        x.fillStyle = P.steel;
        x.fillRect(bx + 55, by + BODY_H - 5, 2, 4);
        x.fillStyle = P.amber;
        x.fillRect(bx + 55, by + 4, 1, 2);

        // light bar (flashes while driving / spraying)
        const active = t.state !== 'IDLE' && t.state !== 'PACK';
        const phase = Math.floor(t.lightT / 180) % 2;
        x.fillStyle = P.black;
        x.fillRect(bx + 44, by - 3, 9, 3);
        x.fillStyle = active ? (phase ? P.lightRed : '#701410') : '#701410';
        x.fillRect(bx + 44, by - 3, 4, 2);
        x.fillStyle = active ? (phase ? '#1a4a80' : P.lightBlue) : '#1a4a80';
        x.fillRect(bx + 49, by - 3, 4, 2);
        // light glow
        if (active) {
            x.globalAlpha = 0.25;
            x.fillStyle = phase ? P.lightRed : P.lightBlue;
            x.fillRect(bx + 40, by - 8, 16, 6);
            x.globalAlpha = 1;
        }

        drawWheel(x, bx + 10);
        drawWheel(x, bx + 32);
        drawWheel(x, bx + 48);
    }

    function drawCrew(x) {
        if (!t.crewOut) return;
        const bx = Math.floor(t.x);
        const S = FF.sprites;

        // firefighter 2 stands near the truck, cheering after a save
        const f2x = bx + 58, f2y = GROUND - 14;
        if (t.state === 'PACK' && t.cheerT > 0) {
            x.drawImage(S.ffCheer, f2x, f2y);
        } else if (t.state === 'DEPLOY') {
            const fr = Math.floor(t.stateT / 140) % 2;
            x.drawImage(fr ? S.ffWalk1 : S.ffWalk2, bx + 50 + Math.min(8, t.stateT / 80), f2y);
        } else {
            x.drawImage(S.ffStand, f2x, f2y);
        }

        // firefighter 1 rides the ladder tip once it's raising
        if (t.state === 'RAISE' || t.state === 'EXTEND' || t.state === 'SPRAY' || t.state === 'RETRACT') {
            const tip = ladderTip();
            const spr = t.state === 'SPRAY' ? S.ffSpray : S.ffStand;
            x.drawImage(spr, Math.floor(tip.x) - 8, Math.floor(tip.y) - 9);
        } else if (t.state === 'DEPLOY') {
            const fr = Math.floor(t.stateT / 140) % 2;
            x.drawImage(fr ? S.ffWalk2 : S.ffWalk1, bx + 20, GROUND - 14);
        }
    }

    function draw(x) {
        drawLadder(x);
        drawBody(x);
        drawCrew(x);
    }

    function reset() {
        t.x = HOME_X;
        t.state = 'IDLE';
        t.target = null;
        t.parkMode = false;
        t.ladderAngle = 0;
        t.ladderLen = 10;
        t.crewOut = false;
        t.cheerT = 0;
    }

    return {
        update, draw, dispatch, parkOnly, finishSpray, reset, ladderTip,
        get state() { return t.state; },
        get target() { return t.target; },
        get busy() { return t.state !== 'IDLE' && t.state !== 'PACK'; },
        get x() { return t.x; },
        // tap target + hose anchor for steps controls
        get rect() { return { x: t.x - 4, y: GROUND - 34, w: BODY_W + 8, h: 36 }; },
        get portPoint() { return { x: t.x + 2, y: GROUND - 12 }; }
    };
})();
