class TruckBuildingGame {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'truckBuildingCanvas';
        this.ctx = this.canvas.getContext('2d');
        
        this.gameScreen = this.setupGameScreen();
        this.instructionText = document.getElementById('truck-building-instructions');
        
        const { ParticleSystem, AnimatedValue, BouncyObject } = window.AnimationUtils;
        this.particles = new ParticleSystem();
        
        this.clickSynth = new Tone.Synth({ oscillator: { type: 'triangle' } }).toDestination();
        this.successSynth = new Tone.Synth({ oscillator: { type: 'sine' } }).toDestination();
        this.completionSynth = new Tone.PolySynth(Tone.Synth).toDestination();
        this.wrenchSound = new Tone.MetalSynth().toDestination();
        
        this.currentStep = 0;
        this.mouse = { x: 0, y: 0 };
        this.selectedTool = null;
        
        this.toolbox = {
            x: 50,
            y: 100,
            width: 100,
            height: 60,
            isOpen: false,
            tools: [
                { name: 'hammer', emoji: '🔨', x: 60, y: 120 },
                { name: 'wrench', emoji: '🔧', x: 90, y: 120 },
                { name: 'screwdriver', emoji: '🪛', x: 120, y: 120 }
            ],
            draw: function(ctx) {
                // Draw toolbox
                ctx.fillStyle = '#7f8c8d';
                ctx.fillRect(this.x, this.y, this.width, this.height);
                
                // Draw handle
                ctx.strokeStyle = '#2c3e50';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(this.x + this.width/2, this.y + 10, 8, 0, Math.PI);
                ctx.stroke();
                
                // Draw tools if open
                if (this.isOpen) {
                    ctx.font = '20px Arial';
                    this.tools.forEach(tool => {
                        ctx.fillText(tool.emoji, tool.x, tool.y);
                    });
                }
            }
        };
        
        this.truck = {
            x: 300,
            y: 300,
            parts: {
                chassis: { complete: false, x: 300, y: 350, width: 120, height: 40 },
                wheels: { complete: false, positions: [{x: 320, y: 390}, {x: 380, y: 390}] },
                cabin: { complete: false, x: 320, y: 320, width: 60, height: 30 },
                ladder: { complete: false, x: 350, y: 300, width: 80, height: 20 },
                hose: { complete: false, x: 380, y: 340, radius: 15 }
            },
            draw: function(ctx) {
                // Draw chassis
                if (this.parts.chassis.complete) {
                    ctx.fillStyle = '#e74c3c';
                    ctx.fillRect(this.parts.chassis.x, this.parts.chassis.y, this.parts.chassis.width, this.parts.chassis.height);
                } else {
                    ctx.strokeStyle = '#bdc3c7';
                    ctx.strokeRect(this.parts.chassis.x, this.parts.chassis.y, this.parts.chassis.width, this.parts.chassis.height);
                }
                
                // Draw wheels
                if (this.parts.wheels.complete) {
                    ctx.fillStyle = '#2c3e50';
                    this.parts.wheels.positions.forEach(pos => {
                        ctx.beginPath();
                        ctx.arc(pos.x, pos.y, 15, 0, Math.PI * 2);
                        ctx.fill();
                    });
                } else {
                    ctx.strokeStyle = '#bdc3c7';
                    this.parts.wheels.positions.forEach(pos => {
                        ctx.beginPath();
                        ctx.arc(pos.x, pos.y, 15, 0, Math.PI * 2);
                        ctx.stroke();
                    });
                }
                
                // Draw cabin
                if (this.parts.cabin.complete) {
                    ctx.fillStyle = '#3498db';
                    ctx.fillRect(this.parts.cabin.x, this.parts.cabin.y, this.parts.cabin.width, this.parts.cabin.height);
                } else {
                    ctx.strokeStyle = '#bdc3c7';
                    ctx.strokeRect(this.parts.cabin.x, this.parts.cabin.y, this.parts.cabin.width, this.parts.cabin.height);
                }
                
                // Draw ladder
                if (this.parts.ladder.complete) {
                    ctx.fillStyle = '#f39c12';
                    ctx.fillRect(this.parts.ladder.x, this.parts.ladder.y, this.parts.ladder.width, this.parts.ladder.height);
                    // Add ladder rungs
                    ctx.strokeStyle = '#e67e22';
                    ctx.lineWidth = 2;
                    for (let i = 0; i < 4; i++) {
                        const x = this.parts.ladder.x + (i + 1) * 15;
                        ctx.beginPath();
                        ctx.moveTo(x, this.parts.ladder.y);
                        ctx.lineTo(x, this.parts.ladder.y + this.parts.ladder.height);
                        ctx.stroke();
                    }
                } else {
                    ctx.strokeStyle = '#bdc3c7';
                    ctx.strokeRect(this.parts.ladder.x, this.parts.ladder.y, this.parts.ladder.width, this.parts.ladder.height);
                }
                
                // Draw hose
                if (this.parts.hose.complete) {
                    ctx.fillStyle = '#f1c40f';
                    ctx.beginPath();
                    ctx.arc(this.parts.hose.x, this.parts.hose.y, this.parts.hose.radius, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    ctx.strokeStyle = '#bdc3c7';
                    ctx.beginPath();
                    ctx.arc(this.parts.hose.x, this.parts.hose.y, this.parts.hose.radius, 0, Math.PI * 2);
                    ctx.stroke();
                }
            }
        };
        
        this.steps = [
            {
                instruction: "Click the toolbox to begin!",
                target: "toolbox",
                tool: null,
                part: null,
                completed: false
            },
            {
                instruction: "Click the hammer, then the chassis!",
                target: "chassis",
                tool: "hammer",
                part: "chassis",
                completed: false
            },
            {
                instruction: "Click the wrench, then the wheels!",
                target: "wheels",
                tool: "wrench", 
                part: "wheels",
                completed: false
            },
            {
                instruction: "Click the screwdriver, then the cabin!",
                target: "cabin",
                tool: "screwdriver",
                part: "cabin", 
                completed: false
            },
            {
                instruction: "Click the hammer, then the ladder!",
                target: "ladder",
                tool: "hammer",
                part: "ladder",
                completed: false
            },
            {
                instruction: "Click the wrench, then the hose!",
                target: "hose", 
                tool: "wrench",
                part: "hose",
                completed: false
            }
        ];
        
        this.init();
    }
    
    setupGameScreen() {
        let screen = document.getElementById('truck-building-screen');
        if (!screen) {
            screen = document.createElement('div');
            screen.id = 'truck-building-screen';
            screen.className = 'game-screen hidden';
            screen.innerHTML = `
                <div class="title">Build Your Fire Truck!</div>
                <div id="truck-building-instructions" class="instructions">Click the toolbox to begin!</div>
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
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        
        this.instructionText.textContent = this.steps[0].instruction;
        this.gameLoop();
    }
    
    handleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
        
        const currentStepData = this.steps[this.currentStep];
        
        if (this.currentStep === 0) {
            // First step: click toolbox
            if (x >= this.toolbox.x && x <= this.toolbox.x + this.toolbox.width &&
                y >= this.toolbox.y && y <= this.toolbox.y + this.toolbox.height) {
                this.toolbox.isOpen = true;
                this.currentStep++;
                this.instructionText.textContent = this.steps[this.currentStep].instruction;
                this.clickSynth.triggerAttackRelease('C4', '8n');
                
                // Add sparkle effect
                this.particles.emit(x, y, 'sparkle', 5, { spread: 8 });
            }
        } else if (this.toolbox.isOpen) {
            // Check if clicking on required tool
            const requiredTool = this.toolbox.tools.find(tool => tool.name === currentStepData.tool);
            if (requiredTool && 
                Math.hypot(x - requiredTool.x, y - requiredTool.y) < 15) {
                // Tool selected, now need to click on truck part
                this.selectedTool = currentStepData.tool;
                this.wrenchSound.triggerAttackRelease('C3', '8n');
                
                // Visual feedback
                this.particles.emit(x, y, 'spark', 3, { spread: 5, color: '#FFA500' });
            }
            
            // Check if clicking on truck part with correct tool
            if (this.selectedTool === currentStepData.tool) {
                let partClicked = false;
                const part = this.truck.parts[currentStepData.part];
                
                if (currentStepData.part === 'chassis') {
                    if (x >= part.x && x <= part.x + part.width &&
                        y >= part.y && y <= part.y + part.height) {
                        partClicked = true;
                    }
                } else if (currentStepData.part === 'wheels') {
                    partClicked = part.positions.some(pos => 
                        Math.hypot(x - pos.x, y - pos.y) < 20
                    );
                } else if (currentStepData.part === 'cabin') {
                    if (x >= part.x && x <= part.x + part.width &&
                        y >= part.y && y <= part.y + part.height) {
                        partClicked = true;
                    }
                } else if (currentStepData.part === 'ladder') {
                    if (x >= part.x && x <= part.x + part.width &&
                        y >= part.y && y <= part.y + part.height) {
                        partClicked = true;
                    }
                } else if (currentStepData.part === 'hose') {
                    if (Math.hypot(x - part.x, y - part.y) < part.radius + 5) {
                        partClicked = true;
                    }
                }
                
                if (partClicked) {
                    // Complete the part
                    part.complete = true;
                    this.selectedTool = null;
                    this.successSynth.triggerAttackRelease('E4', '4n');
                    
                    // Add completion effect
                    this.particles.emit(x, y, 'confetti', 10, { spread: 15 });
                    
                    // Move to next step
                    this.currentStep++;
                    if (this.currentStep < this.steps.length) {
                        this.instructionText.textContent = this.steps[this.currentStep].instruction;
                    } else {
                        // All parts completed
                        this.instructionText.textContent = "Fire truck complete! 🚒";
                        this.completionSynth.triggerAttackRelease(['C4', 'E4', 'G4'], '2n');
                        
                        // Victory particles
                        setTimeout(() => {
                            this.particles.emit(this.canvas.width/2, this.canvas.height/2, 'confetti', 20, { spread: 30 });
                        }, 500);
                        
                        setTimeout(() => {
                            showHeroReport("Excellent work! You built a fire truck!");
                        }, 2000);
                    }
                }
            }
        }
    }
    
    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
        this.mouse.y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
    }
    
    gameLoop() {
        // Clear canvas
        this.ctx.fillStyle = '#87CEEB';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw ground
        this.ctx.fillStyle = '#2ECC71';
        this.ctx.fillRect(0, this.canvas.height - 100, this.canvas.width, 100);
        
        // Draw objects
        this.toolbox.draw(this.ctx);
        this.truck.draw(this.ctx);
        
        // Highlight selected tool
        if (this.selectedTool && this.toolbox.isOpen) {
            const tool = this.toolbox.tools.find(t => t.name === this.selectedTool);
            if (tool) {
                this.ctx.strokeStyle = '#f39c12';
                this.ctx.lineWidth = 3;
                this.ctx.strokeRect(tool.x - 15, tool.y - 15, 30, 30);
            }
        }
        
        // Update and draw particles
        this.particles.update();
        this.particles.draw(this.ctx);
        
        window.truckBuildingAnimationId = requestAnimationFrame(() => this.gameLoop());
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

window.TruckBuildingGame = TruckBuildingGame;

