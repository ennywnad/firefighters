// --- Voice guide: reads the on-screen instruction out loud (v1 parity) ---
//  Uses the browser's speech synthesis; silently does nothing where it is
//  unavailable. Only speaks when VOICE is switched on in the options.
window.FF = window.FF || {};

FF.voice = (function () {
    const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

    let voice = null;
    let lastSaid = '';
    let lastAt = 0;

    const PREFERRED = [
        'Google UK English Female', 'Google US English', 'Microsoft Zira',
        'Samantha', 'Victoria', 'Alex'
    ];

    function pickVoice() {
        if (!supported) return;
        const all = window.speechSynthesis.getVoices();
        if (!all.length) return;
        for (const name of PREFERRED) {
            const found = all.find(v => v.name.indexOf(name) >= 0);
            if (found) { voice = found; return; }
        }
        voice = all.find(v => v.lang && v.lang.indexOf('en') === 0) || all[0];
    }

    if (supported) {
        pickVoice();
        window.speechSynthesis.onvoiceschanged = pickVoice;
    }

    function enabled() {
        return supported && FF.settings && FF.settings.v.voice === 'on';
    }

    // emoji and decorations read terribly out loud
    function clean(text) {
        return String(text)
            .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '')   // surrogate-pair emoji
            .replace(/[←-⯿️‍]/g, '')      // symbols + variation selectors
            .replace(/\s+/g, ' ')
            .trim();
    }

    function say(text, force) {
        if (!enabled()) return;
        const msg = clean(text);
        if (!msg) return;
        const now = Date.now();
        // don't repeat the same line, and never talk over ourselves
        if (!force && msg === lastSaid && now - lastAt < 8000) return;
        lastSaid = msg;
        lastAt = now;
        try {
            window.speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(msg);
            if (voice) u.voice = voice;
            u.rate = 0.95;
            u.pitch = 1.1;
            u.volume = 0.9;
            window.speechSynthesis.speak(u);
        } catch (e) {}
    }

    function stop() {
        if (!supported) return;
        try { window.speechSynthesis.cancel(); } catch (e) {}
        lastSaid = '';
    }

    return { say, stop, get supported() { return supported; } };
})();
