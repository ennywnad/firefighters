// --- Particles (painted): glowing flames, water, steam, confetti, star pops ---
window.FF = window.FF || {};

FF.particles = (function () {
    const P = FF.PAL;
    let flames = [];
    let drops = [];
    let steam = [];
    let confetti = [];
    let pops = [];
    let wets = [];       // lingering wet patches on walls + street puddles

    const FIRE_RAMP = [P.fire0, P.fire1, P.fire2, P.fire3, P.fire4];

    // --- prebuilt soft glow dots (cheap painted particles) ---
    function hexRgb(hex) {
        return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
    }
    function glowDot(color, hardness) {
        const c = document.createElement('canvas');
        c.width = c.height = 32;
        const x = c.getContext('2d');
        const [r, g, b] = hexRgb(color);
        const gr = x.createRadialGradient(16, 16, 0, 16, 16, 16);
        gr.addColorStop(0, 'rgba(' + r + ',' + g + ',' + b + ',1)');
        gr.addColorStop(hardness || 0.35, 'rgba(' + r + ',' + g + ',' + b + ',0.85)');
        gr.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ',0)');
        x.fillStyle = gr;
        x.fillRect(0, 0, 32, 32);
        return c;
    }
    const FIRE_DOTS = FIRE_RAMP.map(c => glowDot(c, 0.3));
    const DOT_CACHE = {};
    function dotFor(color) {
        if (!DOT_CACHE[color]) DOT_CACHE[color] = glowDot(color, 0.4);
        return DOT_CACHE[color];
    }
    const WATER_DOT = glowDot(P.water1, 0.45);

    function spawnFlames(w) {
        const count = w.intensity > 0.6 ? 3 : (w.intensity > 0.25 ? 2 : 1);
        for (let i = 0; i < count; i++) {
            if (Math.random() > 0.8) continue;
            flames.push({
                x: w.x + 2 + Math.random() * (w.w - 4),
                y: w.y + w.h - 2 - Math.random() * 3,
                vy: -(0.25 + Math.random() * 0.5) * (0.5 + w.intensity),
                vx: (Math.random() - 0.5) * 0.2,
                life: 1,
                decay: 0.03 + Math.random() * 0.03,
                size: Math.random() < 0.3 ? 2 : 1
            });
        }
        if (Math.random() < 0.15 * w.intensity) {
            steam.push({
                x: w.x + Math.random() * w.w,
                y: w.y - 2,
                vy: -0.2 - Math.random() * 0.2,
                vx: 0.1 + Math.random() * 0.15,
                life: 1, decay: 0.008,
                color: '#4a4452', size: 2
            });
        }
    }

    const WET_DOT = glowDot('#6d84b8', 0.55);    // multiplied over walls = damp look
    const SHEEN_DOT = glowDot('#d8eaff', 0.4);   // glisten highlight
    const PUDDLE_DOT = glowDot('#3a5d94', 0.5);  // pooled water body

    // maxAge (in frames) makes the drop "land" right where it was aimed,
    // depositing wetness on whatever surface is there — like a real hose.
    function spawnDrop(x, y, vx, vy, g, maxAge) {
        drops.push({ x, y, vx, vy, life: 1, g: g || 0.04, age: 0, maxAge: maxAge || 0 });
    }

    // --- wet surfaces ---

    function overFacade(x, y) {
        const SW = FF.scene.SIDEWALK_Y;
        return FF.scene.buildings.some(b =>
            x >= b.x && x <= b.x + b.w && y >= b.top - 6 && y <= SW
        );
    }

    function spawnWet(wx, wy, ground) {
        // grow a nearby patch instead of stacking new ones
        for (let i = wets.length - 1; i >= 0; i--) {
            const p = wets[i];
            if (p.ground === ground &&
                Math.abs(p.x - wx) < (ground ? 14 : 10) &&
                Math.abs(p.y - wy) < (ground ? 5 : 10)) {
                p.a = Math.min(p.a + 0.07, ground ? 0.75 : 0.7);
                p.rx = Math.min(p.rx + 0.9, ground ? 26 : 20);
                if (!ground) p.ry = Math.min(p.ry + 0.7, 18);
                return;
            }
        }
        wets.push({
            x: wx, y: wy,
            rx: ground ? 5 + Math.random() * 3 : 4.5 + Math.random() * 3,
            ry: ground ? 1.6 + Math.random() * 0.8 : 4 + Math.random() * 2.5,
            a: ground ? 0.28 : 0.26,
            ground
        });
        if (wets.length > 320) wets.shift();
    }

    function inRect(x, y, r) {
        return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
    }

    function depositDrop(d) {
        // trucks first: they get a glossy wet sheen
        if (FF.truck && inRect(d.x, d.y, FF.truck.bodyRect)) {
            FF.truck.markWet();
            hitSteam(d.x, d.y);
            return;
        }
        if (FF.units && FF.units.markWetAt(d.x, d.y)) {
            hitSteam(d.x, d.y);
            return;
        }
        // sidewalk + street get puddles
        if (d.y >= FF.scene.SIDEWALK_Y - 2) {
            spawnWet(d.x, Math.min(d.y, FF.H - 3), true);
            return;
        }
        if (overFacade(d.x, d.y)) {
            spawnWet(d.x, d.y, false);
            hitSteam(d.x, d.y);
        }
    }

    function burstSteam(w) {
        for (let i = 0; i < 14; i++) {
            steam.push({
                x: w.x + Math.random() * w.w,
                y: w.y + Math.random() * w.h,
                vy: -0.3 - Math.random() * 0.4,
                vx: (Math.random() - 0.5) * 0.4,
                life: 1, decay: 0.012 + Math.random() * 0.01,
                color: P.steam, size: Math.random() < 0.5 ? 2 : 3
            });
        }
    }

    function hitSteam(x, y) {
        if (Math.random() < 0.5) {
            steam.push({
                x, y, vy: -0.3, vx: (Math.random() - 0.5) * 0.5,
                life: 0.7, decay: 0.03, color: P.steam, size: 1
            });
        }
    }

    function starPop(x, y) {
        pops.push({ x, y, vy: -0.35, life: 1, decay: 0.012 });
    }

    function celebrateConfetti() {
        const colors = [P.fire1, P.water2, P.red, P.shirtC, P.shirtB, '#ffffff'];
        for (let i = 0; i < 90; i++) {
            confetti.push({
                x: Math.random() * FF.W,
                y: -10 - Math.random() * 80,
                vy: 0.4 + Math.random() * 0.5,
                phase: Math.random() * Math.PI * 2,
                color: colors[i % colors.length],
                life: 1
            });
        }
    }

    function update(dt, t) {
        const step = dt / 16.67;

        flames.forEach(f => {
            f.x += f.vx * step; f.y += f.vy * step;
            f.life -= f.decay * step;
        });
        flames = flames.filter(f => f.life > 0);

        drops = drops.filter(d => {
            d.x += d.vx * step;
            d.y += d.vy * step;
            d.vy += d.g * step;
            d.life -= 0.006 * step;
            d.age += step;

            // landed on the street (or on a truck parked there)?
            if (d.vy > 0 && d.y >= 198) {
                depositDrop(d);
                return false;
            }
            // reached where it was aimed, or fizzled out
            if ((d.maxAge && d.age >= d.maxAge) || d.life <= 0 || d.y >= FF.H) {
                depositDrop(d);
                return false;
            }
            return true;
        });

        // wet patches slowly dry (walls dry faster than street puddles)
        wets = wets.filter(p => {
            p.a -= dt * (p.ground ? 1 / 90000 : 1 / 55000);
            // heavy wall patches dribble down and pool on the street
            if (!p.ground && p.a > 0.3 && drops.length < 380 &&
                Math.random() < dt * 0.002) {
                drops.push({
                    x: p.x + (Math.random() - 0.5) * p.rx,
                    y: p.y + p.ry,
                    vx: 0, vy: 0.22, g: 0.008,
                    life: 0.55, age: 0, maxAge: 0
                });
            }
            return p.a > 0.02;
        });

        steam.forEach(s => {
            s.x += s.vx * step; s.y += s.vy * step;
            s.life -= s.decay * step;
        });
        steam = steam.filter(s => s.life > 0);

        confetti.forEach(c => {
            c.y += c.vy * step;
            c.x += Math.sin(t * 0.004 + c.phase) * 0.4;
            if (c.y > FF.H - 10) c.life -= 0.02 * step;
        });
        confetti = confetti.filter(c => c.life > 0);

        pops.forEach(p => {
            p.y += p.vy * step;
            p.life -= p.decay * step;
        });
        pops = pops.filter(p => p.life > 0);
    }

    function star(x, cx, cy, r) {
        x.beginPath();
        for (let i = 0; i < 10; i++) {
            const a = -Math.PI / 2 + i * Math.PI / 5;
            const rr = i % 2 === 0 ? r : r * 0.45;
            const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr;
            i === 0 ? x.moveTo(px, py) : x.lineTo(px, py);
        }
        x.closePath();
    }

    // wet sheen layer: drawn right after the scene, under trucks and spray
    function drawWet(x) {
        if (!wets.length) return;
        const SW = FF.scene.SIDEWALK_Y;

        // walls: clip to the building facades so damp never bleeds into the sky
        x.save();
        x.beginPath();
        FF.scene.buildings.forEach(b => x.rect(b.x - 1, b.top - 6, b.w + 2, SW - b.top + 6));
        x.clip();
        wets.forEach(p => {
            if (p.ground) return;
            const al = Math.min(0.75, p.a);
            x.globalCompositeOperation = 'multiply';
            x.globalAlpha = al;
            x.drawImage(WET_DOT, p.x - p.rx, p.y - p.ry, p.rx * 2, p.ry * 2);
            // run-down streak below the patch
            x.globalAlpha = al * 0.5;
            x.drawImage(WET_DOT, p.x - p.rx * 0.35, p.y, p.rx * 0.7, p.ry * 2.6);
            // glisten
            x.globalCompositeOperation = 'lighter';
            x.globalAlpha = al * 0.16;
            x.drawImage(SHEEN_DOT, p.x - p.rx * 0.5, p.y - p.ry * 0.7, p.rx, p.ry * 0.8);
        });
        x.restore();

        // street puddles: flat ellipses with a lamp-light sheen
        x.save();
        x.beginPath();
        x.rect(0, SW, FF.W, FF.H - SW);
        x.clip();
        wets.forEach(p => {
            if (!p.ground) return;
            const al = Math.min(0.8, p.a);
            // deep-blue pooled water (clearly readable, like v1's puddles)
            x.globalCompositeOperation = 'source-over';
            x.globalAlpha = al * 0.55;
            x.drawImage(PUDDLE_DOT, p.x - p.rx, p.y - p.ry, p.rx * 2, p.ry * 2);
            x.globalCompositeOperation = 'multiply';
            x.globalAlpha = al;
            x.drawImage(WET_DOT, p.x - p.rx, p.y - p.ry, p.rx * 2, p.ry * 2);
            x.globalCompositeOperation = 'lighter';
            x.globalAlpha = al * 0.4;
            x.drawImage(SHEEN_DOT, p.x - p.rx * 0.8, p.y - p.ry, p.rx * 1.6, p.ry * 1.7);
        });
        x.restore();
        x.globalAlpha = 1;
    }

    function draw(x) {
        // flames: additive glow blobs, hot core -> red tips
        x.save();
        x.globalCompositeOperation = 'lighter';
        flames.forEach(f => {
            const idx = Math.max(0, Math.min(FIRE_RAMP.length - 1, Math.floor((1 - f.life) * FIRE_RAMP.length)));
            const s = (f.size + 1.6) * (0.7 + f.life * 1.1) * 2.1;
            x.globalAlpha = Math.min(1, 0.35 + f.life * 0.65);
            x.drawImage(FIRE_DOTS[idx], f.x - s / 2, f.y - s / 2, s, s);
        });
        x.restore();
        x.globalAlpha = 1;

        // steam / smoke: soft round puffs
        steam.forEach(s => {
            const sz = s.size * 3.2 * (1.4 - s.life * 0.4);
            x.globalAlpha = Math.max(0, s.life) * 0.55;
            x.drawImage(dotFor(s.color), s.x - sz / 2, s.y - sz / 2, sz, sz);
        });
        x.globalAlpha = 1;

        // water: droplets with velocity streaks
        x.lineCap = 'round';
        drops.forEach(d => {
            x.globalAlpha = Math.max(0.25, Math.min(1, d.life));
            x.strokeStyle = d.life > 0.5 ? P.water1 : P.water2;
            x.lineWidth = 0.9;
            x.beginPath();
            x.moveTo(d.x - d.vx * 3, d.y - d.vy * 3);
            x.lineTo(d.x, d.y);
            x.stroke();
            x.drawImage(WATER_DOT, d.x - 1.6, d.y - 1.6, 3.2, 3.2);
        });
        x.globalAlpha = 1;

        // confetti: tumbling ribbons
        confetti.forEach(c => {
            x.save();
            x.globalAlpha = Math.max(0, c.life);
            x.translate(c.x, c.y);
            x.rotate(c.phase + c.y * 0.08);
            x.fillStyle = c.color;
            x.fillRect(-1.1, -1.7, 2.2, 3.4);
            x.restore();
        });

        // star pops
        pops.forEach(p => {
            x.globalAlpha = Math.max(0, p.life);
            const s = 3 + (1 - p.life) * 1.5;
            x.drawImage(dotFor('#ffd97a'), p.x - s, p.y - s, s * 2, s * 2);
            x.fillStyle = '#ffd955';
            star(x, p.x, p.y, s);
            x.fill();
            x.strokeStyle = 'rgba(255,255,255,0.8)';
            x.lineWidth = 0.5;
            x.stroke();
            x.globalAlpha = 1;
        });
    }

    function reset() {
        flames = []; drops = []; steam = []; confetti = []; pops = []; wets = [];
    }

    return {
        spawnFlames, spawnDrop, spawnWet, burstSteam, hitSteam, starPop, celebrateConfetti,
        update, draw, drawWet, reset,
        get drops() { return drops; },
        get wets() { return wets; }
    };
})();
