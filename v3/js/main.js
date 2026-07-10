// --- Boot, letterboxed hi-res canvas, main loop, input ---
window.FF = window.FF || {};

(function () {
    const canvas = document.getElementById('game');
    const stage = document.getElementById('stage');
    const ctx = canvas.getContext('2d');

    let view = 1;   // device px per world unit

    function resize() {
        const vw = window.innerWidth, vh = window.innerHeight;
        const scale = Math.min(vw / FF.W, vh / FF.H);
        const w = Math.floor(FF.W * scale), h = Math.floor(FF.H * scale);
        stage.style.width = w + 'px';
        stage.style.height = h + 'px';
        stage.style.left = Math.floor((vw - w) / 2) + 'px';
        stage.style.top = Math.floor((vh - h) / 2) + 'px';

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        view = canvas.width / FF.W;
    }
    window.addEventListener('resize', resize);
    resize();

    // input: pointer -> internal world coords
    function toInternal(e) {
        const r = canvas.getBoundingClientRect();
        return {
            x: (e.clientX - r.left) * (FF.W / r.width),
            y: (e.clientY - r.top) * (FF.H / r.height)
        };
    }
    canvas.addEventListener('pointerdown', (e) => {
        canvas.setPointerCapture(e.pointerId);
        const p = toInternal(e);
        FF.game.pointerDown(p.x, p.y);
    });
    canvas.addEventListener('pointermove', (e) => {
        const p = toInternal(e);
        FF.game.pointerMove(p.x, p.y);
    });
    ['pointerup', 'pointercancel'].forEach(ev =>
        canvas.addEventListener(ev, () => FF.game.pointerUp())
    );

    // HUD buttons
    const muteBtn = document.getElementById('mute');
    muteBtn.addEventListener('click', () => {
        FF.audio.ensure();
        FF.audio.setMuted(!FF.audio.muted);
        muteBtn.innerHTML = FF.audio.muted ? '&#128263;' : '&#128266;';
    });

    document.getElementById('replay').addEventListener('click', () => {
        FF.game.reset();
    });

    // settings menu: pause while open, resume sounds on close
    let paused = false;
    FF.settings.buildMenu();
    FF.settings.onOpenChange = (open) => {
        paused = open;
        if (open) {
            FF.game.pointerUp();
            FF.audio.stopAll();
        } else {
            if (FF.truck.state === 'SPRAY') FF.audio.sprayStart();
            if (FF.truck.state === 'DRIVING') FF.audio.sirenStart();
        }
    };

    FF.game.init();

    // main loop
    let last = performance.now();
    function frame(now) {
        let dt = now - last;
        last = now;
        if (dt < 0) dt = 0;       // rAF timestamp can precede boot-time performance.now()
        if (dt > 100) dt = 100;   // tab-switch clamp

        if (!paused) FF.game.update(dt, now);

        ctx.setTransform(view, 0, 0, view, 0, 0);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        const off = FF.game.shakeOffset();
        ctx.save();
        ctx.translate(off.x, off.y);
        FF.scene.draw(ctx, now);
        FF.truck.draw(ctx);
        FF.particles.draw(ctx);
        FF.game.draw(ctx, now);
        ctx.restore();

        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
})();
