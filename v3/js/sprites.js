// --- Palette + painted-sprite factory (smooth cartoon look) ---
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
    // architecture extras
    stone: '#8a8070', stoneDark: '#66604f',
    doorWood: '#6a4030', doorWoodDark: '#4e2e22',
    // people
    skin: '#f0c8a0', skin2: '#c89060', coat: '#e8b830', coatDark: '#c49220',
    stripe: '#e8e8e8', helmet: '#d83a34', boots: '#2a2c38',
    hairA: '#5a3a20', hairB: '#22242e', hairC: '#c46a2a', shirtA: '#6fc3ef', shirtB: '#e87ab0', shirtC: '#8ad08a'
};

// Painted-sprite factory: draws with smooth shapes at 8x supersample.
// Callers draw the result with explicit logical size: drawImage(spr, x, y, w, h).
FF.paintSprite = function (w, h, fn) {
    const c = document.createElement('canvas');
    c.width = w * 8; c.height = h * 8;
    const x = c.getContext('2d');
    x.scale(8, 8);
    x.lineJoin = 'round';
    x.lineCap = 'round';
    fn(x);
    return c;
};

(function () {
    const P = FF.PAL;

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

    const INK = 'rgba(42,26,34,0.55)';

    // 10 x 14 logical firefighter, facing right. pose: stand|walk1|walk2|spray|cheer
    function firefighter(pose) {
        return FF.paintSprite(10, 14, (x) => {
            const legShift = pose === 'walk1' ? 0.9 : (pose === 'walk2' ? -0.9 : 0);

            // legs + boots
            x.fillStyle = P.boots;
            rr(x, 3.1 - legShift, 10.8, 1.6, 2.9, 0.8); x.fill();
            rr(x, 5.3 + legShift, 10.8, 1.6, 2.9, 0.8); x.fill();
            x.fillStyle = '#14161e';
            rr(x, 2.7 - legShift, 12.7, 2.3, 1.1, 0.55); x.fill();
            rr(x, 5.1 + legShift, 12.7, 2.3, 1.1, 0.55); x.fill();

            // arms behind the coat
            x.fillStyle = P.coatDark;
            if (pose === 'cheer') {
                rr(x, 0.9, 2.2, 1.5, 4.6, 0.75); x.fill();
                rr(x, 7.6, 2.2, 1.5, 4.6, 0.75); x.fill();
                x.fillStyle = P.skin;
                x.beginPath(); x.arc(1.65, 2.1, 0.8, 0, Math.PI * 2); x.fill();
                x.beginPath(); x.arc(8.35, 2.1, 0.8, 0, Math.PI * 2); x.fill();
            } else if (pose === 'spray') {
                rr(x, 1.1, 6.6, 1.4, 3.6, 0.7); x.fill();
                rr(x, 6.2, 6.7, 3.4, 1.4, 0.7); x.fill();
                // nozzle
                x.fillStyle = P.steelDark;
                rr(x, 9.0, 6.55, 1.0, 1.7, 0.4); x.fill();
            } else {
                rr(x, 1.1, 6.6, 1.4, 3.6, 0.7); x.fill();
                rr(x, 7.5, 6.6, 1.4, 3.6, 0.7); x.fill();
            }

            // coat
            const g = x.createLinearGradient(0, 6, 0, 11.6);
            g.addColorStop(0, '#f2c649'); g.addColorStop(1, P.coatDark);
            x.fillStyle = g;
            rr(x, 2.2, 5.9, 5.6, 5.6, 1.2); x.fill();
            x.strokeStyle = INK; x.lineWidth = 0.35;
            rr(x, 2.2, 5.9, 5.6, 5.6, 1.2); x.stroke();
            // reflective stripe
            x.fillStyle = P.stripe;
            rr(x, 2.3, 8.4, 5.4, 0.9, 0.45); x.fill();
            x.fillStyle = 'rgba(255,255,255,0.7)';
            rr(x, 2.3, 8.5, 5.4, 0.3, 0.15); x.fill();

            // head
            x.fillStyle = P.skin;
            x.beginPath(); x.arc(5, 4.35, 1.85, 0, Math.PI * 2); x.fill();
            x.fillStyle = '#2a1c22';
            x.beginPath(); x.arc(4.45, 4.3, 0.24, 0, Math.PI * 2); x.fill();
            x.beginPath(); x.arc(5.7, 4.3, 0.24, 0, Math.PI * 2); x.fill();
            x.strokeStyle = '#a06a4a'; x.lineWidth = 0.3;
            x.beginPath(); x.arc(5.1, 4.9, 0.55, 0.15 * Math.PI, 0.85 * Math.PI); x.stroke();

            // helmet
            const hg = x.createLinearGradient(0, 1.6, 0, 4.2);
            hg.addColorStop(0, '#ee5a4a'); hg.addColorStop(1, P.redDark);
            x.fillStyle = hg;
            x.beginPath(); x.arc(5, 3.7, 2.25, Math.PI, 0); x.closePath(); x.fill();
            rr(x, 2.35, 3.55, 5.3, 0.95, 0.5); x.fill();
            x.strokeStyle = INK; x.lineWidth = 0.35;
            rr(x, 2.35, 3.55, 5.3, 0.95, 0.5); x.stroke();
            // helmet shine + crest
            x.fillStyle = 'rgba(255,255,255,0.35)';
            x.beginPath(); x.arc(4.1, 2.7, 0.55, 0, Math.PI * 2); x.fill();
            x.fillStyle = '#f4c84a';
            rr(x, 4.6, 1.35, 0.8, 0.7, 0.3); x.fill();
        });
    }

    FF.sprites = {
        ffStand: firefighter('stand'),
        ffWalk1: firefighter('walk1'),
        ffWalk2: firefighter('walk2'),
        ffSpray: firefighter('spray'),
        ffCheer: firefighter('cheer')
    };

    // Occupants: 8x8 logical cartoon heads.
    function head(hair, shirt) {
        return FF.paintSprite(8, 8, (x) => {
            // shirt
            const sg = x.createLinearGradient(0, 5.4, 0, 8);
            sg.addColorStop(0, shirt); sg.addColorStop(1, 'rgba(0,0,0,0.25)');
            x.fillStyle = shirt;
            rr(x, 1.1, 5.5, 5.8, 2.5, 1.2); x.fill();
            x.fillStyle = 'rgba(0,0,0,0.14)';
            rr(x, 1.1, 6.9, 5.8, 1.1, 0.55); x.fill();
            // face
            x.fillStyle = P.skin;
            x.beginPath(); x.arc(4, 3.6, 2.15, 0, Math.PI * 2); x.fill();
            // hair cap
            x.fillStyle = hair;
            x.beginPath(); x.arc(4, 3.3, 2.25, Math.PI * 0.95, Math.PI * 2.05); x.closePath(); x.fill();
            // eyes + smile
            x.fillStyle = '#2a1c22';
            x.beginPath(); x.arc(3.25, 3.8, 0.26, 0, Math.PI * 2); x.fill();
            x.beginPath(); x.arc(4.75, 3.8, 0.26, 0, Math.PI * 2); x.fill();
            x.strokeStyle = '#a05a4a'; x.lineWidth = 0.32; x.lineCap = 'round';
            x.beginPath(); x.arc(4, 4.35, 0.7, 0.2 * Math.PI, 0.8 * Math.PI); x.stroke();
            // blush
            x.fillStyle = 'rgba(232,122,140,0.4)';
            x.beginPath(); x.arc(2.7, 4.4, 0.4, 0, Math.PI * 2); x.fill();
            x.beginPath(); x.arc(5.3, 4.4, 0.4, 0, Math.PI * 2); x.fill();
        });
    }
    FF.sprites.people = [
        head(P.hairA, P.shirtA),
        head(P.hairB, P.shirtB),
        head(P.hairC, P.shirtC)
    ];

    // Cat (8x8 logical)
    FF.sprites.cat = FF.paintSprite(8, 8, (x) => {
        x.fillStyle = '#e8a04a';
        // ears
        x.beginPath(); x.moveTo(1.2, 3); x.lineTo(1.7, 0.8); x.lineTo(3, 2.2); x.closePath(); x.fill();
        x.beginPath(); x.moveTo(6.8, 3); x.lineTo(6.3, 0.8); x.lineTo(5, 2.2); x.closePath(); x.fill();
        // head
        x.beginPath(); x.arc(4, 3.8, 2.6, 0, Math.PI * 2); x.fill();
        // eyes
        x.fillStyle = '#2a1c22';
        x.beginPath(); x.arc(3, 3.6, 0.32, 0, Math.PI * 2); x.fill();
        x.beginPath(); x.arc(5, 3.6, 0.32, 0, Math.PI * 2); x.fill();
        // muzzle
        x.fillStyle = '#f2ede4';
        x.beginPath(); x.ellipse(4, 4.7, 1.1, 0.8, 0, 0, Math.PI * 2); x.fill();
        x.fillStyle = '#c46a2a';
        x.beginPath(); x.moveTo(3.7, 4.3); x.lineTo(4.3, 4.3); x.lineTo(4, 4.75); x.closePath(); x.fill();
        // whiskers
        x.strokeStyle = 'rgba(42,26,34,0.5)'; x.lineWidth = 0.22;
        x.beginPath(); x.moveTo(1.4, 4.4); x.lineTo(2.7, 4.6); x.moveTo(6.6, 4.4); x.lineTo(5.3, 4.6); x.stroke();
    });
})();
