// --- Palette + pixel-sprite factory (16-bit inspired) ---
window.FF = window.FF || {};

FF.PAL = {
    // sky (dusk)
    sky0: '#1c1f4e', sky1: '#2c2a68', sky2: '#4a3b8c', sky3: '#7b4a9e',
    sky4: '#b85e83', sky5: '#e08b4f', sky6: '#f4b04a',
    // city silhouettes
    far: '#34386e', near: '#232558', litWin: '#f4c86a',
    // building
    brick: '#9a4f3a', brickDark: '#7c3c2c', brickLight: '#b06048',
    trim: '#e0cfa0', roof: '#4a3040', roofDark: '#382432',
    glass: '#1c2340', glassLit: '#ffd97a', frame: '#d9c9a8', sill: '#c4b088',
    soot: '#241c20',
    // street
    road: '#3a3f52', roadLine: '#c9c26a', walk: '#5a6178', curb: '#767e99',
    // truck
    red: '#d83a34', redDark: '#a02522', white: '#f2ede4', cabGlass: '#9adcf0',
    steel: '#aab0be', steelDark: '#6e7484', black: '#22242e', tire: '#2a2c38',
    hub: '#c8cdd8', lightRed: '#ff5040', lightBlue: '#58b8ff', amber: '#ffc040',
    // fire / water
    fire0: '#fff2a8', fire1: '#ffd955', fire2: '#ff9633', fire3: '#e8482a', fire4: '#a02522',
    water0: '#e8f8ff', water1: '#b8e6f8', water2: '#6fc3ef', water3: '#3a8fd0',
    steam: '#e8e8f0',
    // hydrant
    hyd: '#e8b830', hydDark: '#b8881c',
    // people
    skin: '#f0c8a0', skin2: '#c89060', coat: '#e8b830', coatDark: '#c49220',
    stripe: '#e8e8e8', helmet: '#d83a34', boots: '#2a2c38',
    hairA: '#5a3a20', hairB: '#22242e', hairC: '#c46a2a', shirtA: '#6fc3ef', shirtB: '#e87ab0', shirtC: '#8ad08a'
};

// Build an offscreen canvas from rows of characters using a char->color map.
FF.makeSprite = function (rows, map) {
    const h = rows.length, w = rows[0].length;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    for (let j = 0; j < h; j++) {
        for (let i = 0; i < w; i++) {
            const ch = rows[j][i];
            if (ch === '.' || ch === ' ' || !map[ch]) continue;
            x.fillStyle = map[ch];
            x.fillRect(i, j, 1, 1);
        }
    }
    return c;
};

(function () {
    const P = FF.PAL;
    const ffMap = {
        h: P.helmet, H: P.redDark, s: P.skin, e: P.black,
        c: P.coat, d: P.coatDark, r: P.stripe, b: P.boots, g: P.black, n: P.steel
    };

    // 10 x 14 firefighter, facing right
    const stand = [
        '...hhhh...',
        '..hhhhhh..',
        '..HHHHHH..',
        '...ssss...',
        '...sees...',
        '...ssss...',
        '..cccccc..',
        '.cccccccc.',
        '.rrrrrrrr.',
        '.cccccccc.',
        '..dddddd..',
        '...b..b...',
        '...b..b...',
        '..bb..bb..'
    ];
    const walk1 = stand.slice(0, 11).concat([
        '..b....b..',
        '..b....b..',
        '.bb....bb.'
    ]);
    const walk2 = stand.slice(0, 11).concat([
        '...b.b....',
        '...b.b....',
        '..bb.bb...'
    ]);
    // arm out holding nozzle (facing right)
    const spray = [
        '...hhhh...',
        '..hhhhhh..',
        '..HHHHHH..',
        '...ssss...',
        '...sees...',
        '...ssss...',
        '..cccccc..',
        '.ccccccggn',
        '.rrrrrrrr.',
        '.cccccccc.',
        '..dddddd..',
        '...b..b...',
        '...b..b...',
        '..bb..bb..'
    ];
    // arms up cheering
    const cheer = [
        '.g......g.',
        '.c......c.',
        '.c.hhhh.c.',
        '.chhhhhhc.',
        '..HHHHHH..',
        '...ssss...',
        '...sees...',
        '...ssss...',
        '..cccccc..',
        '..rrrrrr..',
        '..cccccc..',
        '..dddddd..',
        '...b..b...',
        '..bb..bb..'
    ];

    FF.sprites = {
        ffStand: FF.makeSprite(stand, ffMap),
        ffWalk1: FF.makeSprite(walk1, ffMap),
        ffWalk2: FF.makeSprite(walk2, ffMap),
        ffSpray: FF.makeSprite(spray, ffMap),
        ffCheer: FF.makeSprite(cheer, ffMap)
    };

    // Occupants: 8x8 heads, a few variants. Drawn in windows.
    function head(hair, shirt) {
        const map = { a: hair, s: P.skin, e: P.black, m: P.redDark, t: shirt };
        return FF.makeSprite([
            '.aaaaaa.',
            'aaaaaaaa',
            'assssssa',
            '.sesses.',
            '.ssssss.',
            '..smms..',
            '.tttttt.',
            'tttttttt'
        ], map);
    }
    FF.sprites.people = [
        head(P.hairA, P.shirtA),
        head(P.hairB, P.shirtB),
        head(P.hairC, P.shirtC)
    ];

    // Waving arm frames for people in trouble (drawn beside head)
    FF.sprites.cat = FF.makeSprite([
        'a.....a.',
        'aa...aa.',
        'aaaaaaa.',
        'aesesea.',
        'aaawaaa.',
        '.aaaaa..',
        '.a.a.a..',
        '........'
    ], { a: '#e8a04a', e: P.black, s: P.skin, w: '#f2ede4' });
})();
