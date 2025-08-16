class AnimalRescueLevel {
    constructor(canvas, gameScreen) {
        this.canvas = canvas;
        this.gameScreen = gameScreen;
        this.ctx = canvas.getContext('2d');
        this.instructionText = gameScreen.querySelector('.instructions');
        this.animalMenu = document.getElementById('animal-select-menu');

        this.mouse = { x: 0, y: 0 };
        this.gameState = 'SELECT_ANIMAL';
        this.selectedAnimal = { type: 'kitty', emoji: '🐱', sound: 'C5' };
        this.animalPosition = { x: 0, y: 0 };
        this.conePosition = null;
        this.ladder = { startX: 0, startY: 0, endX: 0, endY: 0, currentLength: 0, maxLength: 0, angle: 0 };
        this.firefighter = { x: 0, y: 0, progress: 0, hasAnimal: false };
        
        this.actionSynth = new Tone.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.1 } }).toDestination();
        this.animalSynth = new Tone.Synth().toDestination();

        this.tree = this.createTreeObject();
        this.fireTruckRescue = this.createFireTruckObject();

        this.initEventListeners();
    }

    start() {
        this.gameState = 'SELECT_ANIMAL';
        this.instructionText.textContent = 'Choose an animal to rescue!';
        this.animalMenu.style.display = 'flex';
        this.conePosition = null;
        this.firefighter = { x: 0, y: 0, progress: 0, hasAnimal: false };
        this.ladder.currentLength = 0;
        sceneParticles = [];
        this.resizeCanvas();
        this.gameLoop();
    }

    initEventListeners() {
        this.animalMenu.onclick = (e) => {
            if (e.target.classList.contains('animal-option')) {
                const animalType = e.target.dataset.animal;
                if (animalType === 'kitty') this.selectedAnimal = { type: 'kitty', emoji: '🐱', sound: 'A5' };
                if (animalType === 'bird') this.selectedAnimal = { type: 'bird', emoji: '🐦', sound: 'C6' };
                if (animalType === 'squirrel') this.selectedAnimal = { type: 'squirrel', emoji: '🐿️', sound: 'E5' };
                this.animalMenu.style.display = 'none';
                this.startGame();
            }
        };
        this.canvas.addEventListener('mousedown', (e) => this.handleInteraction(e));
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    startGame() {
        this.gameState = 'START';
        this.instructionText.textContent = 'Click the cone button on the truck!';
        this.animalPosition.x = this.tree.x + Math.random() * 60 - 30;
        this.animalPosition.y = this.canvas.height - 250 - Math.random() * 80;
    }

    createTreeObject() {
        // ... (logic from main.js)
    }

    createFireTruckObject() {
        // ... (logic from main.js)
    }

    handleInteraction(e) {
        const pos = { x: e.offsetX, y: e.offsetY };
        if (e.type === 'mousedown') {
            switch (this.gameState) {
                case 'START':
                    // ... logic for placing cone
                    break;
                case 'CONE_PLACED':
                    // ... logic for extending ladder
                    break;
                // ... other cases
            }
        }
    }

    update() {
        // ... update logic for ladder, firefighter, etc.
    }

    gameLoop() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawScene();
        this.update();
        window.animalRescueAnimationId = requestAnimationFrame(() => this.gameLoop());
    }

    drawScene() {
        // ... drawing logic
    }
}

window.AnimalRescueLevel = AnimalRescueLevel;
