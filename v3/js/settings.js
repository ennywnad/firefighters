// --- Settings: gear menu with live-tunable gameplay + look options ---
//  The schema drives the values, the saved data and the tabbed menu UI.
//  Anything a grown-up (or a curious kid) can flip lives here.
window.FF = window.FF || {};

FF.settings = (function () {
    const KEY = 'firefighterV3Settings';
    const OLD_KEY = 'firefighterV2Settings';   // v3 used to share v2's slot

    // Every row carries a plain-English line saying what it actually does, and
    // display names where the stored value would not read clearly on a button.
    const SCHEMA = [
        // --- PLAY: how the game behaves ---
        { tab: 'PLAY', key: 'controls', label: 'CONTROLS', opts: ['steps', 'tap'], def: 'steps',
          names: { steps: 'SET UP + AIM', tap: 'ONE TAP' },
          help: 'Tap the truck and hydrant, then hold to aim the hose — or just tap a fire and the crew does the rest' },
        { tab: 'PLAY', key: 'backup', label: 'BACKUP LADDERS', opts: ['you', 'auto'], def: 'you',
          names: { you: 'YOU DRIVE', auto: 'CREW DRIVES' },
          help: 'Who works ladder trucks 2 and 3 once they are set up: you point and hold, or they pick their own targets' },
        { tab: 'PLAY', key: 'roundGoal', label: 'STARS TO WIN', opts: ['5', '8', '12'], def: '5',
          help: 'Fires put out plus people rescued before the confetti' },
        { tab: 'PLAY', key: 'fireRate', label: 'NEW FIRES', opts: ['chill', 'normal', 'busy'], def: 'normal',
          help: 'How long until the next window catches fire: 10s / 6s / 3s' },
        { tab: 'PLAY', key: 'maxFires', label: 'FIRES AT ONCE', opts: ['1', '2', '3'], def: '2',
          help: 'The most windows that can be burning at the same time' },
        { tab: 'PLAY', key: 'spread', label: 'FIRE SPREAD', opts: ['off', 'slow', 'fast'], def: 'off',
          names: { off: 'NEVER', slow: 'SLOW', fast: 'FAST' },
          help: 'Fire jumps to the window next door: never / after 14s / after 7s' },
        { tab: 'PLAY', key: 'water', label: 'WATER POWER', opts: ['gentle', 'strong'], def: 'gentle',
          names: { gentle: 'GENTLE', strong: 'STRONG' },
          help: 'How fast your spray puts a fire out — strong needs about a third of the water' },
        { tab: 'PLAY', key: 'safeTime', label: 'SAFE TIME', opts: ['short', 'medium', 'long'], def: 'medium',
          help: 'How long a cleared building keeps its green shield and stays fireproof: 10s / 25s / 60s' },
        { tab: 'PLAY', key: 'trapped', label: 'RESCUES', opts: ['rare', 'some', 'lots'], def: 'some',
          help: 'How often neighbours get trapped at a window and need a ladder' },
        { tab: 'PLAY', key: 'truckSpeed', label: 'TRUCK SPEED', opts: ['slow', 'normal', 'fast'], def: 'normal',
          help: 'How quickly every truck drives in when called' },
        { tab: 'PLAY', key: 'tapSize', label: 'TAP SIZE', opts: ['normal', 'big', 'huge'], def: 'normal',
          help: 'How much space around a fire, truck or button still counts as tapping it — bigger is easier for small fingers' },

        // --- LOOKS: what you see ---
        { tab: 'LOOKS', key: 'people', label: 'PEOPLE IN WINDOWS', opts: ['on', 'off'], def: 'on',
          help: 'Show the neighbours at their windows and gathered at the meeting point' },
        { tab: 'LOOKS', key: 'pets', label: 'PETS', opts: ['on', 'off'], def: 'on',
          help: 'A cat on the windowsill, carried out with the family' },
        { tab: 'LOOKS', key: 'timeOfDay', label: 'TIME OF DAY', opts: ['dusk', 'night', 'day'], def: 'dusk',
          help: 'Repaints the sky, the skyline, the moon or sun and the streetlamps' },
        { tab: 'LOOKS', key: 'weather', label: 'WEATHER', opts: ['clear', 'rain', 'snow'], def: 'clear',
          help: 'Rain or snow falling over the block (looks only — fires burn the same)' },
        { tab: 'LOOKS', key: 'truckStyle', label: 'TRUCK DETAIL', opts: ['classic', 'detailed'], def: 'detailed',
          names: { classic: 'PLAIN', detailed: 'FANCY' },
          help: 'Chevrons, gear doors and gold pinstripes on all three trucks' },
        { tab: 'LOOKS', key: 'truck1', label: 'ENGINE COLOR', opts: ['red', 'lime', 'blue', 'orange'], def: 'red',
          help: 'Paint for truck 1, the engine you start with' },
        { tab: 'LOOKS', key: 'truck2', label: 'LADDER 2 COLOR', opts: ['red', 'lime', 'blue', 'orange'], def: 'red',
          help: 'Paint for the backup truck on the left walkie-talkie button' },
        { tab: 'LOOKS', key: 'truck3', label: 'LADDER 3 COLOR', opts: ['red', 'lime', 'blue', 'orange'], def: 'lime',
          help: 'Paint for the backup truck on the right walkie-talkie button' },
        { tab: 'LOOKS', key: 'hydrant', label: 'HYDRANT', opts: ['classic', 'modern'], def: 'classic',
          help: 'Round brass pumper, or a squarer chrome-and-red one' },
        { tab: 'LOOKS', key: 'winLights', label: 'HOUSE LIGHTS', opts: ['still', 'slow', 'normal'], def: 'normal',
          names: { still: 'NEVER', slow: 'SLOW', normal: 'NORMAL' },
          help: 'How often windows flick their lights on and off by themselves' },
        { tab: 'LOOKS', key: 'emergency', label: 'TRUCK BEACONS', opts: ['off', 'on'], def: 'off',
          names: { off: 'WHEN DRIVING', on: 'ALWAYS ON' },
          help: 'Whether the red and blue roof lights keep flashing while a truck is parked' },
        { tab: 'LOOKS', key: 'bigSpray', label: 'WATER DROPS', opts: ['off', 'on'], def: 'off',
          names: { off: 'NORMAL', on: 'BIG' },
          help: 'Fatter, splashier droplets — this is looks only, it does not change WATER POWER' },

        // --- SOUND ---
        { tab: 'SOUND', key: 'waterSound', label: 'HOSE SOUND', opts: ['default', 'deeper', 'rumbly', 'off'], def: 'default',
          names: { default: 'BRIGHT', deeper: 'DEEP', rumbly: 'RUMBLY', off: 'OFF' },
          help: 'The hiss while water is spraying (the speaker button mutes everything at once)' },
        { tab: 'SOUND', key: 'voice', label: 'VOICE', opts: ['off', 'on'], def: 'off',
          help: 'Reads the message at the top of the screen out loud' },

        // --- EXTRA ---
        { tab: 'EXTRA', key: 'intro', label: 'TITLE INTRO', opts: ['switch', 'always', 'off'], def: 'switch',
          names: { switch: 'WHEN SWITCHING', always: 'EVERY TIME', off: 'OFF' },
          help: 'The fire truck and FIRE RESCUE! logo crashing together before the game starts' },
        { tab: 'EXTRA', key: 'debug', label: 'DEBUG', opts: ['off', 'on'], def: 'off',
          help: 'Draws the frame rate, truck states and every tap area on screen' },
        { tab: 'EXTRA', action: 'reset', label: 'START OVER',
          help: 'Put every option on this screen back to how it came' }
    ];

    // derived numbers used by game logic
    const TABLES = {
        fireRate:   { chill: 10000, normal: 6000, busy: 3000 },   // ms between new fires
        spread:     { off: 0, slow: 14000, fast: 7000 },          // ms before a fire jumps
        water:      { gentle: 0.003, strong: 0.009 },             // fire reduction per hit
        safeTime:   { short: 10000, medium: 25000, long: 60000 }, // building cooldown ms
        truckSpeed: { slow: 0.7, normal: 1, fast: 1.5 },          // drive speed multiplier
        tapSize:    { normal: 8, big: 15, huge: 22 },             // extra hit padding (world units)
        trapped:    { rare: 0.2, some: 0.45, lots: 0.8 },         // chance a neighbor gets trapped
        winLights:  { still: 0, slow: 60000, normal: 30000 }      // ms floor between light flips
    };

    // how many trapped windows may wait at once
    const TRAPPED_MAX = { rare: 1, some: 2, lots: 3 };

    // truck paint jobs, keyed by the colour names v1 used
    const PAINTS = {
        red:    { light: '#f06a58', base: '#d83a34', dark: '#a02522', ink: 'rgba(90,18,16,0.6)' },
        lime:   { light: '#c2e86a', base: '#9ACD32', dark: '#5f8a1e', ink: 'rgba(48,66,14,0.6)' },
        blue:   { light: '#6fc0ef', base: '#3498db', dark: '#1f6698', ink: 'rgba(12,44,72,0.6)' },
        orange: { light: '#ffbe5c', base: '#f39c12', dark: '#b06806', ink: 'rgba(92,50,4,0.6)' }
    };

    const v = {};

    function optionRows() {
        return SCHEMA.filter(s => s.key);
    }

    function load() {
        let saved = {};
        try {
            saved = JSON.parse(localStorage.getItem(KEY) ||
                               localStorage.getItem(OLD_KEY)) || {};
        } catch (e) {}
        optionRows().forEach(s => {
            v[s.key] = s.opts.includes(saved[s.key]) ? saved[s.key] : s.def;
        });
    }

    function save() {
        try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {}
    }

    function num(key) {
        return TABLES[key][v[key]];
    }

    function is(key, val) {
        return v[key] === val;
    }

    function paint(key) {
        return PAINTS[v[key]] || PAINTS.red;
    }

    function trappedMax() {
        return TRAPPED_MAX[v.trapped];
    }

    // --- menu UI ---
    let panel, onOpenChange = null;

    function buildMenu() {
        panel = document.getElementById('settings');
        const tabBar = document.getElementById('settings-tabs');
        const box = document.getElementById('settings-rows');

        const tabs = [];
        SCHEMA.forEach(s => { if (!tabs.includes(s.tab)) tabs.push(s.tab); });

        const pages = {};
        tabs.forEach(name => {
            const page = document.createElement('div');
            page.className = 'set-page';
            pages[name] = page;
            box.appendChild(page);

            const tab = document.createElement('button');
            tab.className = 'set-tab';
            tab.textContent = name;
            tab.addEventListener('click', () => showTab(name));
            tabBar.appendChild(tab);
            pages[name].tabBtn = tab;
        });

        function showTab(name) {
            tabs.forEach(n => {
                pages[n].classList.toggle('hidden', n !== name);
                pages[n].tabBtn.classList.toggle('sel', n === name);
            });
        }

        SCHEMA.forEach(s => {
            const row = document.createElement('div');
            row.className = 'set-row';

            // label plus the line explaining what the setting actually does
            const text = document.createElement('div');
            text.className = 'set-text';
            const lab = document.createElement('span');
            lab.className = 'set-label';
            lab.textContent = s.label;
            text.appendChild(lab);
            if (s.help) {
                const help = document.createElement('span');
                help.className = 'set-help';
                help.textContent = s.help;
                text.appendChild(help);
            }
            row.appendChild(text);

            const opts = document.createElement('div');
            opts.className = 'set-opts';

            if (s.action === 'reset') {
                const btn = document.createElement('button');
                btn.className = 'set-reset';
                btn.textContent = 'RESET';
                btn.addEventListener('click', () => { resetAll(); });
                opts.appendChild(btn);
            } else {
                s.opts.forEach(opt => {
                    const btn = document.createElement('button');
                    btn.textContent = (s.names && s.names[opt]) || opt.toUpperCase();
                    btn.dataset.key = s.key;
                    btn.dataset.val = opt;
                    if (v[s.key] === opt) btn.classList.add('sel');
                    btn.addEventListener('click', () => {
                        v[s.key] = opt;
                        save();
                        opts.querySelectorAll('button').forEach(b => b.classList.toggle('sel', b === btn));
                        changed(s.key);
                    });
                    opts.appendChild(btn);
                });
            }

            row.appendChild(opts);
            pages[s.tab].appendChild(row);
        });

        showTab(tabs[0]);

        document.getElementById('settings-btn').addEventListener('click', () => setOpen(true));
        document.getElementById('settings-close').addEventListener('click', () => setOpen(false));
    }

    // repaint every button after values change underneath the menu
    function syncButtons() {
        if (!panel) return;
        panel.querySelectorAll('.set-opts button[data-key]').forEach(b => {
            b.classList.toggle('sel', v[b.dataset.key] === b.dataset.val);
        });
    }

    function changed(key) {
        // the shared title sequence lives outside the game, so tell it directly
        if (key === 'intro' && window.FireRescueBar) FireRescueBar.setIntroMode(v.intro);
        if (FF.game && FF.game.onSettingChanged) FF.game.onSettingChanged(key);
    }

    function resetAll() {
        const touched = optionRows().filter(s => v[s.key] !== s.def);
        touched.forEach(s => { v[s.key] = s.def; });
        save();
        syncButtons();
        touched.forEach(s => changed(s.key));
    }

    function setOpen(open) {
        panel.classList.toggle('hidden', !open);
        if (onOpenChange) onOpenChange(open);
    }

    function isOpen() {
        return panel && !panel.classList.contains('hidden');
    }

    load();

    return {
        v, num, is, paint, trappedMax, buildMenu, setOpen, isOpen, resetAll,
        set onOpenChange(fn) { onOpenChange = fn; }
    };
})();
