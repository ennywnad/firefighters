/* ---------------------------------------------------------------------------
   Fire Rescue version bar — shared by v1, v2 and v3.

     * the fire truck in the header is a clickable easter egg: it zooms off the
       left edge, wraps around and drives back to the middle
     * hovering it (or tapping it on a touch screen) reveals v1 / v2 / v3
     * picking one fades out, and the version you land on opens with the
       arcade titles: the truck and the FIRE RESCUE! logo rush in from opposite
       sides, bounce off each other, settle, and the game fades up out of the dark

   Load the stylesheet in <head>, then this file in <head> too (no defer, so the
   page can be held dark before the first paint), and call:

       FireRescueBar.mount({ truck: existingElement })   // v1
       FireRescueBar.mount({ into: someContainer })      // v2 / v3
   --------------------------------------------------------------------------- */
window.FireRescueBar = (function () {
    'use strict';

    // --- where the three versions live, relative to wherever we are now ---
    const dir = location.pathname.replace(/[^/]*$/, '');
    const base = dir.replace(/(v2|v3)\/$/, '');
    const CURRENT = /\/v3\/$/.test(dir) ? 'v3' : (/\/v2\/$/.test(dir) ? 'v2' : 'v1');

    const VERSIONS = [
        { id: 'v1', href: base, tag: 'CLASSIC' },
        { id: 'v2', href: base + 'v2/', tag: 'ARCADE' },
        { id: 'v3', href: base + 'v3/', tag: 'PAINTED' }
    ];

    const INTRO_HASH = '#intro';
    const MODE_KEY = 'frbIntroMode';   // 'switch' (default) | 'always' | 'off'
    const calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function introMode() {
        try { return localStorage.getItem(MODE_KEY) || 'switch'; } catch (e) { return 'switch'; }
    }

    // a host game (v3) can offer this as an option
    function setIntroMode(mode) {
        try { localStorage.setItem(MODE_KEY, mode); } catch (e) {}
    }

    function introWanted() {
        const mode = introMode();
        if (calm || mode === 'off') return false;
        return mode === 'always' || location.hash === INTRO_HASH;
    }

    // hold the page dark from the very first paint if titles are due
    const introDue = introWanted();
    if (introDue) document.documentElement.classList.add('frb-booting');

    // --- the truck itself, drawn once and reused big in the titles ---------
    function truckSvg(cls) {
        return '<svg class="' + cls + '" viewBox="0 0 124 66" role="img" aria-label="Fire truck">' +
            '<defs>' +
              '<linearGradient id="frbBody" x1="0" y1="0" x2="0" y2="1">' +
                '<stop offset="0" stop-color="#f4705d"/><stop offset=".35" stop-color="#d83a34"/>' +
                '<stop offset="1" stop-color="#8e1f1c"/></linearGradient>' +
              '<linearGradient id="frbGlass" x1="0" y1="0" x2="0" y2="1">' +
                '<stop offset="0" stop-color="#d8f2fb"/><stop offset="1" stop-color="#5fa9cd"/></linearGradient>' +
              '<linearGradient id="frbSteel" x1="0" y1="0" x2="0" y2="1">' +
                '<stop offset="0" stop-color="#eef1f6"/><stop offset="1" stop-color="#8d94a4"/></linearGradient>' +
            '</defs>' +
            // ground shadow
            '<ellipse cx="62" cy="60" rx="52" ry="4.5" fill="rgba(0,0,0,.28)"/>' +
            // ladder along the roof
            '<g stroke="#aab0be" stroke-width="2.4" stroke-linecap="round">' +
              '<path d="M44 15h64"/><path d="M44 21h64"/></g>' +
            '<g stroke="#767d8f" stroke-width="1.6">' +
              '<path d="M52 15v6"/><path d="M62 15v6"/><path d="M72 15v6"/><path d="M82 15v6"/><path d="M92 15v6"/><path d="M102 15v6"/></g>' +
            // pump body
            '<rect x="40" y="23" width="76" height="24" rx="3" fill="url(#frbBody)" stroke="rgba(80,14,12,.55)"/>' +
            '<rect x="43" y="32" width="70" height="4" rx="2" fill="#f7f2e8"/>' +
            '<rect x="43" y="36.6" width="70" height="1.3" fill="#ffc040"/>' +
            '<g fill="url(#frbSteel)" stroke="rgba(60,66,80,.5)" stroke-width=".6">' +
              '<rect x="46" y="39" width="16" height="6" rx="1.4"/>' +
              '<rect x="66" y="39" width="16" height="6" rx="1.4"/>' +
              '<rect x="86" y="39" width="16" height="6" rx="1.4"/></g>' +
            // cab (facing left)
            '<path d="M12 20h30v27H10a4 4 0 0 1-4-4V30a10 10 0 0 1 6-10z" fill="url(#frbBody)" stroke="rgba(80,14,12,.55)"/>' +
            '<path d="M14.5 24.5h16v10h-19a1 1 0 0 1-1-1.2A11 11 0 0 1 14.5 24.5z" fill="url(#frbGlass)"/>' +
            '<path d="M22 24.5h4l-6 10h-3.6z" fill="rgba(255,255,255,.5)"/>' +
            // grille, bumper, headlight
            '<rect x="4" y="42" width="10" height="5" rx="1.6" fill="url(#frbSteel)"/>' +
            '<circle cx="9" cy="37" r="2.4" fill="#ffe08a" stroke="rgba(80,14,12,.4)" stroke-width=".8"/>' +
            // light bar
            '<rect x="16" y="14" width="20" height="6" rx="2.4" fill="#22242e"/>' +
            '<rect x="18" y="15.2" width="7" height="3.6" rx="1.6" fill="#ff5040"/>' +
            '<rect x="27" y="15.2" width="7" height="3.6" rx="1.6" fill="#58b8ff"/>' +
            // wheels
            '<g>' +
              '<circle cx="26" cy="49" r="10" fill="#2a2c38"/><circle cx="26" cy="49" r="5" fill="url(#frbSteel)"/><circle cx="26" cy="49" r="1.6" fill="#22242e"/>' +
              '<circle cx="76" cy="49" r="10" fill="#2a2c38"/><circle cx="76" cy="49" r="5" fill="url(#frbSteel)"/><circle cx="76" cy="49" r="1.6" fill="#22242e"/>' +
              '<circle cx="102" cy="49" r="10" fill="#2a2c38"/><circle cx="102" cy="49" r="5" fill="url(#frbSteel)"/><circle cx="102" cy="49" r="1.6" fill="#22242e"/>' +
            '</g>' +
        '</svg>';
    }

    // --- a very small, very quiet horn ------------------------------------
    function honk() {
        // stay quiet if the game itself is muted
        if (window.FF && FF.audio && FF.audio.muted) return;
        try {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (!Ctx) return;
            const ctx = honk.ctx || (honk.ctx = new Ctx());
            if (ctx.state === 'suspended') ctx.resume();
            [[392, 0], [294, 0.16]].forEach(([f, t]) => {
                const o = ctx.createOscillator(), g = ctx.createGain();
                const t0 = ctx.currentTime + t;
                o.type = 'sawtooth';
                o.frequency.value = f;
                g.gain.setValueAtTime(0.05, t0);
                g.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.22);
                o.connect(g); g.connect(ctx.destination);
                o.start(t0); o.stop(t0 + 0.3);
            });
        } catch (e) {}
    }

    // --- header badge ------------------------------------------------------

    function mount(opts) {
        opts = opts || {};
        const wrap = document.createElement('span');
        wrap.className = 'frb-wrap';
        // the rider takes the lap so the version menu stays anchored to the wrap
        const rider = document.createElement('span');
        rider.className = 'frb-rider';
        wrap.appendChild(rider);

        let truck = opts.truck;
        if (truck) {
            // v1: keep its own truck (and whatever is already wired to it)
            truck.parentNode.insertBefore(wrap, truck);
            rider.appendChild(truck);
        } else {
            truck = document.createElement('button');
            truck.type = 'button';
            truck.className = 'frb-badge';
            truck.setAttribute('aria-label', 'Fire truck — switch game version');
            truck.innerHTML = '&#128658;';
            rider.appendChild(truck);
            const host = opts.into || document.body;
            if (opts.first) host.insertBefore(wrap, host.firstChild);
            else host.appendChild(wrap);
        }

        const menu = document.createElement('nav');
        menu.className = 'frb-versions';
        menu.setAttribute('aria-label', 'Game version');
        VERSIONS.forEach(v => {
            const a = document.createElement('a');
            a.className = 'frb-v' + (v.id === CURRENT ? ' frb-cur' : '');
            a.href = v.href;
            a.innerHTML = v.id + '<small>' + v.tag + '</small>';
            if (v.id === CURRENT) a.setAttribute('aria-current', 'page');
            a.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (v.id === CURRENT) { replay(); close(); return; }
                leaveTo(v.href);
            });
            menu.appendChild(a);
        });
        wrap.appendChild(menu);

        let closeT = 0;
        function open() { clearTimeout(closeT); wrap.classList.add('frb-open'); truck.setAttribute('aria-expanded', 'true'); }
        function close() { wrap.classList.remove('frb-open'); truck.setAttribute('aria-expanded', 'false'); }

        // hover on a mouse, tap on a touch screen
        wrap.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') open(); });
        wrap.addEventListener('pointerleave', (e) => {
            if (e.pointerType !== 'mouse') return;
            closeT = setTimeout(close, 260);
        });
        truck.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            open();
            lap();
        });
        document.addEventListener('pointerdown', (e) => {
            if (!wrap.contains(e.target)) close();
        });
        window.addEventListener('blur', close);

        function lap() {
            if (rider.classList.contains('frb-lap')) return;
            honk();
            rider.classList.add('frb-lap');
            setTimeout(() => rider.classList.remove('frb-lap'), 1950);
        }

        return { wrap, truck, lap, open, close };
    }

    // --- leaving: dip to black, then load the next version -----------------

    function leaveTo(href) {
        const url = introMode() === 'off' ? href : href + INTRO_HASH;
        if (calm) { location.href = url; return; }
        const veil = document.createElement('div');
        veil.className = 'frb-veil';
        document.body.appendChild(veil);
        requestAnimationFrame(() => veil.classList.add('frb-on'));
        setTimeout(() => { location.href = url; }, 330);
    }

    // --- the titles --------------------------------------------------------

    function buildIntro() {
        const me = VERSIONS.find(v => v.id === CURRENT) || VERSIONS[0];
        const el = document.createElement('div');
        el.className = 'frb-intro';
        el.innerHTML =
            '<div class="frb-stage frb-hit">' +
                '<div class="frb-intro-truck">' + truckSvg('frb-truck-art') + '</div>' +
                '<div class="frb-intro-title"><div class="frb-tilt">' +
                    '<span class="frb-3d frb-line1" data-text="FIRE">FIRE</span>' +
                    '<span class="frb-3d frb-line2" data-text="RESCUE!">RESCUE!</span>' +
                    '<div class="frb-sub">' + me.id.toUpperCase() + ' · ' + me.tag + '</div>' +
                '</div></div>' +
            '</div>' +
            '<div class="frb-flash"></div><div class="frb-ring"></div>' +
            '<div class="frb-skip">TAP TO SKIP</div>';
        return el;
    }

    function playIntro() {
        const el = buildIntro();
        // attached to <html>, not <body>: this runs from <head>, before the body
        // exists, so the titles are on screen from the very first paint instead
        // of waiting on the page's other scripts
        document.documentElement.appendChild(el);

        let done = false;
        const timers = [];
        function finish(fast) {
            if (done) return;
            done = true;
            timers.forEach(clearTimeout);
            el.classList.add('frb-out');
            if (fast) el.style.animationDuration = '0.25s';
            document.documentElement.classList.remove('frb-booting');
            setTimeout(() => el.remove(), fast ? 260 : 880);
        }
        // hold the settled logo for a beat before handing over to the game
        timers.push(setTimeout(() => finish(false), 2600));
        el.addEventListener('pointerdown', () => finish(true));
    }

    function start() {
        if (location.hash === INTRO_HASH) {
            // tidy the address bar so a plain refresh doesn't replay the titles
            try { history.replaceState(null, '', location.pathname + location.search); }
            catch (e) { /* leave the hash alone if the browser objects */ }
        }
        if (!introDue) { document.documentElement.classList.remove('frb-booting'); return; }
        playIntro();
    }

    // replay the titles on demand (picking the version you are already on)
    function replay() {
        if (calm || document.querySelector('.frb-intro')) return;
        playIntro();
    }

    start();

    return { mount, replay, leaveTo, setIntroMode, introMode, CURRENT, VERSIONS };
})();
