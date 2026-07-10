// --- Fire truck unit (painted): drive, deploy crew, raise ladder, spray ---
window.FF = window.FF || {};

FF.truck = (function () {
    const P = FF.PAL;

    const BODY_W = 56, BODY_H = 16;
    const GROUND = 210;              // wheel contact line on road
    const HOME_X = 8;

    const t = {
        x: HOME_X,
        state: 'IDLE',               // IDLE, DRIVING, DEPLOY, RAISE, EXTEND, SPRAY, RETRACT, PACK, STAGED
        target: null,
        parkMode: false,             // steps controls: just drive up and stage the crew
        parkX: 150,
        wheelRot: 0,
        lightT: 0,
        stateT: 0,
        ladderAngle: 0,
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
        const cx = win.x + win.w / 2;
        return Math.max(4, Math.min(FF.W - BODY_W - 4, cx - 16 - 10));
    }

    function computeLadderGoal() {
        const pv = pivot();
        const win = t.target;
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
                        (dy / d) * sp - 0.45
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

    // --- drawing helpers ---

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

    function drawWheel(x, wx) {
        // tire
        x.fillStyle = P.tire;
        x.beginPath(); x.arc(wx, GROUND - 4.4, 4.4, 0, Math.PI * 2); x.fill();
        x.strokeStyle = 'rgba(255,255,255,0.10)'; x.lineWidth = 0.8;
        x.beginPath(); x.arc(wx, GROUND - 4.4, 3.9, Math.PI * 1.1, Math.PI * 1.9); x.stroke();
        // hub
        const g = x.createRadialGradient(wx - 0.6, GROUND - 5, 0.3, wx, GROUND - 4.4, 2.3);
        g.addColorStop(0, '#e8ecf4'); g.addColorStop(1, P.steelDark);
        x.fillStyle = g;
        x.beginPath(); x.arc(wx, GROUND - 4.4, 2.2, 0, Math.PI * 2); x.fill();
        x.fillStyle = P.black;
        x.beginPath(); x.arc(wx, GROUND - 4.4, 0.6, 0, Math.PI * 2); x.fill();
        // rotating lug
        const a = t.wheelRot;
        x.beginPath();
        x.arc(wx + Math.cos(a) * 1.4, GROUND - 4.4 + Math.sin(a) * 1.4, 0.4, 0, Math.PI * 2);
        x.fill();
    }

    function drawOutriggers(x) {
        const deployed = t.state === 'RAISE' || t.state === 'EXTEND' ||
                         t.state === 'SPRAY' || t.state === 'RETRACT';
        if (!deployed) return;
        const bx = t.x;
        [bx + 4, bx + 24].forEach(ox => {
            x.fillStyle = P.steel;
            rr(x, ox, GROUND - 7, 2, 6, 0.8); x.fill();
            x.fillStyle = P.steelDark;
            rr(x, ox - 2, GROUND - 1.4, 6, 2, 1); x.fill();
            x.fillStyle = P.amber;
            rr(x, ox, GROUND - 7, 2, 1, 0.5); x.fill();
        });
    }

    function drawLadder(x) {
        const pv = pivot();
        x.save();
        x.translate(pv.x, pv.y);
        x.rotate(t.ladderAngle);
        const L = Math.ceil(t.ladderLen);
        // rails
        x.strokeStyle = P.steel;
        x.lineWidth = 1;
        x.lineCap = 'round';
        x.beginPath(); x.moveTo(0, -2.6); x.lineTo(L, -2.6); x.stroke();
        x.beginPath(); x.moveTo(0, 2.6); x.lineTo(L, 2.6); x.stroke();
        x.strokeStyle = 'rgba(255,255,255,0.25)';
        x.lineWidth = 0.35;
        x.beginPath(); x.moveTo(0, -2.85); x.lineTo(L, -2.85); x.stroke();
        // rungs
        x.strokeStyle = P.steelDark;
        x.lineWidth = 0.7;
        for (let r = 3; r < t.ladderLen - 1; r += 4) {
            x.beginPath(); x.moveTo(r, -2.2); x.lineTo(r, 2.2); x.stroke();
        }
        x.restore();
        // turret base
        x.fillStyle = P.steelDark;
        rr(x, pv.x - 3.5, pv.y - 1.5, 8, 4, 1.5); x.fill();
        x.fillStyle = 'rgba(255,255,255,0.15)';
        rr(x, pv.x - 3.5, pv.y - 1.5, 8, 1.2, 0.6); x.fill();
    }

    function drawBody(x) {
        const bx = t.x;
        const by = GROUND - 8 - BODY_H;

        // soft ground shadow
        const sg = x.createRadialGradient(bx + BODY_W / 2, GROUND, 2, bx + BODY_W / 2, GROUND, BODY_W * 0.55);
        sg.addColorStop(0, 'rgba(0,0,0,0.35)');
        sg.addColorStop(1, 'rgba(0,0,0,0)');
        x.fillStyle = sg;
        x.beginPath(); x.ellipse(bx + BODY_W / 2, GROUND, BODY_W * 0.55, 3, 0, 0, Math.PI * 2); x.fill();

        drawOutriggers(x);

        // rear box (pump body)
        const rg2 = x.createLinearGradient(0, by + 2, 0, by + BODY_H);
        rg2.addColorStop(0, '#f06a58'); rg2.addColorStop(0.25, P.red); rg2.addColorStop(1, P.redDark);
        x.fillStyle = rg2;
        rr(x, bx, by + 2, 40, BODY_H - 2, 1.6); x.fill();
        x.strokeStyle = 'rgba(90,18,16,0.6)'; x.lineWidth = 0.5;
        rr(x, bx, by + 2, 40, BODY_H - 2, 1.6); x.stroke();

        // rear chevron
        x.save();
        rr(x, bx, by + 2, 3.5, BODY_H - 2, 1.6); x.clip();
        for (let i = 0; i < 6; i++) {
            x.fillStyle = i % 2 ? P.redDark : P.amber;
            x.beginPath();
            const yy = by + i * 3;
            x.moveTo(bx, yy); x.lineTo(bx + 4, yy + 2.2);
            x.lineTo(bx + 4, yy + 4.4); x.lineTo(bx, yy + 2.2);
            x.closePath(); x.fill();
        }
        x.restore();

        // white stripe + gold pinstripe
        x.fillStyle = P.white;
        rr(x, bx + 2, by + 8, 37, 2, 1); x.fill();
        x.fillStyle = P.amber;
        x.fillRect(bx + 2, by + 10.2, 37, 0.6);

        // roll-up gear doors
        [4, 15, 26].forEach(gxo => {
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
        rr(x, bx + 2, by + 0.8, 36, 1.2, 0.6); x.fill();

        // cab
        x.beginPath();
        x.moveTo(bx + 40, by);
        x.lineTo(bx + 52, by);
        x.quadraticCurveTo(bx + 56, by + 0.5, bx + 56, by + 4);
        x.lineTo(bx + 56, by + BODY_H);
        x.lineTo(bx + 40, by + BODY_H);
        x.closePath();
        const cg = x.createLinearGradient(0, by, 0, by + BODY_H);
        cg.addColorStop(0, '#f06a58'); cg.addColorStop(0.3, P.red); cg.addColorStop(1, P.redDark);
        x.fillStyle = cg;
        x.fill();
        x.strokeStyle = 'rgba(90,18,16,0.6)'; x.lineWidth = 0.5;
        x.stroke();

        // door seam + handle
        x.strokeStyle = 'rgba(90,18,16,0.55)'; x.lineWidth = 0.5;
        x.beginPath(); x.moveTo(bx + 45.5, by + 2); x.lineTo(bx + 45.5, by + BODY_H - 2); x.stroke();
        x.fillStyle = P.hub;
        rr(x, bx + 43, by + 7, 2, 0.9, 0.45); x.fill();

        // windshield
        const wg = x.createLinearGradient(0, by + 2, 0, by + 8);
        wg.addColorStop(0, '#c8ecf8'); wg.addColorStop(1, '#6ab8d8');
        x.fillStyle = wg;
        rr(x, bx + 47, by + 2, 7.5, 6, 1.2); x.fill();
        x.fillStyle = 'rgba(255,255,255,0.55)';
        x.beginPath();
        x.moveTo(bx + 51.5, by + 2.4); x.lineTo(bx + 53.6, by + 2.4);
        x.lineTo(bx + 51.6, by + 7.5); x.lineTo(bx + 50.2, by + 7.5);
        x.closePath(); x.fill();

        // grille + bumper + headlight
        x.fillStyle = P.steel;
        rr(x, bx + 55.2, by + 7, 0.9, 4, 0.4); x.fill();
        rr(x, bx + 53.5, by + BODY_H - 4.5, 3.5, 3.6, 1); x.fill();
        x.fillStyle = P.amber;
        x.beginPath(); x.arc(bx + 55.5, by + 5, 1, 0, Math.PI * 2); x.fill();
        if (t.state === 'DRIVING') {
            const hb = x.createRadialGradient(bx + 56, by + 5, 0, bx + 62, by + 5, 12);
            hb.addColorStop(0, 'rgba(255,240,176,0.35)');
            hb.addColorStop(1, 'rgba(255,240,176,0)');
            x.fillStyle = hb;
            x.beginPath();
            x.moveTo(bx + 56, by + 4);
            x.lineTo(bx + 70, by + 1); x.lineTo(bx + 70, by + 9);
            x.lineTo(bx + 56, by + 6);
            x.closePath(); x.fill();
        }

        // light bar
        const active = t.state !== 'IDLE' && t.state !== 'PACK';
        const phase = Math.floor(t.lightT / 180) % 2;
        x.fillStyle = P.black;
        rr(x, bx + 43.5, by - 3, 10, 3.2, 1.2); x.fill();
        x.fillStyle = active ? (phase ? P.lightRed : '#701410') : '#701410';
        rr(x, bx + 44.3, by - 2.6, 4, 2.2, 1); x.fill();
        x.fillStyle = active ? (phase ? '#1a4a80' : P.lightBlue) : '#1a4a80';
        rr(x, bx + 48.8, by - 2.6, 4, 2.2, 1); x.fill();
        if (active) {
            const lc = phase ? 'rgba(255,80,64,' : 'rgba(88,184,255,';
            const lx = phase ? bx + 46.3 : bx + 50.8;
            const gg = x.createRadialGradient(lx, by - 1.5, 0, lx, by - 1.5, 9);
            gg.addColorStop(0, lc + '0.40)');
            gg.addColorStop(1, lc + '0)');
            x.fillStyle = gg;
            x.fillRect(lx - 9, by - 10, 18, 18);
        }

        drawWheel(x, bx + 10);
        drawWheel(x, bx + 32);
        drawWheel(x, bx + 48);
    }

    function drawCrew(x) {
        if (!t.crewOut) return;
        const bx = t.x;
        const S = FF.sprites;

        const f2x = bx + 58, f2y = GROUND - 14;
        if (t.state === 'PACK' && t.cheerT > 0) {
            x.drawImage(S.ffCheer, f2x, f2y, 10, 14);
        } else if (t.state === 'DEPLOY') {
            const fr = Math.floor(t.stateT / 140) % 2;
            x.drawImage(fr ? S.ffWalk1 : S.ffWalk2, bx + 50 + Math.min(8, t.stateT / 80), f2y, 10, 14);
        } else {
            x.drawImage(S.ffStand, f2x, f2y, 10, 14);
        }

        if (t.state === 'RAISE' || t.state === 'EXTEND' || t.state === 'SPRAY' || t.state === 'RETRACT') {
            const tip = ladderTip();
            const spr = t.state === 'SPRAY' ? S.ffSpray : S.ffStand;
            x.drawImage(spr, tip.x - 8, tip.y - 9, 10, 14);
        } else if (t.state === 'DEPLOY') {
            const fr = Math.floor(t.stateT / 140) % 2;
            x.drawImage(fr ? S.ffWalk2 : S.ffWalk1, bx + 20, GROUND - 14, 10, 14);
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
