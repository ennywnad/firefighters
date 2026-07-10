// --- Scene: dusk sky, city skyline, a block of buildings, street ---
window.FF = window.FF || {};

FF.W = 384;
FF.H = 216;

FF.scene = (function () {
    const P = FF.PAL;
    const W = FF.W, H = FF.H;

    const SIDEWALK_Y = 182;
    const ROAD_Y = 192;

    // brick palette variants per building
    const BRICKS = {
        red:   { base: '#9a4f3a', dark: '#7c3c2c', light: '#b06048' },
        tan:   { base: '#8a6a4a', dark: '#6e523a', light: '#a07e58' },
        slate: { base: '#5e6a7e', dark: '#4a5468', light: '#727e94' }
    };

    // the city block: three buildings that can all catch fire
    const DEFS = [
        { x: 20,  w: 108, cols: 3, floors: 3, top: 84, brick: 'tan',   roof: 'chimney' },
        { x: 142, w: 150, cols: 4, floors: 5, top: 30, brick: 'red',   roof: 'tank' },
        { x: 302, w: 76,  cols: 2, floors: 4, top: 56, brick: 'slate', roof: 'antenna' }
    ];

    let buildings = [];
    let windows = [];       // flat list across all buildings
    let skyCanvas = null;
    let facadeCanvas = null;
    let stars = [];
    let clouds = [];

    function buildBlock() {
        buildings = [];
        windows = [];
        DEFS.forEach((d, bi) => {
            const cellW = Math.floor((d.w - 12) / d.cols);
            const gridLeft = d.x + Math.floor((d.w - d.cols * cellW) / 2);
            const gridTop = d.top + 14;
            const cellH = Math.floor((SIDEWALK_Y - gridTop) / d.floors);
            const winW = cellW - 10;
            const winH = cellH - 10;

            const b = {
                index: bi, x: d.x, w: d.w, top: d.top, brick: BRICKS[d.brick], roof: d.roof,
                cols: d.cols, floors: d.floors,
                cooldown: 0,          // ms of "safe" time left after being fully cleared
                badgeT: Math.random() * 1000,
                windows: []
            };

            for (let row = 0; row < d.floors; row++) {
                for (let col = 0; col < d.cols; col++) {
                    const win = {
                        b: bi, col, row,
                        x: gridLeft + col * cellW + Math.floor((cellW - winW) / 2),
                        y: gridTop + row * cellH + 4,
                        w: winW, h: winH,
                        state: 'ok',        // ok | fire | saved
                        intensity: 0,
                        spreadT: 0,
                        lit: Math.random() < 0.4,
                        occupant: Math.random() < 0.5 ? Math.floor(Math.random() * FF.sprites.people.length) : -1,
                        waveT: Math.random() * 100,
                        sparkleT: 0,
                        soot: false
                    };
                    b.windows.push(win);
                    windows.push(win);
                }
            }
            buildings.push(b);
        });
    }

    function neighbors(win) {
        return buildings[win.b].windows.filter(o =>
            Math.abs(o.col - win.col) + Math.abs(o.row - win.row) === 1
        );
    }

    function prerenderSky() {
        skyCanvas = document.createElement('canvas');
        skyCanvas.width = W; skyCanvas.height = H;
        const x = skyCanvas.getContext('2d');

        const bands = [P.sky0, P.sky1, P.sky2, P.sky3, P.sky4, P.sky5, P.sky6];
        const bandH = Math.ceil(SIDEWALK_Y / bands.length);
        bands.forEach((c, i) => {
            x.fillStyle = c;
            x.fillRect(0, i * bandH, W, bandH + 1);
        });

        // moon (above the short building on the left)
        x.fillStyle = '#f4ecd0';
        x.fillRect(46, 20, 14, 14);
        x.fillRect(44, 22, 18, 10);
        x.fillRect(48, 18, 10, 18);
        x.fillStyle = '#d8d0b4';
        x.fillRect(50, 24, 3, 3);
        x.fillRect(55, 29, 2, 2);

        // far skyline
        x.fillStyle = P.far;
        const farH = [38, 55, 30, 62, 44, 58, 34, 50];
        let fx = 0;
        farH.forEach(h => {
            const bw = 34 + ((h * 7) % 22);
            x.fillRect(fx, SIDEWALK_Y - h - 40, bw, h + 40);
            fx += bw + 6;
        });

        // near skyline + lit windows (shows through the gaps between buildings)
        x.fillStyle = P.near;
        const nearH = [70, 92, 60, 104, 78, 96];
        let nx = -10;
        const nearRects = [];
        nearH.forEach(h => {
            const bw = 52 + ((h * 5) % 30);
            x.fillRect(nx, SIDEWALK_Y - h, bw, h);
            nearRects.push({ x: nx, y: SIDEWALK_Y - h, w: bw, h });
            nx += bw + 10;
        });
        x.fillStyle = P.litWin;
        nearRects.forEach(r => {
            for (let wy = r.y + 6; wy < SIDEWALK_Y - 8; wy += 9) {
                for (let wx = r.x + 5; wx < r.x + r.w - 5; wx += 8) {
                    if (((wx * 13 + wy * 7) % 17) < 5) x.fillRect(wx, wy, 3, 4);
                }
            }
        });
    }

    function prerenderBuilding(x, b) {
        const bh = SIDEWALK_Y - b.top;
        const K = b.brick;

        // wall
        x.fillStyle = K.base;
        x.fillRect(b.x, b.top, b.w, bh);

        // mortar lines + joints
        x.fillStyle = K.dark;
        for (let y = b.top + 3; y < SIDEWALK_Y; y += 4) x.fillRect(b.x, y, b.w, 1);
        for (let y = b.top + 3, r = 0; y < SIDEWALK_Y; y += 4, r++) {
            for (let bx = b.x + ((r % 2) ? 0 : 5); bx < b.x + b.w; bx += 10) {
                x.fillRect(bx, y - 3, 1, 3);
            }
        }
        x.fillStyle = K.light;
        x.fillRect(b.x, b.top, 2, bh);

        // floor trim
        x.fillStyle = P.trim;
        const gridTop = b.top + 14;
        const cellH = Math.floor((SIDEWALK_Y - gridTop) / b.floors);
        for (let row = 0; row <= b.floors; row++) {
            const ty = gridTop + row * cellH - 3;
            if (ty > b.top + 4 && ty < SIDEWALK_Y) x.fillRect(b.x, ty, b.w, 2);
        }

        // parapet
        x.fillStyle = P.roof;
        x.fillRect(b.x - 3, b.top - 6, b.w + 6, 8);
        x.fillStyle = P.roofDark;
        x.fillRect(b.x - 3, b.top, b.w + 6, 2);

        // roof detail
        if (b.roof === 'tank') {
            x.fillStyle = P.roofDark;
            x.fillRect(b.x + 24, b.top - 22, 22, 16);
            x.fillStyle = P.roof;
            x.fillRect(b.x + 22, b.top - 24, 26, 4);
            x.fillRect(b.x + 26, b.top - 10, 2, 4);
            x.fillRect(b.x + 42, b.top - 10, 2, 4);
        } else if (b.roof === 'antenna') {
            x.fillStyle = P.steelDark;
            x.fillRect(b.x + b.w - 20, b.top - 26, 2, 20);
            x.fillRect(b.x + b.w - 24, b.top - 16, 10, 1);
            x.fillStyle = P.lightRed;
            x.fillRect(b.x + b.w - 21, b.top - 28, 4, 3);
        } else if (b.roof === 'chimney') {
            x.fillStyle = K.dark;
            x.fillRect(b.x + 14, b.top - 16, 10, 10);
            x.fillStyle = P.roofDark;
            x.fillRect(b.x + 12, b.top - 18, 14, 3);
        }

        // entrance
        const doorW = Math.min(28, b.w - 30);
        const dx = b.x + Math.floor((b.w - doorW) / 2);
        x.fillStyle = P.glass;
        x.fillRect(dx, SIDEWALK_Y - 16, doorW, 16);
        x.fillStyle = P.frame;
        x.fillRect(dx + Math.floor(doorW / 2), SIDEWALK_Y - 16, 2, 16);
        if (b.roof === 'tank') { // the fancy building gets an awning
            x.fillStyle = P.red;
            x.fillRect(dx - 4, SIDEWALK_Y - 22, doorW + 8, 5);
            x.fillStyle = P.redDark;
            x.fillRect(dx - 4, SIDEWALK_Y - 17, doorW + 8, 2);
        }

        // window frames + sills
        b.windows.forEach(w => {
            x.fillStyle = P.frame;
            x.fillRect(w.x - 2, w.y - 2, w.w + 4, w.h + 4);
            x.fillStyle = P.sill;
            x.fillRect(w.x - 3, w.y + w.h + 1, w.w + 6, 2);
        });
    }

    function prerenderFacades() {
        facadeCanvas = document.createElement('canvas');
        facadeCanvas.width = W; facadeCanvas.height = H;
        const x = facadeCanvas.getContext('2d');

        buildings.forEach(b => prerenderBuilding(x, b));

        // sidewalk
        x.fillStyle = P.walk;
        x.fillRect(0, SIDEWALK_Y, W, ROAD_Y - SIDEWALK_Y);
        x.fillStyle = P.curb;
        x.fillRect(0, ROAD_Y - 2, W, 2);
        for (let sx = 0; sx < W; sx += 24) {
            x.fillStyle = '#4c526a';
            x.fillRect(sx, SIDEWALK_Y, 1, ROAD_Y - SIDEWALK_Y - 2);
        }
        // road
        x.fillStyle = P.road;
        x.fillRect(0, ROAD_Y, W, H - ROAD_Y);
        x.fillStyle = P.roadLine;
        for (let sx = 4; sx < W; sx += 26) {
            x.fillRect(sx, H - 6, 14, 2);
        }
        // hydrant in the gap between buildings 1 and 2
        const hx = 132, hy = SIDEWALK_Y - 11;
        x.fillStyle = P.hydDark;
        x.fillRect(hx + 1, hy + 9, 8, 2);
        x.fillStyle = P.hyd;
        x.fillRect(hx + 2, hy + 2, 6, 8);
        x.fillRect(hx + 3, hy, 4, 2);
        x.fillRect(hx, hy + 4, 10, 3);
    }

    function init() {
        buildBlock();
        prerenderSky();
        prerenderFacades();

        stars = [];
        for (let i = 0; i < 40; i++) {
            stars.push({ x: Math.random() * W, y: Math.random() * 60, p: Math.random() * Math.PI * 2 });
        }
        clouds = [
            { x: 60, y: 36, w: 40, s: 0.06 },
            { x: 220, y: 14, w: 56, s: 0.04 },
            { x: 320, y: 46, w: 34, s: 0.08 }
        ];
    }

    function update(dt) {
        clouds.forEach(c => {
            c.x += c.s * dt * 0.06;
            if (c.x > W + 40) c.x = -c.w - 20;
        });
        windows.forEach(w => {
            w.waveT += dt * 0.01;
            if (w.sparkleT > 0) w.sparkleT -= dt;
        });
        buildings.forEach(b => { b.badgeT += dt; });
    }

    function drawWindowInterior(x, w, t) {
        const showPeople = !FF.settings || FF.settings.v.people === 'on';

        if (w.state === 'fire') {
            x.fillStyle = P.soot;
        } else if (w.lit) {
            x.fillStyle = P.glassLit;
        } else {
            x.fillStyle = P.glass;
        }
        x.fillRect(w.x, w.y, w.w, w.h);

        if (w.soot) {
            x.globalAlpha = 0.45;
            x.fillStyle = P.soot;
            x.fillRect(w.x, w.y, w.w, 3);
            x.fillRect(w.x, w.y, 3, w.h);
            x.globalAlpha = 1;
        }

        if (showPeople && w.occupant >= 0) {
            const spr = FF.sprites.people[w.occupant];
            const px = w.x + Math.floor(w.w / 2) - 4;
            const py = w.y + w.h - 8;
            x.drawImage(spr, px, py);
            if (w.state === 'fire') {
                const up = Math.floor(w.waveT * 6) % 2 === 0;
                x.fillStyle = P.skin;
                x.fillRect(px - 2, up ? py - 2 : py + 1, 2, 4);
                x.fillRect(px + 8, up ? py + 1 : py - 2, 2, 4);
            }
        }

        // cross bars
        x.fillStyle = P.frame;
        x.fillRect(w.x + Math.floor(w.w / 2), w.y, 1, w.h);
        x.fillRect(w.x, w.y + Math.floor(w.h / 2), w.w, 1);

        // fire glow
        if (w.state === 'fire') {
            const flick = 0.25 + 0.15 * Math.sin(t * 0.02 + w.col * 3) + 0.35 * w.intensity;
            x.globalAlpha = Math.max(0, Math.min(0.6, flick));
            x.fillStyle = P.fire2;
            x.fillRect(w.x - 4, w.y - 4, w.w + 8, w.h + 8);
            x.globalAlpha = 1;
        }

        if (w.sparkleT > 0) {
            const ph = Math.floor(w.sparkleT / 120) % 2;
            x.fillStyle = '#ffffff';
            const cx = w.x + w.w - 5, cy = w.y + 3;
            x.fillRect(cx, cy - 2 + ph, 1, 5);
            x.fillRect(cx - 2 + ph, cy, 5, 1);
        }
    }

    function drawSafeBadge(x, b) {
        // bobbing green shield with a check above a cleared building
        const bx = b.x + Math.floor(b.w / 2) - 5;
        const by = Math.max(4, b.top - 34) + Math.round(Math.sin(b.badgeT * 0.004) * 2);
        x.fillStyle = '#2a9a4a';
        x.fillRect(bx, by, 10, 9);
        x.fillRect(bx + 1, by + 9, 8, 2);
        x.fillRect(bx + 3, by + 11, 4, 1);
        x.fillStyle = '#7ae89a';
        x.fillRect(bx, by, 10, 2);
        x.fillStyle = '#ffffff';
        x.fillRect(bx + 2, by + 4, 2, 2);
        x.fillRect(bx + 4, by + 6, 2, 2);
        x.fillRect(bx + 6, by + 4, 2, 2);
        x.fillRect(bx + 7, by + 2, 2, 2);
    }

    function draw(x, t) {
        x.drawImage(skyCanvas, 0, 0);

        stars.forEach(s => {
            if (Math.sin(t * 0.002 + s.p) > 0.2) {
                x.fillStyle = 'rgba(255,244,214,0.9)';
                x.fillRect(Math.floor(s.x), Math.floor(s.y), 1, 1);
            }
        });

        x.fillStyle = 'rgba(240,220,230,0.28)';
        clouds.forEach(c => {
            x.fillRect(Math.floor(c.x), c.y, c.w, 5);
            x.fillRect(Math.floor(c.x) + 6, c.y - 3, c.w - 14, 3);
        });

        x.drawImage(facadeCanvas, 0, 0);

        windows.forEach(w => drawWindowInterior(x, w, t));

        buildings.forEach(b => {
            if (b.cooldown > 0) drawSafeBadge(x, b);
        });
    }

    return {
        init, update, draw, neighbors,
        get windows() { return windows; },
        get buildings() { return buildings; },
        SIDEWALK_Y, ROAD_Y,
        HYDRANT: { x: 130, y: SIDEWALK_Y - 13, w: 14, h: 15 }
    };
})();
