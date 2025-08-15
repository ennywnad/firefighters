// --- Global Navigation & Scene Management ---
const menuScreen = document.getElementById('menu-screen');
const sceneSelectScreen = document.getElementById('scene-select-screen');
const fireGameScreen = document.getElementById('fire-game-screen');
const animalRescueScreen = document.getElementById('animal-rescue-screen');
const muteButton = document.getElementById('mute-button');

muteButton.addEventListener('click', () => {
    toggleBackgroundMusic();
});

let activeGameIntervals = [];
let chosenLevel = null;

const scenes = {
    day: { sky: '#87CEEB', ground: '#2ECC71', building: '#bdc3c7', treeTrunk: '#8D6E63', treeLeaves: '#4CAF50', special: null },
    night: { sky: '#2c3e50', ground: '#27ae60', building: '#95a5a6', treeTrunk: '#6D4C41', treeLeaves: '#2c6b2f', special: 'stars' },
    autumn: { sky: '#d35400', ground: '#A1887F', building: '#bdc3c7', treeTrunk: '#8D6E63', treeLeaves: '#e67e22', special: 'leaves' },
    winter: { sky: '#a0d2eb', ground: '#ffffff', building: '#bdc3c7', treeTrunk: '#8D6E63', treeLeaves: '#e0f7fa', special: 'snow' }
};
let currentScene = scenes.day;
let sceneParticles = [];

document.querySelectorAll('.level-button').forEach(button => {
    button.addEventListener('click', () => {
        chosenLevel = button.dataset.level;
        menuScreen.classList.add('hidden');
        sceneSelectScreen.classList.remove('hidden');
    });
});

document.querySelectorAll('.scene-button').forEach(button => {
    button.addEventListener('click', () => {
        currentScene = scenes[button.dataset.scene];
        sceneSelectScreen.classList.add('hidden');
        if (chosenLevel === 'fire') {
            fireGameScreen.classList.remove('hidden');
            startFireGame();
        } else if (chosenLevel === 'animal') {
            animalRescueScreen.classList.remove('hidden');
            startAnimalRescueGame();
        }
        toggleBackgroundMusic(true);
    });
});

function goToMenu() {
    activeGameIntervals.forEach(clearInterval);
    activeGameIntervals = [];
    if (window.fireGameAnimationId) cancelAnimationFrame(window.fireGameAnimationId);
    if (window.animalRescueAnimationId) cancelAnimationFrame(window.animalRescueAnimationId);

    fireGameScreen.classList.add('hidden');
    animalRescueScreen.classList.add('hidden');
    sceneSelectScreen.classList.add('hidden');
    menuScreen.classList.remove('hidden');
    toggleBackgroundMusic(false);
}

function startAudio() {
    if (Tone.context.state !== 'running') {
        Tone.start();
    }
    if (!backgroundMusic) {
        setupBackgroundMusic();
    }
    window.removeEventListener('click', startAudio, true);
}
window.addEventListener('click', startAudio, true);

// --- Background Music ---
let backgroundMusic = null;
let musicPlaying = false;

function setupBackgroundMusic() {
    const musicSynth = new Tone.FMSynth({
        harmonicity: 1.5,
        modulationIndex: 10,
        oscillator: { type: "sine" },
        envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.5 },
        modulation: { type: "square" },
        modulationEnvelope: { attack: 0.01, decay: 0.5, sustain: 0, release: 0.5 }
    }).toDestination();
    musicSynth.volume.value = -12; // Lower the volume

    const melody = ['C4', 'E4', 'G4', 'C5', 'A4', 'G4', 'E4'];
    let noteIndex = 0;

    backgroundMusic = new Tone.Loop(time => {
        let note = melody[noteIndex % melody.length];
        musicSynth.triggerAttackRelease(note, '8n', time);
        noteIndex++;
    }, '4n');

    Tone.Transport.start();
}

function toggleBackgroundMusic(forceState) {
    const shouldBePlaying = forceState !== undefined ? forceState : !musicPlaying;
    if (shouldBePlaying) {
        if (!musicPlaying) {
            backgroundMusic.start(0);
            musicPlaying = true;
        }
    } else {
        if (musicPlaying) {
            backgroundMusic.stop();
            musicPlaying = false;
        }
    }
    muteButton.textContent = musicPlaying ? '🎵' : '🔇';
}

// --- Scene Particle Effects ---
class SceneParticle {
    constructor(canvas, type) {
        this.canvas = canvas;
        this.x = Math.random() * this.canvas.width;
        this.y = Math.random() * this.canvas.height;
        this.type = type;
        if (type === 'stars') {
            this.size = Math.random() * 2;
            this.opacity = Math.random();
        } else { // snow or leaves
            this.y = -10;
            this.size = Math.random() * 5 + 2;
            this.speedX = Math.random() * 2 - 1;
            this.speedY = Math.random() * 2 + 1;
        }
    }
    update() {
        if (this.type !== 'stars') {
            this.x += this.speedX;
            this.y += this.speedY;
            if (this.y > this.canvas.height) {
                this.y = -10;
                this.x = Math.random() * this.canvas.width;
            }
        }
    }
    draw(ctx) {
        if (this.type === 'stars') {
            ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.type === 'snow') {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.type === 'leaves') {
            ctx.fillStyle = '#c0392b';
            ctx.fillRect(this.x, this.y, this.size, this.size);
        }
    }
}

function manageSceneParticles(canvas, ctx) {
    if (currentScene.special && sceneParticles.length < 50 && Math.random() < 0.5) {
        sceneParticles.push(new SceneParticle(canvas, currentScene.special));
    }
    sceneParticles.forEach((p, index) => {
        p.update();
        p.draw(ctx);
        if (p.y > canvas.height + 20) sceneParticles.splice(index, 1);
    });
}

// --- Fire Game (Level 1) Code ---
function startFireGame() {
    const canvas = document.getElementById('fireGameCanvas');
    const ctx = canvas.getContext('2d');
    const instructionText = document.getElementById('fire-game-instructions');
    const titleElement = document.getElementById('fire-game-title');

    let isSpraying, mouse, fires, waterParticles, buildings, gameState;
    let currentWaterSynth;

    const extinguishSynth = new Tone.Synth({ oscillator: { type: 'sine' }, envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.2 } }).toDestination();
    const connectSynth = new Tone.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.1 } }).toDestination();
    const whiteNoiseSynth = new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.005, decay: 0.1, sustain: 0 } }).toDestination();
    const pinkNoiseSynth = new Tone.NoiseSynth({ noise: { type: 'pink' }, envelope: { attack: 0.005, decay: 0.1, sustain: 0 } }).toDestination();
    const brownNoiseSynth = new Tone.NoiseSynth({ noise: { type: 'brown' }, envelope: { attack: 0.005, decay: 0.1, sustain: 0 } }).toDestination();

    let fireTruck, hydrant;

    function init() {
        isSpraying = false;
        mouse = { x: 0, y: 0 };
        fires = [];
        waterParticles = [];
        buildings = [];
        sceneParticles = [];
        gameState = 'START';
        currentWaterSynth = whiteNoiseSynth;
        document.getElementById('sound-select').value = 'white';
        instructionText.textContent = 'Click the hose on the truck!';

        fireTruck = createFireTruckObject();
        hydrant = createHydrantObject();

        resizeCanvas();

        activeGameIntervals.forEach(clearInterval);
        activeGameIntervals = [];

        let fireInterval = setInterval(spawnFire, 4000);
        activeGameIntervals.push(fireInterval);

        gameLoop();
    }

    function createFireTruckObject() { /* ... same as before ... */ return { x: 0, y: 0, width: 120, height: 70, nozzle: { angle: -Math.PI / 4, length: 60, width: 15, x: 0, y: 0 }, coiledHose: { x: 0, y: 0, radius: 20 }, port: { x: 0, y: 0, radius: 10 }, draw() { this.x = canvas.width / 2 - this.width / 2; this.y = canvas.height - this.height - 40; ctx.fillStyle = '#e74c3c'; ctx.beginPath(); ctx.roundRect(this.x, this.y, this.width, this.height, 10); ctx.fill(); ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.roundRect(this.x + this.width * 0.6, this.y - 30, this.width * 0.4, 40, [10, 0, 0, 0]); ctx.fill(); ctx.fillStyle = '#87CEEB'; ctx.beginPath(); ctx.fillRect(this.x + this.width * 0.65, this.y - 25, this.width * 0.3, 20); ctx.fill(); ctx.fillStyle = '#333'; ctx.beginPath(); ctx.arc(this.x + 25, this.y + this.height, 18, 0, Math.PI * 2); ctx.arc(this.x + this.width - 25, this.y + this.height, 18, 0, Math.PI * 2); ctx.fill(); this.coiledHose.x = this.x + 35; this.coiledHose.y = this.y + 35; this.port.x = this.x + this.width - 15; this.port.y = this.y + this.height / 2; if (gameState === 'START') { ctx.fillStyle = '#f1c40f'; ctx.beginPath(); ctx.arc(this.coiledHose.x, this.coiledHose.y, this.coiledHose.radius, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#e67e22'; ctx.beginPath(); ctx.arc(this.coiledHose.x, this.coiledHose.y, this.coiledHose.radius * 0.7, 0, Math.PI * 2); ctx.fill(); drawHighlight(this.coiledHose.x, this.coiledHose.y, this.coiledHose.radius); } ctx.fillStyle = 'black'; ctx.beginPath(); ctx.arc(this.port.x, this.port.y, this.port.radius, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#555'; ctx.beginPath(); ctx.arc(this.port.x, this.port.y, this.port.radius * 0.6, 0, Math.PI * 2); ctx.fill(); if (gameState === 'HOSE_UNRAVELED') { drawHighlight(this.port.x, this.port.y, this.port.radius); } this.nozzle.x = this.x + this.width / 2; this.nozzle.y = this.y - 10; ctx.fillStyle = '#7f8c8d'; ctx.beginPath(); ctx.arc(this.nozzle.x, this.nozzle.y, 10, 0, Math.PI * 2); ctx.fill(); if (gameState === 'SPRAYING') { ctx.save(); ctx.translate(this.nozzle.x, this.nozzle.y); ctx.rotate(this.nozzle.angle); ctx.fillStyle = '#95a5a6'; ctx.beginPath(); ctx.roundRect(0, -this.nozzle.width / 2, this.nozzle.length, this.nozzle.width, 5); ctx.fill(); ctx.restore(); } } }; }
    function createHydrantObject() { /* ... same as before ... */ return { x: 0, y: 0, port: { x: 0, y: 0, radius: 12 }, valve: { x: 0, y: 0, width: 40, height: 10 }, draw() { this.x = fireTruck.x - 80; this.y = canvas.height - 80; this.port.x = this.x; this.port.y = this.y + 20; this.valve.x = this.x - this.valve.width / 2; this.valve.y = this.y - 25; ctx.fillStyle = '#e74c3c'; ctx.beginPath(); ctx.roundRect(this.x - 20, this.y, 40, 60, 5); ctx.fill(); ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.arc(this.x, this.y, 25, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'black'; ctx.beginPath(); ctx.arc(this.port.x, this.port.y, this.port.radius, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#555'; ctx.beginPath(); ctx.arc(this.port.x, this.port.y, this.port.radius * 0.6, 0, Math.PI * 2); ctx.fill(); if (gameState === 'TRUCK_CONNECTED') { drawHighlight(this.port.x, this.port.y, this.port.radius); } ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.roundRect(this.valve.x, this.valve.y, this.valve.width, this.valve.height, 3); ctx.fill(); if (gameState === 'HYDRANT_CONNECTED') { drawHighlight(this.valve.x + this.valve.width/2, this.valve.y + this.valve.height/2, this.valve.width/2); } } }; }
    class WaterParticle { constructor(x, y, angle) { this.x = x; this.y = y; this.size = Math.random() * 5 + 5; this.speed = Math.random() * 5 + 8; this.vx = Math.cos(angle) * this.speed; this.vy = Math.sin(angle) * this.speed; this.gravity = 0.1; } update() { this.x += this.vx; this.y += this.vy; this.vy += this.gravity; } draw() { ctx.fillStyle = 'rgba(52, 152, 219, 0.8)'; ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill(); } }
    class Fire { constructor(x, y) { this.x = x; this.y = y; this.baseWidth = Math.random() * 20 + 20; this.width = this.baseWidth; this.height = this.width * 2; this.life = 100; this.flicker = Math.random() * 10; } update() { this.flicker += 0.1; this.width = this.baseWidth + Math.sin(this.flicker) * 5; this.height = this.width * (Math.random() * 0.5 + 1.8); } draw() { ctx.save(); ctx.translate(this.x, this.y); const opacity = this.life / 100; ctx.fillStyle = `rgba(255, 165, 0, ${0.7 * opacity})`; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(this.width * 0.7, -this.height * 0.5, 0, -this.height); ctx.quadraticCurveTo(-this.width * 0.7, -this.height * 0.5, 0, 0); ctx.fill(); ctx.fillStyle = `rgba(255, 255, 0, ${0.9 * opacity})`; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(this.width * 0.4, -this.height * 0.4, 0, -this.height * 0.8); ctx.quadraticCurveTo(-this.width * 0.4, -this.height * 0.4, 0, 0); ctx.fill(); ctx.restore(); } }

    function drawHighlight(x, y, baseRadius) { const pulse = Math.abs(Math.sin(Date.now() * 0.005)) * 5; ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, baseRadius + pulse, 0, Math.PI * 2); ctx.stroke(); }
    function generateBuildings() { buildings = []; let currentX = -50; while(currentX < canvas.width + 50) { const width = Math.random() * 100 + 80; const height = Math.random() * (canvas.height / 2) + (canvas.height / 4); const building = { x: currentX, y: canvas.height - height, width, height, windows: [] }; for (let y = building.y + 10; y < canvas.height - 20; y += 30) { for (let x = building.x + 10; x < building.x + width - 10; x += 30) { building.windows.push({ x, y, lit: Math.random() > 0.3 }); } } buildings.push(building); currentX += width + 10; } }
    function drawBuildings() { buildings.forEach(b => { ctx.fillStyle = currentScene.building; ctx.fillRect(b.x, b.y, b.width, b.height); const windowColor = currentScene.special === 'night' ? '#f1c40f' : '#34495e'; b.windows.forEach(w => { ctx.fillStyle = w.lit ? windowColor : '#34495e'; ctx.fillRect(w.x, w.y, 15, 15); }); }); }
    function drawGround() { ctx.fillStyle = '#7f8c8d'; ctx.fillRect(0, canvas.height - 40, canvas.width, 40); }
    function spawnFire() { if (fires.length < 5 && buildings.length > 0) { const building = buildings[Math.floor(Math.random() * buildings.length)]; const x = building.x + Math.random() * (building.width - 40) + 20; const y = building.y; fires.push(new Fire(x, y)); } }
    function drawHose() { ctx.strokeStyle = '#f1c40f'; ctx.lineWidth = 10; ctx.beginPath(); if (gameState === 'TRUCK_CONNECTED') { ctx.moveTo(fireTruck.port.x, fireTruck.port.y); ctx.quadraticCurveTo((fireTruck.port.x + mouse.x) / 2, mouse.y - 50, mouse.x, mouse.y); } else if (gameState === 'HYDRANT_CONNECTED' || gameState === 'SPRAYING') { ctx.moveTo(fireTruck.port.x, fireTruck.port.y); const controlY = Math.min(fireTruck.port.y, hydrant.port.y) + 100; ctx.quadraticCurveTo((fireTruck.port.x + hydrant.port.x) / 2, controlY, hydrant.port.x, hydrant.port.y); } ctx.stroke(); }
    function handleWater() { if (isSpraying && gameState === 'SPRAYING') { const nozzleEndX = fireTruck.nozzle.x + Math.cos(fireTruck.nozzle.angle) * fireTruck.nozzle.length; const nozzleEndY = fireTruck.nozzle.y + Math.sin(fireTruck.nozzle.angle) * fireTruck.nozzle.length; for(let i = 0; i < 3; i++) { waterParticles.push(new WaterParticle(nozzleEndX, nozzleEndY, fireTruck.nozzle.angle)); } if (Tone.context.state === 'running' && currentWaterSynth) { currentWaterSynth.triggerAttack(); } } waterParticles.forEach((p, index) => { p.update(); p.draw(); if (p.y > canvas.height || p.x < 0 || p.x > canvas.width) { waterParticles.splice(index, 1); } }); }
    function handleFires() { fires.forEach((fire, fireIndex) => { fire.update(); fire.draw(); waterParticles.forEach((particle, particleIndex) => { const dist = Math.hypot(particle.x - fire.x, (particle.y - (fire.y - fire.height/2))); if (dist < fire.width + particle.size) { waterParticles.splice(particleIndex, 1); fire.life -= 5; } }); if (fire.life <= 0) { if (Tone.context.state === 'running') { extinguishSynth.triggerAttackRelease('C4', '8n'); } fires.splice(fireIndex, 1); } }); }
    function updateNozzleAngle() { if (gameState !== 'SPRAYING') return; const dx = mouse.x - fireTruck.nozzle.x; const dy = mouse.y - fireTruck.nozzle.y; fireTruck.nozzle.angle = Math.atan2(dy, dx); }
    function getMousePos(evt) { const rect = canvas.getBoundingClientRect(); return { x: evt.clientX - rect.left, y: evt.clientY - rect.top }; }
    function handleInteraction(e) { const pos = getMousePos(e.touches ? e.touches[0] : e); mouse = pos; if (e.type === 'mousedown' || e.type === 'touchstart') { switch(gameState) { case 'START': if (Math.hypot(pos.x - fireTruck.coiledHose.x, pos.y - fireTruck.coiledHose.y) < fireTruck.coiledHose.radius) { gameState = 'HOSE_UNRAVELED'; instructionText.textContent = 'Click the black circle on the truck!'; connectSynth.triggerAttackRelease('C3', '8n'); } break; case 'HOSE_UNRAVELED': if (Math.hypot(pos.x - fireTruck.port.x, pos.y - fireTruck.port.y) < fireTruck.port.radius) { gameState = 'TRUCK_CONNECTED'; instructionText.textContent = 'Drag the hose to the hydrant!'; connectSynth.triggerAttackRelease('E3', '8n'); } break; case 'TRUCK_CONNECTED': if (Math.hypot(pos.x - hydrant.port.x, pos.y - hydrant.port.y) < hydrant.port.radius) { gameState = 'HYDRANT_CONNECTED'; instructionText.textContent = 'Turn the red valve on the hydrant!'; connectSynth.triggerAttackRelease('G3', '8n'); } break; case 'HYDRANT_CONNECTED': const v = hydrant.valve; if (pos.x > v.x && pos.x < v.x + v.width && pos.y > v.y && pos.y < v.y + v.height) { gameState = 'SPRAYING'; instructionText.textContent = 'Aim the nozzle and spray!'; connectSynth.triggerAttackRelease('C4', '8n'); } break; case 'SPRAYING': isSpraying = true; break; } } }

    function gameLoop() {
        ctx.fillStyle = currentScene.sky;
        ctx.fillRect(0,0,canvas.width, canvas.height);
        manageSceneParticles(canvas, ctx);
        drawBuildings(); drawGround();
        fireTruck.draw(); hydrant.draw(); drawHose();
        updateNozzleAngle(); handleWater(); handleFires();
        if (fires.length > 0) { titleElement.classList.add('pulsing'); } else { titleElement.classList.remove('pulsing'); }
        window.fireGameAnimationId = requestAnimationFrame(gameLoop);
    }

    function resizeCanvas() {
        canvas.width = fireGameScreen.clientWidth;
        canvas.height = fireGameScreen.clientHeight;
        generateBuildings();
    }
    window.addEventListener('resize', resizeCanvas);

    document.getElementById('sound-select').onchange = (e) => {
        switch(e.target.value) {
            case 'white': currentWaterSynth = whiteNoiseSynth; break;
            case 'pink': currentWaterSynth = pinkNoiseSynth; break;
            case 'brown': currentWaterSynth = brownNoiseSynth; break;
            case 'disable': currentWaterSynth = null; break;
        }
    };

    canvas.addEventListener('mousemove', handleInteraction); canvas.addEventListener('mousedown', handleInteraction);
    window.addEventListener('mouseup', () => { isSpraying = false; });
    canvas.addEventListener('touchmove', (e) => { e.preventDefault(); handleInteraction(e); }, { passive: false });
    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); handleInteraction(e); }, { passive: false });
    window.addEventListener('touchend', () => { isSpraying = false; });

    init();
}

// --- Animal Rescue (Level 2) Code ---
function startAnimalRescueGame() {
    const canvas = document.getElementById('animalRescueCanvas');
    const ctx = canvas.getContext('2d');
    const instructionText = document.getElementById('animal-rescue-instructions');
    const animalMenu = document.getElementById('animal-select-menu');

    let mouse, gameState, selectedAnimal, animalPosition, conePosition, ladder, firefighter, tree;
    const actionSynth = new Tone.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.1 } }).toDestination();
    const animalSynth = new Tone.Synth().toDestination();

    function init() {
        mouse = { x: 0, y: 0 };
        gameState = 'SELECT_ANIMAL';
        selectedAnimal = { type: 'kitty', emoji: '🐱', sound: 'C5' };
        animalPosition = { x: 0, y: 0 };
        conePosition = null;
        ladder = { startX: 0, startY: 0, endX: 0, endY: 0, currentLength: 0, maxLength: 0, angle: 0 };
        firefighter = { x: 0, y: 0, progress: 0, hasAnimal: false };
        tree = createTreeObject();
        sceneParticles = [];
        instructionText.textContent = 'Choose an animal to rescue!';
        animalMenu.style.display = 'flex';
        resizeCanvas();
        gameLoop();
    }

    function createTreeObject() { return { x: 150, y: 0, draw() { this.y = canvas.height; ctx.fillStyle = currentScene.treeTrunk; ctx.fillRect(this.x - 30, this.y - 300, 60, 300); ctx.fillStyle = currentScene.treeLeaves; ctx.beginPath(); ctx.arc(this.x, this.y - 350, 150, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(this.x - 80, this.y - 250, 100, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(this.x + 70, this.y - 280, 120, 0, Math.PI * 2); ctx.fill(); } }; }
    function createFireTruckObject() { return { x: 0, y: 0, width: 120, height: 70, coneButton: { x: 0, y: 0, radius: 15 }, ladderButton: { x: 0, y: 0, radius: 15 }, draw() { this.x = tree.x + 80; this.y = canvas.height - this.height - 40; ctx.fillStyle = '#e74c3c'; ctx.beginPath(); ctx.roundRect(this.x, this.y, this.width, this.height, 10); ctx.fill(); ctx.fillStyle = '#333'; ctx.beginPath(); ctx.arc(this.x + 25, this.y + this.height, 18, 0, Math.PI * 2); ctx.arc(this.x + this.width - 25, this.y + this.height, 18, 0, Math.PI * 2); ctx.fill(); this.coneButton.x = this.x + 30; this.coneButton.y = this.y + 35; this.ladderButton.x = this.x + this.width - 30; this.ladderButton.y = this.y + 35; ctx.fillStyle = '#f39c12'; ctx.beginPath(); ctx.arc(this.coneButton.x, this.coneButton.y, this.coneButton.radius, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'white'; ctx.font = '20px Bangers'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('V', this.coneButton.x, this.coneButton.y + 2); ctx.fillStyle = '#7f8c8d'; ctx.beginPath(); ctx.arc(this.ladderButton.x, this.ladderButton.y, this.ladderButton.radius, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'white'; ctx.fillText('|||', this.ladderButton.x, this.ladderButton.y); if (gameState === 'START') highlight(this.coneButton.x, this.coneButton.y, this.coneButton.radius); if (gameState === 'CONE_PLACED') highlight(this.ladderButton.x, this.ladderButton.y, this.ladderButton.radius); } }; }
    let fireTruckRescue = createFireTruckObject();

    function drawScene() {
        ctx.fillStyle = currentScene.sky; ctx.fillRect(0, 0, canvas.width, canvas.height);
        manageSceneParticles(canvas, ctx);
        ctx.fillStyle = currentScene.ground; ctx.fillRect(0, canvas.height - 40, canvas.width, 40);
        tree.draw();
        fireTruckRescue.draw();
        if (gameState !== 'SELECT_ANIMAL' && !firefighter.hasAnimal) { ctx.font = '40px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(selectedAnimal.emoji, animalPosition.x, animalPosition.y); }
        if (gameState === 'AT_ANIMAL') highlight(animalPosition.x, animalPosition.y, 30);
        if (conePosition) { ctx.fillStyle = '#f39c12'; ctx.beginPath(); ctx.moveTo(conePosition.x, conePosition.y - 40); ctx.lineTo(conePosition.x - 15, conePosition.y); ctx.lineTo(conePosition.x + 15, conePosition.y); ctx.closePath(); ctx.fill(); }
        if (gameState !== 'SELECT_ANIMAL' && gameState !== 'START' && gameState !== 'CONE_PLACED') { ctx.save(); ctx.translate(ladder.startX, ladder.startY); ctx.rotate(ladder.angle); ctx.fillStyle = '#bdc3c7'; ctx.fillRect(0, -5, ladder.currentLength, 10); ctx.fillStyle = '#7f8c8d'; for (let i = 20; i < ladder.currentLength - 10; i += 20) { ctx.fillRect(i, -8, 2, 16); } ctx.restore(); if (gameState === 'LADDER_EXTENDED') { ctx.save(); ctx.translate(ladder.startX, ladder.startY); ctx.rotate(ladder.angle); const pulse = Math.abs(Math.sin(Date.now() * 0.005)) * 8; ctx.fillStyle = `rgba(255, 255, 0, 0.4)`; ctx.fillRect(0, -10 - pulse / 2, ladder.currentLength, 20 + pulse); ctx.restore(); } }
        if (gameState === 'CLIMBING' || gameState === 'AT_ANIMAL' || gameState === 'DESCENDING' || gameState === 'RESCUED') { const onLadderX = ladder.startX + Math.cos(ladder.angle) * firefighter.progress; const onLadderY = ladder.startY + Math.sin(ladder.angle) * firefighter.progress; firefighter.x = onLadderX; firefighter.y = onLadderY; ctx.fillStyle = '#e74c3c'; ctx.beginPath(); ctx.arc(firefighter.x, firefighter.y, 15, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#f1c40f'; ctx.beginPath(); ctx.arc(firefighter.x, firefighter.y-15, 10, 0, Math.PI*2); ctx.fill(); if (firefighter.hasAnimal) { ctx.font = '20px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(selectedAnimal.emoji, firefighter.x + 10, firefighter.y - 10); } }
    }
    function highlight(x, y, radius) { const pulse = Math.abs(Math.sin(Date.now() * 0.005)) * 5; ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, radius + pulse, 0, Math.PI * 2); ctx.stroke(); }
    function update() { if (gameState === 'LADDER_EXTENDING') { if (ladder.currentLength < ladder.maxLength) { ladder.currentLength += 5; } else { ladder.currentLength = ladder.maxLength; gameState = 'LADDER_EXTENDED'; instructionText.textContent = 'Click the ladder to climb!'; } } if (gameState === 'CLIMBING') { if (firefighter.progress < ladder.maxLength) { firefighter.progress += 2; } else { firefighter.progress = ladder.maxLength; gameState = 'AT_ANIMAL'; instructionText.textContent = `Click the ${selectedAnimal.type} to rescue it!`; } } if (gameState === 'DESCENDING') { if (firefighter.progress > 0) { firefighter.progress -= 2; } else { firefighter.progress = 0; gameState = 'RESCUED'; instructionText.textContent = 'Great job! Animal saved!'; animalSynth.triggerAttackRelease(selectedAnimal.sound, '4n'); } } }
    function isClickOnLadder(pos) { const translatedX = pos.x - ladder.startX; const translatedY = pos.y - ladder.startY; const rotatedX = translatedX * Math.cos(-ladder.angle) - translatedY * Math.sin(-ladder.angle); const rotatedY = translatedX * Math.sin(-ladder.angle) + translatedY * Math.cos(-ladder.angle); return (rotatedX >= 0 && rotatedX <= ladder.maxLength && rotatedY >= -15 && rotatedY <= 15); }
    function handleInteraction(e) { const pos = { x: e.offsetX, y: e.offsetY }; if (e.type === 'mousedown') { switch(gameState) { case 'START': if (Math.hypot(pos.x - fireTruckRescue.coneButton.x, pos.y - fireTruckRescue.coneButton.y) < fireTruckRescue.coneButton.radius) { conePosition = { x: fireTruckRescue.x - 50, y: canvas.height - 40 }; gameState = 'CONE_PLACED'; instructionText.textContent = 'Click the ladder button!'; actionSynth.triggerAttackRelease('C3', '8n'); } break; case 'CONE_PLACED': if (Math.hypot(pos.x - fireTruckRescue.ladderButton.x, pos.y - fireTruckRescue.ladderButton.y) < fireTruckRescue.ladderButton.radius) { ladder.startX = fireTruckRescue.x; ladder.startY = fireTruckRescue.y; ladder.endX = animalPosition.x; ladder.endY = animalPosition.y; const dx = ladder.endX - ladder.startX; const dy = ladder.endY - ladder.startY; ladder.angle = Math.atan2(dy, dx); ladder.maxLength = Math.hypot(dx, dy); gameState = 'LADDER_EXTENDING'; instructionText.textContent = 'Extending ladder...'; actionSynth.triggerAttackRelease('E3', '2n'); } break; case 'LADDER_EXTENDED': if (isClickOnLadder(pos)) { gameState = 'CLIMBING'; instructionText.textContent = 'Climbing up!'; } break; case 'AT_ANIMAL': if (Math.hypot(pos.x - animalPosition.x, pos.y - animalPosition.y) < 30) { firefighter.hasAnimal = true; gameState = 'DESCENDING'; instructionText.textContent = 'Coming down!'; actionSynth.triggerAttackRelease('G3', '8n'); } break; } } }

    function gameLoop() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawScene();
        update();
        window.animalRescueAnimationId = requestAnimationFrame(gameLoop);
    }

    function resizeCanvas() {
        canvas.width = animalRescueScreen.clientWidth;
        canvas.height = animalRescueScreen.clientHeight;
    }
    window.addEventListener('resize', resizeCanvas);

    animalMenu.onclick = (e) => {
        if (e.target.classList.contains('animal-option')) {
            const animalType = e.target.dataset.animal;
            if (animalType === 'kitty') selectedAnimal = { type: 'kitty', emoji: '🐱', sound: 'A5' };
            if (animalType === 'bird') selectedAnimal = { type: 'bird', emoji: '🐦', sound: 'C6' };
            if (animalType === 'squirrel') selectedAnimal = { type: 'squirrel', emoji: '🐿️', sound: 'E5' };
            animalMenu.style.display = 'none';
            startGame();
        }
    };

    function startGame() {
        gameState = 'START';
        instructionText.textContent = 'Click the cone button on the truck!';
        animalPosition.x = tree.x + Math.random() * 60 - 30;
        animalPosition.y = canvas.height - 250 - Math.random() * 80;
        fireTruckRescue = createFireTruckObject();
    }

    canvas.addEventListener('mousedown', handleInteraction);

    init();
}
