// --- Particles (painted): glowing flames, water, steam, confetti, star pops ---
window.FF = window.FF || {};

FF.particles = (function () {
    const P = FF.PAL;
    let flames = [];
    let drops = [];
    let steam = [];
    let confetti = [];
    let pops = [];

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

    function spawnDrop(x, y, vx, vy, g) {
        drops.push({ x, y, vx, vy, life: 1, g: g || 0.04 });
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

        drops.forEach(d => {
            d.x += d.vx * step;
            d.y += d.vy * step;
            d.vy += d.g * step;
            d.life -= 0.006 * step;
        });
        drops = drops.filter(d => d.life > 0 && d.y < FF.H);

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
        flames = []; drops = []; steam = []; confetti = []; pops = [];
    }

    return {
        spawnFlames, spawnDrop, burstSteam, hitSteam, starPop, celebrateConfetti,
        update, draw, reset,
        get drops() { return drops; }
    };
})();
