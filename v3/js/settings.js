// --- Settings: gear menu with live-tunable gameplay + look options ---
//  The schema drives the values, the saved data and the tabbed menu UI.
//  Anything a grown-up (or a curious kid) can flip lives here.
window.FF = window.FF || {};

FF.settings = (function () {
    const KEY = 'firefighterV3Settings';
    const OLD_KEY = 'firefighterV2Settings';   // v3 used to share v2's slot

    // schema drives both the values and the menu UI
    const SCHEMA = [
        // --- PLAY ---
        { tab: 'PLAY', key: 'controls',   label: 'CONTROLS',       opts: ['steps', 'tap'],              def: 'steps' },
        { tab: 'PLAY', key: 'backup',     label: 'BACKUP CREW',    opts: ['you', 'auto'],               def: 'you' },
        { tab: 'PLAY', key: 'roundGoal',  label: 'STARS TO WIN',   opts: ['5', '8', '12'],              def: '5' },
        { tab: 'PLAY', key: 'fireRate',   label: 'NEW FIRES',      opts: ['chill', 'normal', 'busy'],   def: 'normal' },
        { tab: 'PLAY', key: 'maxFires',   label: 'FIRES AT ONCE',  opts: ['1', '2', '3'],               def: '2' },
        { tab: 'PLAY', key: 'spread',     label: 'FIRE SPREAD',    opts: ['off', 'slow', 'fast'],       def: 'off' },
        { tab: 'PLAY', key: 'water',      label: 'WATER POWER',    opts: ['gentle', 'strong'],          def: 'gentle' },
        { tab: 'PLAY', key: 'safeTime',   label: 'SAFE TIME',      opts: ['short', 'medium', 'long'],   def: 'medium' },
        { tab: 'PLAY', key: 'trapped',    label: 'PEOPLE TO SAVE', opts: ['rare', 'some', 'lots'],      def: 'some' },
        { tab: 'PLAY', key: 'truckSpeed', label: 'TRUCK SPEED',    opts: ['slow', 'normal', 'fast'],    def: 'normal' },
        { tab: 'PLAY', key: 'tapSize',    label: 'TAP SIZE',       opts: ['normal', 'big', 'huge'],     def: 'normal' },

        // --- LOOKS ---
        { tab: 'LOOKS', key: 'people',    label: 'PEOPLE',        opts: ['on', 'off'],                            def: 'on' },
        { tab: 'LOOKS', key: 'pets',      label: 'PETS',          opts: ['on', 'off'],                            def: 'on' },
        { tab: 'LOOKS', key: 'timeOfDay', label: 'TIME OF DAY',   opts: ['dusk', 'night', 'day'],                 def: 'dusk' },
        { tab: 'LOOKS', key: 'weather',   label: 'WEATHER',       opts: ['clear', 'rain', 'snow'],                def: 'clear' },
        { tab: 'LOOKS', key: 'truckStyle', label: 'TRUCK',        opts: ['classic', 'detailed'],                  def: 'detailed' },
        { tab: 'LOOKS', key: 'truck1',    label: 'TRUCK 1 COLOR', opts: ['red', 'lime', 'blue', 'orange'],        def: 'red' },
        { tab: 'LOOKS', key: 'truck2',    label: 'TRUCK 2 COLOR', opts: ['red', 'lime', 'blue', 'orange'],        def: 'red' },
        { tab: 'LOOKS', key: 'truck3',    label: 'TRUCK 3 COLOR', opts: ['red', 'lime', 'blue', 'orange'],        def: 'lime' },
        { tab: 'LOOKS', key: 'hydrant',   label: 'HYDRANT',       opts: ['classic', 'modern'],                    def: 'classic' },
        { tab: 'LOOKS', key: 'winLights', label: 'WINDOW LIGHTS', opts: ['still', 'slow', 'normal'],              def: 'normal' },
        { tab: 'LOOKS', key: 'emergency', label: 'EMERGENCY',     opts: ['off', 'on'],                            def: 'off' },
        { tab: 'LOOKS', key: 'bigSpray',  label: '2X SPRAY',      opts: ['off', 'on'],                            def: 'off' },

        // --- SOUND ---
        { tab: 'SOUND', key: 'waterSound', label: 'WATER SOUND', opts: ['default', 'deeper', 'rumbly', 'off'], def: 'default' },
        { tab: 'SOUND', key: 'voice',      label: 'VOICE',       opts: ['off', 'on'],                          def: 'off' },
        { tab: 'SOUND', key: 'debug',      label: 'DEBUG',       opts: ['off', 'on'],                          def: 'off' }
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

    function load() {
        let saved = {};
        try {
            saved = JSON.parse(localStorage.getItem(KEY) ||
                               localStorage.getItem(OLD_KEY)) || {};
        } catch (e) {}
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
            pages[s.tab].appendChild(row);
        });

        showTab(tabs[0]);

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
        v, num, is, paint, trappedMax, buildMenu, setOpen, isOpen,
        set onOpenChange(fn) { onOpenChange = fn; }
    };
})();
