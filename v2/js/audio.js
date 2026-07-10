// --- Sound: small WebAudio synth, no dependencies ---
window.FF = window.FF || {};

FF.audio = (function () {
    let ctx = null;
    let master = null;
    let muted = false;
    let siren = null;
    let sprayNode = null;
    let noiseBuf = null;

    function ensure() {
        if (ctx) {
            if (ctx.state === 'suspended') ctx.resume();
            return true;
        }
        try {
            ctx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) { return false; }
        master = ctx.createGain();
        master.gain.value = muted ? 0 : 0.5;
        master.connect(ctx.destination);

        // shared noise buffer
        const len = ctx.sampleRate;
        noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
        const data = noiseBuf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
        return true;
    }

    function setMuted(m) {
        muted = m;
        if (master) master.gain.value = m ? 0 : 0.5;
    }

    function beep(freq, dur, type, vol, when) {
        if (!ensure()) return;
        const t0 = ctx.currentTime + (when || 0);
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = type || 'square';
        o.frequency.value = freq;
        g.gain.setValueAtTime(vol || 0.15, t0);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
        o.connect(g); g.connect(master);
        o.start(t0); o.stop(t0 + dur + 0.05);
    }

    function tap() { beep(660, 0.08, 'square', 0.12); }

    function sirenStart() {
        if (!ensure() || siren) return;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        const lfo = ctx.createOscillator();
        const lfoG = ctx.createGain();
        o.type = 'triangle';
        o.frequency.value = 700;
        lfo.type = 'square';
        lfo.frequency.value = 2.2;
        lfoG.gain.value = 160;
        lfo.connect(lfoG); lfoG.connect(o.frequency);
        g.gain.value = 0.08;
        o.connect(g); g.connect(master);
        o.start(); lfo.start();
        siren = { o, g, lfo };
    }

    function sirenStop() {
        if (!siren) return;
        const t0 = ctx.currentTime;
        siren.g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.3);
        const s = siren;
        setTimeout(() => { s.o.stop(); s.lfo.stop(); }, 400);
        siren = null;
    }

    function airBrake() {
        if (!ensure()) return;
        const src = ctx.createBufferSource();
        src.buffer = noiseBuf;
        const f = ctx.createBiquadFilter();
        f.type = 'highpass'; f.frequency.value = 2500;
        const g = ctx.createGain();
        const t0 = ctx.currentTime;
        g.gain.setValueAtTime(0.15, t0);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.35);
        src.connect(f); f.connect(g); g.connect(master);
        src.start(t0); src.stop(t0 + 0.4);
    }

    function ratchet() {
        for (let i = 0; i < 6; i++) beep(300 + i * 60, 0.04, 'square', 0.06, i * 0.09);
    }

    function sprayStart() {
        if (!ensure() || sprayNode) return;
        const src = ctx.createBufferSource();
        src.buffer = noiseBuf;
        src.loop = true;
        const f = ctx.createBiquadFilter();
        f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 0.7;
        const g = ctx.createGain();
        g.gain.value = 0.1;
        src.connect(f); f.connect(g); g.connect(master);
        src.start();
        sprayNode = { src, g };
    }

    function sprayStop() {
        if (!sprayNode) return;
        const t0 = ctx.currentTime;
        sprayNode.g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.2);
        const s = sprayNode;
        setTimeout(() => s.src.stop(), 300);
        sprayNode = null;
    }

    function saveChime() {
        [523, 659, 784, 1046].forEach((f, i) => beep(f, 0.18, 'triangle', 0.14, i * 0.09));
    }

    function fanfare() {
        const seq = [523, 523, 659, 784, 659, 784, 1046, 1046];
        seq.forEach((f, i) => beep(f, 0.22, 'triangle', 0.15, i * 0.14));
    }

    function stopAll() {
        sirenStop();
        sprayStop();
    }

    return {
        ensure, setMuted, tap, sirenStart, sirenStop, airBrake,
        ratchet, sprayStart, sprayStop, saveChime, fanfare, stopAll,
        get muted() { return muted; }
    };
})();
