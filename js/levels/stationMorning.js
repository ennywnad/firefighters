class StationMorningGame {
    constructor() {
        this.canvas = this.setupCanvas();
        this.gameScreen = this.setupGameScreen();
        this.instructionText = this.gameScreen.querySelector('.instructions');
        this.ctx = this.canvas.getContext('2d');

        const { ParticleSystem } = window.AnimationUtils;
        this.particles = new ParticleSystem();
        
        this.currentTask = 0;
        this.completedTasks = [];
        
        // Audio
        this.actionSynth = new Tone.Synth({ oscillator: { type: 'triangle' } }).toDestination();
        this.completeSynth = new Tone.Synth({ oscillator: { type: 'sine' } }).toDestination();
        
        this.stationElements = {
            pole: { x: 100, y: 150, width: 20, height: 200, slid: false },
            boots: { x: 80, y: 380, width: 60, height: 40, worn: false },
            helmet: { x: 200, y: 100, width: 40, height: 30, worn: false },
            truck: { x: 300, y: 250, width: 150, height: 100, checked: false },
            alarm: { x: 450, y: 80, width: 50, height: 30, sounded: false }
        };
        
        this.firefighter = {
            x: 120,
            y: 300,
            width: 30,
            height: 60,
            atPole: true
        };
        
        this.tasks = [
            "Click the fire pole to slide down!",
            "Click the boots to put them on!",
            "Click the helmet to gear up!",
            "Click the truck to check equipment!",
            "Click the alarm to respond to call!"
        ];
        
        this.init();
    }
    
    setupCanvas() {
        let canvas = document.getElementById('stationMorningCanvas');
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.id = 'stationMorningCanvas';
        }
        return canvas;
    }
    
    setupGameScreen() {
        let screen = document.getElementById('station-morning-screen');
        if (!screen) {
            screen = document.createElement('div');
            screen.id = 'station-morning-screen';
            screen.className = 'game-screen hidden';
            screen.innerHTML = `
                <div class="title">Station Morning!</div>
                <div class="instructions">Click the fire pole to slide down!</div>
                <button class="menu-button" onclick="goToMenu()">Menu</button>
            `;
            screen.appendChild(this.canvas);
            document.body.appendChild(screen);
        }
        return screen;
    }

    init() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        
        this.instructionText.textContent = this.tasks[0];
        this.gameLoop();
    }

    handleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
        
        switch(this.currentTask) {
            case 0: // Slide down pole
                if (this.isClickInBounds(x, y, this.stationElements.pole)) {
                    this.stationElements.pole.slid = true;
                    this.firefighter.atPole = false;
                    this.firefighter.y = 320;
                    this.completeTask();
                }
                break;
                
            case 1: // Put on boots
                if (this.isClickInBounds(x, y, this.stationElements.boots)) {
                    this.stationElements.boots.worn = true;
                    this.completeTask();
                }
                break;
                
            case 2: // Put on helmet
                if (this.isClickInBounds(x, y, this.stationElements.helmet)) {
                    this.stationElements.helmet.worn = true;
                    this.completeTask();
                }
                break;
                
            case 3: // Check truck
                if (this.isClickInBounds(x, y, this.stationElements.truck)) {
                    this.stationElements.truck.checked = true;
                    this.completeTask();
                }
                break;
                
            case 4: // Sound alarm
                if (this.isClickInBounds(x, y, this.stationElements.alarm)) {
                    this.stationElements.alarm.sounded = true;
                    // Play short siren sound instead of regular complete sound
                    this.actionSynth.triggerAttackRelease('G4', '4n');
                    setTimeout(() => this.actionSynth.triggerAttackRelease('E4', '4n'), 200);
                    this.completedTasks.push(this.currentTask);
                    this.currentTask++;
                    this.instructionText.textContent = "All tasks complete!";
                    setTimeout(() => {
                        showHeroReport("Ready for action! The station is prepared!");
                    }, 1500);
                }
                break;
        }
    }
    
    isClickInBounds(x, y, element) {
        return x >= element.x && x <= element.x + element.width &&
               y >= element.y && y <= element.y + element.height;
    }
    
    completeTask() {
        this.actionSynth.triggerAttackRelease('C4', '8n');
        this.completedTasks.push(this.currentTask);
        this.currentTask++;
        
        if (this.currentTask < this.tasks.length) {
            this.instructionText.textContent = this.tasks[this.currentTask];
        } else {
            this.instructionText.textContent = "All tasks complete!";
            this.completeSynth.triggerAttackRelease(['C4', 'E4', 'G4'], '8n');
        }
        
        // Add particle effect
        this.particles.emit(
            this.firefighter.x + 15, 
            this.firefighter.y + 30, 
            'sparkle', 
            5, 
            { spread: 10 }
        );
    }

    gameLoop() {
        // Clear canvas
        this.ctx.fillStyle = '#87CEEB';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw ground
        this.ctx.fillStyle = '#95a5a6';
        this.ctx.fillRect(0, this.canvas.height - 100, this.canvas.width, 100);
        
        this.drawStationElements();
        this.drawFirefighter();
        
        // Update and draw particles
        this.particles.update();
        this.particles.draw(this.ctx);
        
        window.stationMorningAnimationId = requestAnimationFrame(() => this.gameLoop());
    }
    
    drawStationElements() {
        // Draw fire pole
        this.ctx.fillStyle = this.stationElements.pole.slid ? '#bdc3c7' : '#34495e';
        this.ctx.fillRect(this.stationElements.pole.x, this.stationElements.pole.y, 
                         this.stationElements.pole.width, this.stationElements.pole.height);
        
        // Draw boots
        this.ctx.fillStyle = this.stationElements.boots.worn ? '#2c3e50' : '#e74c3c';
        this.ctx.fillRect(this.stationElements.boots.x, this.stationElements.boots.y,
                         this.stationElements.boots.width, this.stationElements.boots.height);
        
        // Draw helmet
        this.ctx.fillStyle = this.stationElements.helmet.worn ? '#f1c40f' : '#f39c12';
        this.ctx.beginPath();
        this.ctx.arc(this.stationElements.helmet.x + 20, this.stationElements.helmet.y + 15, 20, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw truck
        this.ctx.fillStyle = this.stationElements.truck.checked ? '#27ae60' : '#e74c3c';
        this.ctx.fillRect(this.stationElements.truck.x, this.stationElements.truck.y,
                         this.stationElements.truck.width, this.stationElements.truck.height);
        
        // Add truck details
        this.ctx.fillStyle = '#c0392b';
        this.ctx.fillRect(this.stationElements.truck.x + 10, this.stationElements.truck.y + 10, 30, 20);
        
        // Draw wheels
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.beginPath();
        this.ctx.arc(this.stationElements.truck.x + 30, this.stationElements.truck.y + 110, 15, 0, Math.PI * 2);
        this.ctx.arc(this.stationElements.truck.x + 120, this.stationElements.truck.y + 110, 15, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw alarm
        this.ctx.fillStyle = this.stationElements.alarm.sounded ? '#e74c3c' : '#ecf0f1';
        this.ctx.fillRect(this.stationElements.alarm.x, this.stationElements.alarm.y,
                         this.stationElements.alarm.width, this.stationElements.alarm.height);
        
        if (this.stationElements.alarm.sounded) {
            this.ctx.fillStyle = '#c0392b';
            this.ctx.font = '12px Arial';
            this.ctx.fillText('🚨', this.stationElements.alarm.x + 15, this.stationElements.alarm.y + 20);
        }
    }
    
    drawFirefighter() {
        // Draw firefighter body
        this.ctx.fillStyle = '#e67e22';
        this.ctx.fillRect(this.firefighter.x, this.firefighter.y, 
                         this.firefighter.width, this.firefighter.height);
        
        // Draw head
        this.ctx.fillStyle = '#f4d03f';
        this.ctx.beginPath();
        this.ctx.arc(this.firefighter.x + 15, this.firefighter.y + 10, 8, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw gear if acquired
        if (this.stationElements.helmet.worn) {
            this.ctx.fillStyle = '#f39c12';
            this.ctx.beginPath();
            this.ctx.arc(this.firefighter.x + 15, this.firefighter.y + 10, 10, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        if (this.stationElements.boots.worn) {
            this.ctx.fillStyle = '#2c3e50';
            this.ctx.fillRect(this.firefighter.x + 5, this.firefighter.y + 55, 20, 8);
        }
    }
    
    resizeCanvas() {
        // Ensure screen is visible before measuring
        if (this.gameScreen.classList.contains('hidden')) {
            return;
        }
        
        // Get dimensions with fallback
        const width = this.gameScreen.clientWidth || 800;
        const height = this.gameScreen.clientHeight || 600;
        
        this.canvas.width = width;
        this.canvas.height = height;
    }
}

window.StationMorningGame = StationMorningGame;

