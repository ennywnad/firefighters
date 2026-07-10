// --- Settings: gear menu with live-tunable gameplay options ---
window.FF = window.FF || {};

FF.settings = (function () {
    const KEY = 'firefighterV2Settings';

    // schema drives both the values and the menu UI
    const SCHEMA = [
        { key: 'controls',  label: 'CONTROLS',      opts: ['steps', 'tap'],              def: 'steps' },
        { key: 'people',    label: 'PEOPLE',        opts: ['on', 'off'],                 def: 'on' },
        { key: 'fireRate',  label: 'NEW FIRES',     opts: ['chill', 'normal', 'busy'],   def: 'normal' },
        { key: 'maxFires',  label: 'FIRES AT ONCE', opts: ['1', '2', '3'],               def: '2' },
        { key: 'spread',    label: 'FIRE SPREAD',   opts: ['off', 'slow', 'fast'],       def: 'off' },
        { key: 'water',     label: 'WATER POWER',   opts: ['gentle', 'strong'],          def: 'gentle' },
        { key: 'safeTime',  label: 'SAFE TIME',     opts: ['short', 'medium', 'long'],   def: 'medium' },
        { key: 'roundGoal', label: 'STARS TO WIN',  opts: ['5', '8', '12'],              def: '5' }
    ];

    // derived numbers used by game logic
    const TABLES = {
        fireRate:  { chill: 10000, normal: 6000, busy: 3000 },   // ms between new fires
        spread:    { off: 0, slow: 14000, fast: 7000 },          // ms before a fire jumps
        water:     { gentle: 0.003, strong: 0.009 },             // fire reduction per hit
        safeTime:  { short: 10000, medium: 25000, long: 60000 }  // building cooldown ms
    };

    const v = {};

    function load() {
        let saved = {};
        try { saved = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) {}
        SCHEMA.forEach(s => {
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
            const lab = document.createElement('span');
            lab.className = 'set-label';
            lab.textContent = s.label;
            row.appendChild(lab);

            const opts = document.createElement('div');
            opts.className = 'set-opts';
            s.opts.forEach(opt => {
                const btn = document.createElement('button');
                btn.textContent = opt.toUpperCase();
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
            row.appendChild(opts);
            box.appendChild(row);
        });

        document.getElementById('settings-btn').addEventListener('click', () => setOpen(true));
        document.getElementById('settings-close').addEventListener('click', () => setOpen(false));
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
        v, num, buildMenu, setOpen, isOpen,
        set onOpenChange(fn) { onOpenChange = fn; }
    };
})();
