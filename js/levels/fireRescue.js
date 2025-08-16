class FireRescueLevel {
    constructor(canvas, gameScreen) {
        this.canvas = canvas;
        this.gameScreen = gameScreen;
        this.ctx = canvas.getContext('2d');
        this.instructionText = gameScreen.querySelector('.instructions');
        this.titleElement = gameScreen.querySelector('.title');

        this.isSpraying = false;
        this.mouse = { x: 0, y: 0 };
        this.fires = [];
        this.waterParticles = [];
        this.buildings = [];
        this.gameState = 'START';
        this.firesExtinguished = 0;

        this.extinguishSynth = new Tone.Synth({ oscillator: { type: 'sine' }, envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.2 } }).toDestination();
        this.connectSynth = new Tone.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.1 } }).toDestination();
        this.whiteNoiseSynth = new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.005, decay: 0.1, sustain: 0 } }).toDestination();
        this.pinkNoiseSynth = new Tone.NoiseSynth({ noise: { type: 'pink' }, envelope: { attack: 0.005, decay: 0.1, sustain: 0 } }).toDestination();
        this.brownNoiseSynth = new Tone.NoiseSynth({ noise: { type: 'brown' }, envelope: { attack: 0.005, decay: 0.1, sustain: 0 } }).toDestination();
        this.currentWaterSynth = this.whiteNoiseSynth;

        this.fireTruck = this.createFireTruckObject();
        this.hydrant = this.createHydrantObject();

        this.initEventListeners();
    }

    start() {
        this.gameState = 'START';
        this.fires = [];
        this.waterParticles = [];
        this.firesExtinguished = 0;
        this.instructionText.textContent = 'Click the hose on the truck!';
        
        this.resizeCanvas();
        this.generateBuildings();

        activeGameIntervals.forEach(clearInterval);
        activeGameIntervals = [];
        let fireInterval = setInterval(() => this.spawnFire(), 4000);
        activeGameIntervals.push(fireInterval);

        this.gameLoop();
    }

    initEventListeners() {
        this.canvas.addEventListener('mousemove', (e) => this.handleInteraction(e));
        this.canvas.addEventListener('mousedown', (e) => this.handleInteraction(e));
        window.addEventListener('mouseup', () => { this.isSpraying = false; });
        this.canvas.addEventListener('touchmove', (e) => { e.preventDefault(); this.handleInteraction(e); }, { passive: false });
        this.canvas.addEventListener('touchstart', (e) => { e.preventDefault(); this.handleInteraction(e); }, { passive: false });
        window.addEventListener('touchend', () => { this.isSpraying = false; });
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    createFireTruckObject() {
        // ... (logic from main.js)
    }

    createHydrantObject() {
        // ... (logic from main.js)
    }

    spawnFire() {
        if (this.fires.length < 5 && this.buildings.length > 0) {
            const building = this.buildings[Math.floor(Math.random() * this.buildings.length)];
            const x = building.x + Math.random() * (building.width - 40) + 20;
            const y = building.y;
            this.fires.push(new Fire(x, y));
        }
    }
    
    handleInteraction(e) {
        const pos = this.getMousePos(e.touches ? e.touches[0] : e);
        this.mouse = pos;
        if (e.type === 'mousedown' || e.type === 'touchstart') {
            switch (this.gameState) {
                case 'START':
                    if (Math.hypot(pos.x - this.fireTruck.coiledHose.x, pos.y - this.fireTruck.coiledHose.y) < this.fireTruck.coiledHose.radius) {
                        this.gameState = 'HOSE_UNRAVELED';
                        this.instructionText.textContent = 'Click the black circle on the truck!';
                        this.connectSynth.triggerAttackRelease('C3', '8n');
                    }
                    break;
                // ... other cases
            }
        }
    }

    gameLoop() {
        this.ctx.fillStyle = currentScene.sky;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        manageSceneParticles(this.canvas, this.ctx);
        this.drawBuildings();
        this.drawGround();
        this.fireTruck.draw(this.ctx, this.gameState);
        this.hydrant.draw(this.ctx, this.gameState);
        this.drawHose();
        this.updateNozzleAngle();
        this.handleWater();
        this.handleFires();

        if (this.fires.length > 0) {
            this.titleElement.classList.add('pulsing');
        } else {
            this.titleElement.classList.remove('pulsing');
        }

        if (this.gameState !== 'WON' && this.fires.length === 0 && this.firesExtinguished > 0) {
            this.gameState = 'WON';
            showHeroReport(`Great job! You put out ${this.firesExtinguished} fires.`);
        }

        if (this.gameState !== 'WON') {
            window.fireGameAnimationId = requestAnimationFrame(() => this.gameLoop());
        }
    }
    
    // ... other methods like drawBuildings, handleWater, etc.
}

class Fire {
    // ... Fire class logic
}

class WaterParticle {
    // ... WaterParticle class logic
}

window.FireRescueLevel = FireRescueLevel;
