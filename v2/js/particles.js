// --- Particles: flames, water, steam, confetti, star pops ---
window.FF = window.FF || {};

FF.particles = (function () {
    const P = FF.PAL;
    let flames = [];
    let drops = [];
    let steam = [];
    let confetti = [];
    let pops = [];   // floating star/score pops

    const FIRE_RAMP = [P.fire0, P.fire1, P.fire2, P.fire3, P.fire4];

    function spawnFlames(w) {
        // called each frame per burning window
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
        // occasional smoke above window
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

        // flames rise & fade
        flames.forEach(f => {
            f.x += f.vx * step; f.y += f.vy * step;
            f.life -= f.decay * step;
        });
        flames = flames.filter(f => f.life > 0);

        // water drops fall with gravity; game checks collisions
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

    function draw(x) {
        // flames: color by remaining life (hot core -> red tips)
        flames.forEach(f => {
            const idx = Math.min(FIRE_RAMP.length - 1, Math.floor((1 - f.life) * FIRE_RAMP.length));
            x.fillStyle = FIRE_RAMP[idx];
            x.fillRect(Math.floor(f.x), Math.floor(f.y), f.size, f.size);
        });

        steam.forEach(s => {
            x.globalAlpha = Math.max(0, s.life) * 0.8;
            x.fillStyle = s.color;
            x.fillRect(Math.floor(s.x), Math.floor(s.y), s.size, s.size);
        });
        x.globalAlpha = 1;

        drops.forEach(d => {
            x.fillStyle = d.life > 0.5 ? P.water1 : P.water2;
            x.fillRect(Math.floor(d.x), Math.floor(d.y), 1, 2);
        });

        confetti.forEach(c => {
            x.globalAlpha = Math.max(0, c.life);
            x.fillStyle = c.color;
            x.fillRect(Math.floor(c.x), Math.floor(c.y), 2, 3);
        });
        x.globalAlpha = 1;

        pops.forEach(p => {
            x.globalAlpha = Math.max(0, p.life);
            x.fillStyle = '#ffd97a';
            const px = Math.floor(p.x), py = Math.floor(p.y);
            x.fillRect(px, py - 2, 1, 5);
            x.fillRect(px - 2, py, 5, 1);
            x.fillRect(px - 1, py - 1, 3, 3);
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
