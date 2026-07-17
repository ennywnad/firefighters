// --- Scene (painted): dusk sky, city skyline, block of buildings, street ---
window.FF = window.FF || {};

FF.W = 512;   // widened city: more buildings + room for backup trucks
FF.H = 216;
FF.RES = 4;   // supersample factor for prerendered layers

FF.scene = (function () {
    const P = FF.PAL;
    const W = FF.W, H = FF.H, RES = FF.RES;

    const SIDEWALK_Y = 182;
    const ROAD_Y = 192;
    const HYDRANT_XS = [132, 388];   // left = player's, right = backup trucks'

    const BRICKS = {
        red:   { base: '#9a4f3a', dark: '#7c3c2c', light: '#b06048' },
        tan:   { base: '#8a6a4a', dark: '#6e523a', light: '#a07e58' },
        slate: { base: '#5e6a7e', dark: '#4a5468', light: '#727e94' }
    };

    const CURTAINS = ['#c46a5a', '#5a8a6a', '#5a7aa0'];

    const DEFS = [
        { x: 20,  w: 108, cols: 3, floors: 3, top: 84, brick: 'tan',   roof: 'chimney' },
        { x: 142, w: 150, cols: 4, floors: 5, top: 30, brick: 'red',   roof: 'tank' },
        { x: 302, w: 76,  cols: 2, floors: 4, top: 56, brick: 'slate', roof: 'antenna' },
        { x: 392, w: 104, cols: 3, floors: 4, top: 44, brick: 'tan',   roof: 'tank' }
    ];

    let buildings = [];
    let windows = [];
    let skyCanvas = null;
    let facadeCanvas = null;
    let stars = [];
    let clouds = [];

    // --- painting helpers ---
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
    function lg(x, x0, y0, x1, y1, stops) {
        const g = x.createLinearGradient(x0, y0, x1, y1);
        stops.forEach(s => g.addColorStop(s[0], s[1]));
        return g;
    }
    function rg(x, cx, cy, r, stops) {
        const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
        stops.forEach(s => g.addColorStop(s[0], s[1]));
        return g;
    }

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
                cooldown: 0,
                badgeT: Math.random() * 1000,
                crowd: [],           // evacuated + rescued people at the meeting point
                windows: []
            };

            for (let row = 0; row < d.floors; row++) {
                for (let col = 0; col < d.cols; col++) {
                    const win = {
                        b: bi, col, row,
                        x: gridLeft + col * cellW + Math.floor((cellW - winW) / 2),
                        y: gridTop + row * cellH + 4,
                        w: winW, h: winH,
                        state: 'ok',
                        intensity: 0,
                        spreadT: 0,
                        lit: Math.random() < 0.4,
                        occupant: Math.random() < 0.5 ? Math.floor(Math.random() * FF.sprites.people.length) : -1,
                        waveT: Math.random() * 100,
                        sparkleT: 0,
                        soot: false,
                        deco: Math.random() < 0.3 ? 1 + Math.floor(Math.random() * CURTAINS.length) : 0,
                        flower: Math.random() < 0.25
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
        skyCanvas.width = W * RES; skyCanvas.height = H * RES;
        const x = skyCanvas.getContext('2d');
        x.scale(RES, RES);

        // dusk gradient
        x.fillStyle = lg(x, 0, 0, 0, SIDEWALK_Y, [
            [0, P.sky0], [0.18, P.sky1], [0.34, P.sky2], [0.5, P.sky3],
            [0.66, P.sky4], [0.82, P.sky5], [1, P.sky6]
        ]);
        x.fillRect(0, 0, W, SIDEWALK_Y + 2);

        // moon with layered halo + craters
        const mx = 53, my = 27;
        x.fillStyle = rg(x, mx, my, 30, [[0, 'rgba(244,236,208,0.30)'], [0.4, 'rgba(244,236,208,0.10)'], [1, 'rgba(244,236,208,0)']]);
        x.fillRect(mx - 30, my - 30, 60, 60);
        x.fillStyle = rg(x, mx - 2, my - 3, 9, [[0, '#fffbe8'], [0.7, '#f4ecd0'], [1, '#e2d8b6']]);
        x.beginPath(); x.arc(mx, my, 8.5, 0, Math.PI * 2); x.fill();
        x.fillStyle = 'rgba(190,180,150,0.5)';
        [[mx - 2.5, my + 0.5, 1.7], [mx + 3, my + 3.5, 1.1], [mx + 2, my - 3.5, 1.3]].forEach(c => {
            x.beginPath(); x.arc(c[0], c[1], c[2], 0, Math.PI * 2); x.fill();
        });

        // static painterly cloud banks
        x.fillStyle = 'rgba(226,204,226,0.10)';
        [[110, 46, 34, 6], [150, 42, 26, 5], [250, 26, 40, 7], [290, 30, 26, 5], [40, 62, 30, 5]].forEach(c => {
            x.beginPath(); x.ellipse(c[0], c[1], c[2], c[3], 0, 0, Math.PI * 2); x.fill();
        });

        // far skyline (hazy)
        x.fillStyle = '#3b3f7c';
        const farH = [38, 55, 30, 62, 44, 58, 34, 50];
        let fx = 0;
        for (let i = 0; fx < W + 10; i++) {
            const h = farH[i % farH.length];
            const bw = 34 + ((h * 7) % 22);
            rr(x, fx, SIDEWALK_Y - h - 40, bw, h + 42, 2.5); x.fill();
            if (i % 3 === 0) x.fillRect(fx + 6, SIDEWALK_Y - h - 46, 1.2, 7);
            if (i % 3 === 1) { rr(x, fx + Math.floor(bw / 2) - 4, SIDEWALK_Y - h - 44, 8, 5, 1.5); x.fill(); }
            fx += bw + 6;
        }
        // haze veil over far layer
        x.fillStyle = lg(x, 0, SIDEWALK_Y - 90, 0, SIDEWALK_Y, [[0, 'rgba(240,176,74,0)'], [1, 'rgba(240,176,74,0.16)']]);
        x.fillRect(0, SIDEWALK_Y - 90, W, 90);

        // near skyline with glowing windows
        x.fillStyle = '#242759';
        const nearH = [70, 92, 60, 104, 78, 96];
        let nx = -10;
        const nearRects = [];
        for (let i = 0; nx < W + 10; i++) {
            const h = nearH[i % nearH.length];
            const bw = 52 + ((h * 5) % 30);
            rr(x, nx, SIDEWALK_Y - h, bw, h + 4, 2); x.fill();
            nearRects.push({ x: nx, y: SIDEWALK_Y - h, w: bw, h });
            if (i % 2 === 0) {
                rr(x, nx + 10, SIDEWALK_Y - h - 9, 11, 10, 1.5); x.fill();
                x.fillRect(nx + 9, SIDEWALK_Y - h - 10, 13, 2);
            } else {
                rr(x, nx + bw - 22, SIDEWALK_Y - h - 6, 12, 7, 1.5); x.fill();
            }
            nx += bw + 10;
        }
        x.save();
        x.shadowColor = 'rgba(244,200,106,0.9)';
        x.shadowBlur = 3 * RES;
        x.fillStyle = P.litWin;
        nearRects.forEach(r => {
            for (let wy = r.y + 6; wy < SIDEWALK_Y - 8; wy += 9) {
                for (let wx = r.x + 5; wx < r.x + r.w - 5; wx += 8) {
                    if (((wx * 13 + wy * 7) % 17) < 5) x.fillRect(wx, wy, 2.6, 3.6);
                }
            }
        });
        x.restore();
        x.fillStyle = 'rgba(244,200,106,0.28)';
        nearRects.forEach(r => {
            for (let wy = r.y + 6; wy < SIDEWALK_Y - 8; wy += 9) {
                for (let wx = r.x + 5; wx < r.x + r.w - 5; wx += 8) {
                    if (((wx * 13 + wy * 7) % 17) >= 12) x.fillRect(wx, wy, 2.6, 3.6);
                }
            }
        });

        // warm ground haze
        x.fillStyle = lg(x, 0, SIDEWALK_Y - 36, 0, SIDEWALK_Y, [[0, 'rgba(240,176,74,0)'], [1, 'rgba(240,176,74,0.20)']]);
        x.fillRect(0, SIDEWALK_Y - 36, W, 36);
    }

    function prerenderBuilding(x, b) {
        const bh = SIDEWALK_Y - b.top;
        const K = b.brick;

        // wall with vertical light falloff
        x.fillStyle = K.base;
        x.fillRect(b.x, b.top, b.w, bh);
        x.fillStyle = lg(x, 0, b.top, 0, SIDEWALK_Y, [
            [0, 'rgba(255,235,200,0.16)'], [0.4, 'rgba(255,235,200,0)'],
            [0.75, 'rgba(20,10,30,0)'], [1, 'rgba(20,10,30,0.28)']
        ]);
        x.fillRect(b.x, b.top, b.w, bh);

        // soft brick texture
        x.fillStyle = 'rgba(0,0,0,0.07)';
        for (let y = b.top + 3, r = 0; y < SIDEWALK_Y - 5; y += 5, r++) {
            for (let bx = b.x + ((r % 2) ? 1 : 6) - 1; bx < b.x + b.w - 4; bx += 11) {
                if ((bx * 31 + y * 17) % 7 < 4) { rr(x, bx, y, 9, 3.4, 1); x.fill(); }
            }
        }
        x.fillStyle = 'rgba(255,235,200,0.08)';
        for (let y = b.top + 5, r = 0; y < SIDEWALK_Y - 8; y += 9, r++) {
            for (let bx = b.x + ((r % 2) ? 4 : 9); bx < b.x + b.w - 8; bx += 17) {
                if ((bx * 13 + y * 11) % 5 < 2) { rr(x, bx, y, 8, 3, 1); x.fill(); }
            }
        }
        // weathering blotches
        for (let i = 0; i < 5; i++) {
            const px = b.x + ((i * 73 + b.index * 31) % (b.w - 20)) + 10;
            const py = b.top + ((i * 47 + b.index * 17) % (bh - 30)) + 15;
            x.fillStyle = rg(x, px, py, 14, [[0, 'rgba(20,10,20,0.08)'], [1, 'rgba(20,10,20,0)']]);
            x.fillRect(px - 14, py - 14, 28, 28);
        }

        // rim light left / shade right
        x.fillStyle = lg(x, b.x, 0, b.x + 7, 0, [[0, 'rgba(255,235,200,0.30)'], [1, 'rgba(255,235,200,0)']]);
        x.fillRect(b.x, b.top, 7, bh);
        x.fillStyle = lg(x, b.x + b.w - 7, 0, b.x + b.w, 0, [[0, 'rgba(20,10,30,0)'], [1, 'rgba(20,10,30,0.32)']]);
        x.fillRect(b.x + b.w - 7, b.top, 7, bh);

        // floor band courses
        const gridTop = b.top + 14;
        const cellH = Math.floor((SIDEWALK_Y - gridTop) / b.floors);
        for (let row = 0; row <= b.floors; row++) {
            const ty = gridTop + row * cellH - 3;
            if (ty > b.top + 6 && ty < SIDEWALK_Y - 6) {
                x.fillStyle = P.trim;
                rr(x, b.x, ty, b.w, 2, 1); x.fill();
                x.fillStyle = lg(x, 0, ty + 2, 0, ty + 5, [[0, 'rgba(0,0,0,0.28)'], [1, 'rgba(0,0,0,0)']]);
                x.fillRect(b.x, ty + 2, b.w, 3);
            }
        }

        // stone base
        x.fillStyle = lg(x, 0, SIDEWALK_Y - 6, 0, SIDEWALK_Y, [[0, P.stone], [1, P.stoneDark]]);
        x.fillRect(b.x, SIDEWALK_Y - 6, b.w, 6);

        // parapet + cornice
        x.fillStyle = lg(x, 0, b.top - 6, 0, b.top + 2, [[0, '#5c3c50'], [0.4, P.roof], [1, P.roofDark]]);
        rr(x, b.x - 3, b.top - 6, b.w + 6, 8, 2); x.fill();
        x.fillStyle = 'rgba(255,235,200,0.22)';
        rr(x, b.x - 3, b.top - 6, b.w + 6, 1.6, 1); x.fill();
        x.fillStyle = 'rgba(20,10,20,0.45)';
        for (let bx = b.x; bx < b.x + b.w - 3; bx += 6) {
            rr(x, bx + 1, b.top + 2, 3, 3, 1); x.fill();
        }
        x.fillStyle = lg(x, 0, b.top + 2, 0, b.top + 8, [[0, 'rgba(0,0,0,0.3)'], [1, 'rgba(0,0,0,0)']]);
        x.fillRect(b.x, b.top + 2, b.w, 6);

        // roof props
        if (b.roof === 'tank') {
            x.fillStyle = P.roofDark;
            x.fillRect(b.x + 26, b.top - 8, 2, 4);
            x.fillRect(b.x + 42, b.top - 8, 2, 4);
            x.fillStyle = lg(x, b.x + 24, 0, b.x + 46, 0, [[0, '#5c3c50'], [0.35, P.roof], [1, P.roofDark]]);
            rr(x, b.x + 24, b.top - 22, 22, 15, 2); x.fill();
            x.fillStyle = 'rgba(0,0,0,0.25)';
            x.fillRect(b.x + 24, b.top - 15, 22, 1.2);
            x.fillStyle = P.roof;
            rr(x, b.x + 22, b.top - 24, 26, 3, 1.5); x.fill();
            x.beginPath();
            x.moveTo(b.x + 24, b.top - 24); x.lineTo(b.x + 35, b.top - 31); x.lineTo(b.x + 46, b.top - 24);
            x.closePath(); x.fillStyle = '#5c3c50'; x.fill();
        } else if (b.roof === 'antenna') {
            x.strokeStyle = P.steelDark; x.lineWidth = 1.6; x.lineCap = 'round';
            x.beginPath(); x.moveTo(b.x + b.w - 19, b.top - 30); x.lineTo(b.x + b.w - 19, b.top - 5); x.stroke();
            x.lineWidth = 1;
            x.beginPath(); x.moveTo(b.x + b.w - 25, b.top - 18); x.lineTo(b.x + b.w - 13, b.top - 18); x.stroke();
            x.beginPath(); x.moveTo(b.x + b.w - 23, b.top - 24); x.lineTo(b.x + b.w - 15, b.top - 24); x.stroke();
            x.fillStyle = lg(x, b.x + 7, 0, b.x + 25, 0, [[0, P.roof], [1, P.roofDark]]);
            rr(x, b.x + 8, b.top - 14, 16, 9, 1.5); x.fill();
            rr(x, b.x + 7, b.top - 16, 18, 3, 1.5); x.fill();
        } else if (b.roof === 'chimney') {
            x.fillStyle = lg(x, b.x + 14, 0, b.x + 24, 0, [[0, K.base], [1, K.dark]]);
            rr(x, b.x + 14, b.top - 16, 10, 11, 1); x.fill();
            x.fillStyle = P.roofDark;
            rr(x, b.x + 12, b.top - 18, 14, 3, 1.5); x.fill();
            x.fillStyle = '#5c3c50';
            rr(x, b.x + 15.5, b.top - 21, 2.4, 3, 1); x.fill();
            rr(x, b.x + 20.5, b.top - 21, 2.4, 3, 1); x.fill();
            x.fillStyle = P.steelDark;
            rr(x, b.x + b.w - 25, b.top - 11, 4, 5, 1); x.fill();
        }

        // entrance
        const doorW = Math.min(28, b.w - 30);
        const dx = b.x + Math.floor((b.w - doorW) / 2);
        x.fillStyle = P.frame;
        rr(x, dx - 2, SIDEWALK_Y - 19, doorW + 4, 19, 2); x.fill();
        // transom glow
        x.fillStyle = rg(x, dx + doorW / 2, SIDEWALK_Y - 16, doorW, [[0, 'rgba(255,217,122,0.5)'], [1, 'rgba(255,217,122,0)']]);
        x.fillRect(dx - 8, SIDEWALK_Y - 26, doorW + 16, 20);
        x.fillStyle = P.glassLit;
        rr(x, dx, SIDEWALK_Y - 17, doorW, 3, 1); x.fill();
        // doors
        x.fillStyle = lg(x, 0, SIDEWALK_Y - 13, 0, SIDEWALK_Y, [[0, P.doorWood], [1, P.doorWoodDark]]);
        x.fillRect(dx, SIDEWALK_Y - 13, doorW, 13);
        x.fillStyle = 'rgba(0,0,0,0.4)';
        x.fillRect(dx + doorW / 2 - 0.6, SIDEWALK_Y - 13, 1.2, 13);
        x.strokeStyle = 'rgba(0,0,0,0.3)'; x.lineWidth = 0.8;
        rr(x, dx + 2.5, SIDEWALK_Y - 11, doorW / 2 - 5.5, 8, 1); x.stroke();
        rr(x, dx + doorW / 2 + 3, SIDEWALK_Y - 11, doorW / 2 - 5.5, 8, 1); x.stroke();
        x.fillStyle = P.amber;
        x.beginPath(); x.arc(dx + doorW / 2 - 2.5, SIDEWALK_Y - 7, 0.8, 0, Math.PI * 2); x.fill();
        x.beginPath(); x.arc(dx + doorW / 2 + 2.5, SIDEWALK_Y - 7, 0.8, 0, Math.PI * 2); x.fill();
        // steps
        x.fillStyle = P.curb;
        rr(x, dx - 3, SIDEWALK_Y, doorW + 6, 2, 1); x.fill();
        x.fillStyle = P.walk;
        rr(x, dx - 5, SIDEWALK_Y + 2, doorW + 10, 2, 1); x.fill();

        // striped awning for the hotel
        if (b.roof === 'tank') {
            const ax0 = dx - 5, aw = doorW + 10;
            x.fillStyle = P.red;
            rr(x, ax0, SIDEWALK_Y - 25, aw, 6, 2); x.fill();
            x.fillStyle = P.white;
            for (let ax = ax0 + 4; ax < ax0 + aw - 3; ax += 8) {
                x.fillRect(ax, SIDEWALK_Y - 25, 4, 6);
            }
            // scalloped edge
            for (let ax = ax0 + 2; ax < ax0 + aw; ax += 4) {
                x.fillStyle = ((ax - ax0 - 2) / 4) % 2 < 1 ? P.redDark : '#d8cfc0';
                x.beginPath(); x.arc(ax, SIDEWALK_Y - 19, 2, 0, Math.PI); x.fill();
            }
            x.fillStyle = 'rgba(0,0,0,0.18)';
            x.fillRect(ax0, SIDEWALK_Y - 20, aw, 1.2);
        }

        // window trims
        b.windows.forEach(w => {
            x.fillStyle = P.sill;
            rr(x, w.x - 3, w.y - 4.5, w.w + 6, 2.4, 1); x.fill();     // lintel
            x.fillStyle = lg(x, 0, w.y - 2, 0, w.y + w.h + 2, [[0, '#e6d8ba'], [1, '#c8b691']]);
            rr(x, w.x - 2, w.y - 2, w.w + 4, w.h + 4, 1.5); x.fill(); // frame
            x.fillStyle = P.sill;
            rr(x, w.x - 3, w.y + w.h + 1, w.w + 6, 2.4, 1); x.fill(); // sill
            x.fillStyle = lg(x, 0, w.y + w.h + 3.4, 0, w.y + w.h + 6.4, [[0, 'rgba(0,0,0,0.3)'], [1, 'rgba(0,0,0,0)']]);
            x.fillRect(w.x - 3, w.y + w.h + 3.4, w.w + 6, 3);
            if (w.flower && w.y + w.h + 8 < SIDEWALK_Y - 5) {
                x.fillStyle = lg(x, 0, w.y + w.h + 4, 0, w.y + w.h + 7.4, [[0, '#3f7a3f'], [1, '#2a4e2a']]);
                rr(x, w.x, w.y + w.h + 4, w.w, 3.4, 1.2); x.fill();
                for (let fxp = w.x + 2.5; fxp < w.x + w.w - 1; fxp += 4) {
                    x.fillStyle = (Math.floor(fxp * 7) % 2) ? '#e87ab0' : '#ffd955';
                    x.beginPath(); x.arc(fxp, w.y + w.h + 4, 1.1, 0, Math.PI * 2); x.fill();
                    x.fillStyle = '#5a9a5a';
                    x.beginPath(); x.arc(fxp + 1.6, w.y + w.h + 4.8, 0.7, 0, Math.PI * 2); x.fill();
                }
            }
        });
    }

    function drawLamp(x, lx) {
        const baseY = ROAD_Y - 2;
        const topY = baseY - 40;
        // glow
        x.fillStyle = rg(x, lx + 1, topY + 4, 16, [[0, 'rgba(255,217,122,0.45)'], [0.4, 'rgba(255,217,122,0.15)'], [1, 'rgba(255,217,122,0)']]);
        x.fillRect(lx - 16, topY - 12, 34, 34);
        // light pool
        x.fillStyle = rg(x, lx + 1, SIDEWALK_Y + 6, 20, [[0, 'rgba(255,217,122,0.20)'], [1, 'rgba(255,217,122,0)']]);
        x.fillRect(lx - 20, SIDEWALK_Y - 6, 42, 24);
        // pole
        x.strokeStyle = '#3a3648'; x.lineWidth = 1.8; x.lineCap = 'round';
        x.beginPath(); x.moveTo(lx + 1, topY + 6); x.lineTo(lx + 1, baseY - 1); x.stroke();
        x.fillStyle = '#3a3648';
        rr(x, lx - 2, baseY - 4, 6, 4, 1.5); x.fill();
        // head
        rr(x, lx - 2, topY - 2, 6, 4, 2); x.fill();
        x.fillStyle = rg(x, lx + 1, topY + 4.5, 3.4, [[0, '#fff8d8'], [0.6, P.glassLit], [1, '#e8a830']]);
        x.beginPath(); x.arc(lx + 1, topY + 4.5, 3, 0, Math.PI * 2); x.fill();
    }

    function prerenderFacades() {
        facadeCanvas = document.createElement('canvas');
        facadeCanvas.width = W * RES; facadeCanvas.height = H * RES;
        const x = facadeCanvas.getContext('2d');
        x.scale(RES, RES);

        buildings.forEach(b => prerenderBuilding(x, b));

        // sidewalk
        x.fillStyle = lg(x, 0, SIDEWALK_Y, 0, ROAD_Y, [[0, '#646b84'], [1, '#525870']]);
        x.fillRect(0, SIDEWALK_Y, W, ROAD_Y - SIDEWALK_Y);
        x.fillStyle = 'rgba(255,255,255,0.10)';
        x.fillRect(0, SIDEWALK_Y, W, 1);
        x.strokeStyle = 'rgba(40,44,62,0.5)'; x.lineWidth = 0.7;
        for (let sx = 0; sx < W; sx += 24) {
            x.beginPath(); x.moveTo(sx, SIDEWALK_Y + 1); x.lineTo(sx, ROAD_Y - 2); x.stroke();
        }
        // curb
        x.fillStyle = lg(x, 0, ROAD_Y - 2.5, 0, ROAD_Y, [[0, '#8890ac'], [1, '#4e5468']]);
        x.fillRect(0, ROAD_Y - 2.5, W, 2.5);

        // contact shadows under buildings
        buildings.forEach(b => {
            x.fillStyle = lg(x, 0, SIDEWALK_Y, 0, SIDEWALK_Y + 5, [[0, 'rgba(10,10,25,0.30)'], [1, 'rgba(10,10,25,0)']]);
            x.fillRect(b.x - 2, SIDEWALK_Y, b.w + 4, 5);
        });

        // road
        x.fillStyle = lg(x, 0, ROAD_Y, 0, H, [[0, '#41465c'], [1, '#343950']]);
        x.fillRect(0, ROAD_Y, W, H - ROAD_Y);
        // asphalt mottling
        for (let i = 0; i < 36; i++) {
            const px = (i * 53) % W, py = ROAD_Y + 3 + (i * 29) % (H - ROAD_Y - 5);
            x.fillStyle = rg(x, px, py, 8, [[0, i % 2 ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.04)'], [1, 'rgba(0,0,0,0)']]);
            x.fillRect(px - 8, py - 8, 16, 16);
        }
        // crosswalk (worn paint)
        x.fillStyle = 'rgba(226,224,204,0.42)';
        for (let sx = 42; sx < 94; sx += 10) {
            rr(x, sx, ROAD_Y + 3, 5.5, H - ROAD_Y - 6, 1.5); x.fill();
        }
        // lane dashes
        x.fillStyle = 'rgba(201,194,106,0.85)';
        for (let sx = 4; sx < W; sx += 26) {
            if (sx > 20 && sx < 100) continue;
            rr(x, sx, H - 6.5, 14, 2.4, 1.2); x.fill();
        }
        // manholes
        [[211, 206], [438, 207]].forEach(m => {
            x.fillStyle = '#2e3244';
            x.beginPath(); x.ellipse(m[0], m[1], 5.5, 2.2, 0, 0, Math.PI * 2); x.fill();
            x.strokeStyle = 'rgba(255,255,255,0.14)'; x.lineWidth = 0.7;
            x.beginPath(); x.ellipse(m[0], m[1] - 0.4, 4.6, 1.7, 0, 0, Math.PI * 2); x.stroke();
        });
        // storm drain
        x.fillStyle = '#262a3a';
        rr(x, 252, ROAD_Y - 0.5, 16, 3.5, 1.5); x.fill();
        x.fillStyle = 'rgba(0,0,0,0.55)';
        for (let sx = 254.5; sx < 266; sx += 3) rr(x, sx, ROAD_Y + 0.5, 1.8, 1.6, 0.8), x.fill();

        // streetlamps
        drawLamp(x, 8);
        drawLamp(x, 296);
        drawLamp(x, 468);

        // hydrants
        HYDRANT_XS.forEach(hx => drawHydrant(x, hx));
    }

    function drawHydrant(x, hx) {
        const hy = SIDEWALK_Y - 11;
        x.fillStyle = rg(x, hx + 5, SIDEWALK_Y + 1, 8, [[0, 'rgba(0,0,0,0.30)'], [1, 'rgba(0,0,0,0)']]);
        x.beginPath(); x.ellipse(hx + 5, SIDEWALK_Y + 0.5, 7, 2, 0, 0, Math.PI * 2); x.fill();
        x.fillStyle = P.hydDark;
        rr(x, hx + 0.5, hy + 9, 9, 2.4, 1); x.fill();
        x.fillStyle = lg(x, hx + 2, 0, hx + 8, 0, [[0, '#f4cc5a'], [0.5, P.hyd], [1, P.hydDark]]);
        rr(x, hx + 2, hy + 1.5, 6, 8.5, 2); x.fill();
        x.beginPath(); x.arc(hx + 5, hy + 1.5, 2.4, Math.PI, 0); x.fill();
        rr(x, hx, hy + 4, 10, 3, 1.5); x.fill();
        x.fillStyle = 'rgba(255,248,216,0.5)';
        rr(x, hx + 3, hy + 2, 1.2, 6, 0.6); x.fill();
        x.fillStyle = P.hydDark;
        x.beginPath(); x.arc(hx + 5, hy + 5.5, 1.1, 0, Math.PI * 2); x.fill();
    }

    function init() {
        buildBlock();
        prerenderSky();
        prerenderFacades();

        stars = [];
        for (let i = 0; i < 56; i++) {
            stars.push({
                x: Math.random() * W,
                y: Math.random() * 68,
                p: Math.random() * Math.PI * 2,
                big: Math.random() < 0.18
            });
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

        // lit halo behind everything
        if (w.lit && w.state !== 'fire') {
            x.fillStyle = rg(x, w.x + w.w / 2, w.y + w.h / 2, w.w * 0.9, [[0, 'rgba(255,217,122,0.22)'], [1, 'rgba(255,217,122,0)']]);
            x.fillRect(w.x - w.w, w.y - w.w, w.w * 3, w.h + w.w * 2);
        }

        // glass
        if (w.state === 'fire') {
            x.fillStyle = P.soot;
        } else if (w.lit) {
            x.fillStyle = rg(x, w.x + w.w / 2, w.y + w.h * 0.3, w.w, [[0, '#ffe9a0'], [0.6, P.glassLit], [1, '#e8a850']]);
        } else {
            x.fillStyle = lg(x, 0, w.y, 0, w.y + w.h, [[0, '#171e3c'], [1, '#232c56']]);
        }
        x.fillRect(w.x, w.y, w.w, w.h);

        if (w.state !== 'fire' && !w.lit) {
            // diagonal sky sheen on dark glass
            x.save();
            x.beginPath(); x.rect(w.x, w.y, w.w, w.h); x.clip();
            x.fillStyle = 'rgba(150,160,225,0.13)';
            x.beginPath();
            x.moveTo(w.x + w.w * 0.5, w.y);
            x.lineTo(w.x + w.w * 0.85, w.y);
            x.lineTo(w.x + w.w * 0.35, w.y + w.h);
            x.lineTo(w.x, w.y + w.h);
            x.closePath(); x.fill();
            x.restore();
        }
        // inset shadow
        if (w.state !== 'fire') {
            x.fillStyle = lg(x, 0, w.y, 0, w.y + 2.5, [[0, 'rgba(0,0,0,0.30)'], [1, 'rgba(0,0,0,0)']]);
            x.fillRect(w.x, w.y, w.w, 2.5);
        }

        // curtains
        if (w.deco > 0 && w.state !== 'fire') {
            x.fillStyle = CURTAINS[w.deco - 1];
            x.beginPath();
            x.moveTo(w.x, w.y);
            x.quadraticCurveTo(w.x + 3, w.y + w.h * 0.5, w.x + 1.2, w.y + w.h);
            x.lineTo(w.x, w.y + w.h);
            x.closePath(); x.fill();
            x.beginPath();
            x.moveTo(w.x + w.w, w.y);
            x.quadraticCurveTo(w.x + w.w - 3, w.y + w.h * 0.5, w.x + w.w - 1.2, w.y + w.h);
            x.lineTo(w.x + w.w, w.y + w.h);
            x.closePath(); x.fill();
            x.fillRect(w.x, w.y, w.w, 1.2);
        }

        if (w.soot) {
            x.fillStyle = rg(x, w.x + 1, w.y + 1, w.w * 0.8, [[0, 'rgba(36,28,32,0.55)'], [1, 'rgba(36,28,32,0)']]);
            x.fillRect(w.x, w.y, w.w, w.h);
        }

        // rule: nobody is ever shown in a burning window
        if (showPeople && w.occupant >= 0 && w.state !== 'fire') {
            if (w.state === 'help') {
                // trapped neighbors waving for the big ladder
                const px1 = w.x + Math.floor(w.w / 2) - 8;
                const px2 = w.x + Math.floor(w.w / 2) + 1;
                const py = w.y + w.h - 8;
                x.drawImage(FF.sprites.people[w.occupant], px1, py, 8, 8);
                if (w.helper2 !== undefined) {
                    x.drawImage(FF.sprites.people[w.helper2], px2, py, 8, 8);
                }
                const up = Math.floor(w.waveT * 6) % 2 === 0;
                x.fillStyle = P.skin;
                rr(x, px1 - 2, up ? py - 2 : py + 1, 1.8, 4, 0.9); x.fill();
                rr(x, px2 + 8.2, up ? py + 1 : py - 2, 1.8, 4, 0.9); x.fill();
            } else {
                const spr = FF.sprites.people[w.occupant];
                const px = w.x + Math.floor(w.w / 2) - 4;
                const py = w.y + w.h - 8;
                x.drawImage(spr, px, py, 8, 8);
            }
        }

        // cross bars
        x.fillStyle = 'rgba(217,201,168,0.95)';
        x.fillRect(w.x + w.w / 2 - 0.55, w.y, 1.1, w.h);
        x.fillRect(w.x, w.y + w.h / 2 - 0.55, w.w, 1.1);

        // fire glow
        if (w.state === 'fire') {
            const flick = 0.25 + 0.15 * Math.sin(t * 0.02 + w.col * 3) + 0.35 * w.intensity;
            const a = Math.max(0, Math.min(0.65, flick));
            x.fillStyle = rg(x, w.x + w.w / 2, w.y + w.h / 2, w.w * 1.3,
                [[0, 'rgba(255,150,51,' + a.toFixed(3) + ')'], [1, 'rgba(255,150,51,0)']]);
            x.fillRect(w.x - w.w, w.y - w.w, w.w * 3, w.h + w.w * 2);
        }

        // HELP! bubble over trapped people
        if (w.state === 'help') {
            const bob = Math.sin(w.waveT * 3) * 1.2;
            const bx = w.x + w.w - 1, by = w.y - 7 + bob;
            x.fillStyle = 'rgba(255,255,255,0.95)';
            rr(x, bx - 4, by - 4, 8.5, 8, 3); x.fill();
            x.beginPath();
            x.moveTo(bx - 1, by + 3.6); x.lineTo(bx + 2.5, by + 3.6); x.lineTo(bx + 0.5, by + 6.5);
            x.closePath(); x.fill();
            x.fillStyle = '#d83a34';
            rr(x, bx - 0.6, by - 2.4, 1.4, 3.4, 0.7); x.fill();
            x.beginPath(); x.arc(bx + 0.1, by + 2.4, 0.8, 0, Math.PI * 2); x.fill();
        }

        if (w.sparkleT > 0) {
            const ph = (Math.floor(w.sparkleT / 120) % 2) * 0.8;
            const cx = w.x + w.w - 5, cy = w.y + 3;
            x.strokeStyle = 'rgba(255,255,255,0.95)';
            x.lineWidth = 0.9; x.lineCap = 'round';
            x.beginPath();
            x.moveTo(cx, cy - 2.2 - ph); x.lineTo(cx, cy + 2.2 + ph);
            x.moveTo(cx - 2.2 - ph, cy); x.lineTo(cx + 2.2 + ph, cy);
            x.stroke();
        }
    }

    function drawSafeBadge(x, b) {
        const cx = b.x + b.w / 2;
        const cy = Math.max(10, b.top - 28) + Math.sin(b.badgeT * 0.004) * 2;
        // glow
        x.fillStyle = rg(x, cx, cy, 14, [[0, 'rgba(122,232,154,0.30)'], [1, 'rgba(122,232,154,0)']]);
        x.fillRect(cx - 14, cy - 14, 28, 28);
        // shield
        const g = x.createLinearGradient(0, cy - 7, 0, cy + 8);
        g.addColorStop(0, '#4ec474'); g.addColorStop(1, '#1f7a3a');
        x.fillStyle = g;
        x.beginPath();
        x.moveTo(cx - 6, cy - 6);
        x.quadraticCurveTo(cx, cy - 8.5, cx + 6, cy - 6);
        x.lineTo(cx + 6, cy + 1);
        x.quadraticCurveTo(cx + 6, cy + 6, cx, cy + 8);
        x.quadraticCurveTo(cx - 6, cy + 6, cx - 6, cy + 1);
        x.closePath();
        x.fill();
        x.strokeStyle = '#7ae89a'; x.lineWidth = 1; x.stroke();
        // check
        x.strokeStyle = '#ffffff'; x.lineWidth = 1.8; x.lineCap = 'round'; x.lineJoin = 'round';
        x.beginPath();
        x.moveTo(cx - 3, cy + 0.5);
        x.lineTo(cx - 0.5, cy + 3);
        x.lineTo(cx + 3.5, cy - 3);
        x.stroke();
    }

    function draw(x, t) {
        x.drawImage(skyCanvas, 0, 0, W, H);

        stars.forEach(s => {
            const tw = Math.sin(t * 0.002 + s.p);
            if (tw > 0.2) {
                const r = s.big ? 0.9 : 0.55;
                x.fillStyle = s.big ? 'rgba(255,250,232,0.95)' : 'rgba(255,244,214,0.65)';
                x.beginPath(); x.arc(s.x, s.y, r, 0, Math.PI * 2); x.fill();
                if (s.big && tw > 0.75) {
                    x.fillStyle = 'rgba(255,250,232,0.25)';
                    x.beginPath(); x.arc(s.x, s.y, 2, 0, Math.PI * 2); x.fill();
                }
            }
        });

        clouds.forEach(c => {
            x.fillStyle = 'rgba(240,220,235,0.16)';
            x.beginPath(); x.ellipse(c.x + c.w / 2, c.y, c.w / 2, 3.6, 0, 0, Math.PI * 2); x.fill();
            x.beginPath(); x.ellipse(c.x + c.w * 0.35, c.y - 2.5, c.w * 0.28, 2.6, 0, 0, Math.PI * 2); x.fill();
            x.beginPath(); x.ellipse(c.x + c.w * 0.7, c.y - 1.5, c.w * 0.22, 2.2, 0, 0, Math.PI * 2); x.fill();
            x.fillStyle = 'rgba(150,120,180,0.12)';
            x.beginPath(); x.ellipse(c.x + c.w / 2, c.y + 2.5, c.w * 0.42, 1.8, 0, 0, Math.PI * 2); x.fill();
        });

        x.drawImage(facadeCanvas, 0, 0, W, H);

        // blinking antenna beacon
        buildings.forEach(b => {
            if (b.roof !== 'antenna') return;
            const on = Math.floor(t / 700) % 2 === 0;
            const ax = b.x + b.w - 19, ay = b.top - 30;
            if (on) {
                x.fillStyle = rg(x, ax, ay, 6, [[0, 'rgba(255,80,64,0.55)'], [1, 'rgba(255,80,64,0)']]);
                x.fillRect(ax - 6, ay - 6, 12, 12);
            }
            x.fillStyle = on ? P.lightRed : '#701410';
            x.beginPath(); x.arc(ax, ay, 1.6, 0, Math.PI * 2); x.fill();
        });

        windows.forEach(w => drawWindowInterior(x, w, t));

        // meeting point: evacuated + rescued people gathered on the sidewalk
        const showPeople = !FF.settings || FF.settings.v.people === 'on';
        if (showPeople) {
            buildings.forEach(b => {
                if (!b.crowd.length) return;
                const shown = b.crowd.slice(0, 6);
                shown.forEach((idx, i) => {
                    const px = b.x + 4 + i * 7;
                    // little hop of joy once their building is safe
                    const bounce = b.cooldown > 0
                        ? Math.abs(Math.sin(t * 0.008 + i * 1.3)) * 2 : 0;
                    x.drawImage(FF.sprites.people[idx % FF.sprites.people.length],
                        px, SIDEWALK_Y + 1 - bounce, 8, 8);
                });
            });
        }

        buildings.forEach(b => {
            if (b.cooldown > 0) drawSafeBadge(x, b);
        });
    }

    return {
        init, update, draw, neighbors,
        get windows() { return windows; },
        get buildings() { return buildings; },
        SIDEWALK_Y, ROAD_Y,
        HYDRANT: { x: 130, y: SIDEWALK_Y - 13, w: 14, h: 15 },
        HYDRANTS: HYDRANT_XS.map(hx => ({ x: hx - 2, y: SIDEWALK_Y - 13, w: 14, h: 15, cx: hx + 5 }))
    };
})();
