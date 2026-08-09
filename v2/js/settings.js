// --- Settings: gear menu with live-tunable gameplay options ---
window.FF = window.FF || {};

FF.settings = (function () {
    const KEY = 'firefighterV2Settings';

    // Every row carries a plain-English line saying what it actually does, and
    // display names where the stored value would not read clearly on a button.
    // (Same anatomy as v3's menu; v2 keeps its own smaller set of options.)
    const SCHEMA = [
        { key: 'controls', label: 'CONTROLS', opts: ['steps', 'tap'], def: 'steps',
          names: { steps: 'SET UP + AIM', tap: 'ONE TAP' },
          help: 'Tap the truck and hydrant, then hold to aim the hose — or just tap a fire and the crew does the rest' },
        { key: 'roundGoal', label: 'STARS TO WIN', opts: ['5', '8', '12'], def: '5',
          help: 'How many fires to put out before the confetti' },
        { key: 'fireRate', label: 'NEW FIRES', opts: ['chill', 'normal', 'busy'], def: 'normal',
          help: 'How long until the next window catches fire: 10s / 6s / 3s' },
        { key: 'maxFires', label: 'FIRES AT ONCE', opts: ['1', '2', '3'], def: '2',
          help: 'The most windows that can be burning at the same time' },
        { key: 'spread', label: 'FIRE SPREAD', opts: ['off', 'slow', 'fast'], def: 'off',
          names: { off: 'NEVER', slow: 'SLOW', fast: 'FAST' },
          help: 'Fire jumps to the window next door: never / after 14s / after 7s' },
        { key: 'water', label: 'WATER POWER', opts: ['gentle', 'strong'], def: 'gentle',
          help: 'How fast your spray puts a fire out — strong needs about a third of the water' },
        { key: 'safeTime', label: 'SAFE TIME', opts: ['short', 'medium', 'long'], def: 'medium',
          help: 'How long a cleared building stays fireproof: 10s / 25s / 60s' },
        { key: 'people', label: 'PEOPLE IN WINDOWS', opts: ['on', 'off'], def: 'on',
          help: 'Show the neighbours waving from their windows' },
        { action: 'reset', label: 'START OVER',
          help: 'Put every option on this screen back to how it came' }
    ];

    // derived numbers used by game logic
    const TABLES = {
        fireRate:  { chill: 10000, normal: 6000, busy: 3000 },   // ms between new fires
        spread:    { off: 0, slow: 14000, fast: 7000 },          // ms before a fire jumps
        water:     { gentle: 0.003, strong: 0.009 },             // fire reduction per hit
        safeTime:  { short: 10000, medium: 25000, long: 60000 }  // building cooldown ms
    };

    const v = {};

    function optionRows() {
        return SCHEMA.filter(s => s.key);
    }

    function load() {
        let saved = {};
        try { saved = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) {}
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

    // --- menu UI ---
    let panel, onOpenChange = null;

    function buildMenu() {
        panel = document.getElementById('settings');
        const box = document.getElementById('settings-rows');

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
                btn.addEventListener('click', resetAll);
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
                        if (FF.game && FF.game.onSettingChanged) FF.game.onSettingChanged(s.key);
                    });
                    opts.appendChild(btn);
                });
            }

            row.appendChild(opts);
            box.appendChild(row);
        });

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

    function resetAll() {
        const touched = optionRows().filter(s => v[s.key] !== s.def);
        touched.forEach(s => { v[s.key] = s.def; });
        save();
        syncButtons();
        if (FF.game && FF.game.onSettingChanged) {
            touched.forEach(s => FF.game.onSettingChanged(s.key));
        }
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
        v, num, buildMenu, setOpen, isOpen, resetAll,
        set onOpenChange(fn) { onOpenChange = fn; }
    };
})();
