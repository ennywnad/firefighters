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
        this.dropSound = new Tone.Synth({ oscillator: { type: 'square' } }).toDestination();
        
        // Drag and drop state
        this.draggedModule = null;
        this.mouse = { x: 0, y: 0 };
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        
        // Game state
        this.gamePhase = 'SELECT_BASE'; // SELECT_BASE, BUILD_TRUCK, COMPLETE
        
        // Initialize the new modular truck building system
        this.initializeModularSystem();
        
        this.init();
    }
    
    initializeModularSystem() {
        // Truck chassis options (base modules)
        this.chassisOptions = [
            {
                id: 'engine',
                name: 'Fire Engine',
                description: 'Classic fire truck',
                x: 50, y: 200, width: 100, height: 80,
                color: '#e74c3c',
                icon: '🚒',
                dragOriginalPos: { x: 50, y: 200 }
            },
            {
                id: 'ladder',
                name: 'Ladder Truck', 
                description: 'Extended ladder truck',
                x: 200, y: 200, width: 120, height: 80,
                color: '#f39c12',
                icon: '🚚',
                dragOriginalPos: { x: 200, y: 200 }
            },
            {
                id: 'rescue',
                name: 'Rescue Unit',
                description: 'Heavy rescue vehicle',
                x: 350, y: 200, width: 110, height: 85,
                color: '#8e44ad',
                icon: '🚛',
                dragOriginalPos: { x: 350, y: 200 }
            }
        ];
        
        // Available modules to add to trucks
        this.availableModules = [
            {
                id: 'wheels',
                name: 'Wheels',
                x: 50, y: 350, width: 30, height: 30,
                color: '#2c3e50',
                icon: '⚫',
                dragOriginalPos: { x: 50, y: 350 },
                attachable: true
            },
            {
                id: 'hose',
                name: 'Fire Hose',
                x: 120, y: 350, width: 40, height: 25,
                color: '#e74c3c',
                icon: '🔥',
                dragOriginalPos: { x: 120, y: 350 },
                attachable: true
            },
            {
                id: 'ladder-extend',
                name: 'Extension Ladder',
                x: 200, y: 350, width: 60, height: 15,
                color: '#f39c12',
                icon: '🪜',
                dragOriginalPos: { x: 200, y: 350 },
                attachable: true
            },
            {
                id: 'water-tank',
                name: 'Water Tank',
                x: 300, y: 350, width: 50, height: 35,
                color: '#3498db',
                icon: '💧',
                dragOriginalPos: { x: 300, y: 350 },
                attachable: true
            },
            {
                id: 'rescue-tools',
                name: 'Rescue Tools',
                x: 380, y: 350, width: 45, height: 30,
                color: '#95a5a6',
                icon: '🔧',
                dragOriginalPos: { x: 380, y: 350 },
                attachable: true
            }
        ];
        
        // Build area (drop zone)
        this.buildArea = {
            x: 250, y: 50, width: 300, height: 120,
            occupied: false,
            chassis: null,
            attachedModules: []
        };
        
        // Current selected chassis and attached modules
        this.selectedChassis = null;
        this.attachedModules = [];
    }
    
    // New drag and drop event handlers
    setupDragAndDrop() {
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        
        // Touch support for mobile
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));
    }
    
    handleMouseDown(e) {
        const pos = this.getMousePos(e);
        this.startDrag(pos.x, pos.y);
    }
    
    handleMouseMove(e) {
        const pos = this.getMousePos(e);
        this.mouse.x = pos.x;
        this.mouse.y = pos.y;
        
        if (this.isDragging && this.draggedModule) {
            this.draggedModule.x = pos.x - this.dragOffset.x;
            this.draggedModule.y = pos.y - this.dragOffset.y;
        }
    }
    
    handleMouseUp(e) {
        if (this.isDragging) {
            this.endDrag();
        }
    }
    
    startDrag(x, y) {
        // Check chassis options first
        for (let chassis of this.chassisOptions) {
            if (this.isPointInRect(x, y, chassis)) {
                this.draggedModule = chassis;
                this.isDragging = true;
                this.dragOffset.x = x - chassis.x;
                this.dragOffset.y = y - chassis.y;
                this.clickSynth.triggerAttackRelease('C4', '8n');
                return;
            }
        }
        
        // Check available modules
        for (let module of this.availableModules) {
            if (this.isPointInRect(x, y, module)) {
                this.draggedModule = module;
                this.isDragging = true;
                this.dragOffset.x = x - module.x;
                this.dragOffset.y = y - module.y;
                this.clickSynth.triggerAttackRelease('E4', '8n');
                return;
            }
        }
    }
    
    endDrag() {
        if (!this.draggedModule) return;
        
        // Check if dropped in build area
        if (this.isModuleInBuildArea(this.draggedModule)) {
            if (this.chassisOptions.includes(this.draggedModule)) {
                // Chassis dropped in build area
                if (!this.selectedChassis) {
                    this.selectedChassis = { ...this.draggedModule };
                    this.selectedChassis.x = this.buildArea.x + 50;
                    this.selectedChassis.y = this.buildArea.y + 20;
                    this.gamePhase = 'BUILD_TRUCK';
                    this.instructionText.textContent = 'Great! Now drag modules to customize your fire truck!';
                    this.successSynth.triggerAttackRelease('G4', '4n');
                } else {
                    // Already have chassis, return to original position
                    this.returnToOriginalPosition(this.draggedModule);
                }
            } else if (this.availableModules.includes(this.draggedModule) && this.selectedChassis) {
                // Module dropped on chassis
                this.attachModule(this.draggedModule);
            } else {
                this.returnToOriginalPosition(this.draggedModule);
            }
        } else {
            // Not in build area, return to original position
            this.returnToOriginalPosition(this.draggedModule);
        }
        
        this.isDragging = false;
        this.draggedModule = null;
    }
    
    attachModule(module) {
        // Create attached module
        const attachedModule = { ...module };
        attachedModule.x = this.selectedChassis.x + (this.attachedModules.length * 30) + 10;
        attachedModule.y = this.selectedChassis.y - 20;
        attachedModule.attached = true;
        
        this.attachedModules.push(attachedModule);
        this.successSynth.triggerAttackRelease('A4', '4n');
        
        // Check if truck is complete (has wheels at minimum)
        if (this.attachedModules.some(m => m.id === 'wheels')) {
            this.gamePhase = 'COMPLETE';
            this.instructionText.textContent = 'Amazing! Your fire truck is ready for action!';
            setTimeout(() => {
                this.completionSynth.triggerAttackRelease(['C4', 'E4', 'G4'], '2n');
                showHeroReport('Excellent work! You built an awesome fire truck!');
            }, 1000);
        } else {
            this.instructionText.textContent = `Great! Add wheels to complete your ${this.selectedChassis.name}!`;
        }
        
        // Return original module to its position
        this.returnToOriginalPosition(module);
    }
    
    returnToOriginalPosition(module) {
        module.x = module.dragOriginalPos.x;
        module.y = module.dragOriginalPos.y;
        this.dropSound.triggerAttackRelease('F3', '8n');
    }
    
    isModuleInBuildArea(module) {
        const moduleCenter = {
            x: module.x + module.width / 2,
            y: module.y + module.height / 2
        };
        
        return moduleCenter.x >= this.buildArea.x && 
               moduleCenter.x <= this.buildArea.x + this.buildArea.width &&
               moduleCenter.y >= this.buildArea.y && 
               moduleCenter.y <= this.buildArea.y + this.buildArea.height;
    }
    
    isPointInRect(x, y, rect) {
        return x >= rect.x && x <= rect.x + rect.width &&
               y >= rect.y && y <= rect.y + rect.height;
    }
    
    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) * (this.canvas.width / rect.width),
            y: (e.clientY - rect.top) * (this.canvas.height / rect.height)
        };
    }
    
    // Touch event handlers for mobile support
    handleTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const pos = this.getTouchPos(touch);
        this.startDrag(pos.x, pos.y);
    }
    
    handleTouchMove(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const pos = this.getTouchPos(touch);
        this.mouse.x = pos.x;
        this.mouse.y = pos.y;
        
        if (this.isDragging && this.draggedModule) {
            this.draggedModule.x = pos.x - this.dragOffset.x;
            this.draggedModule.y = pos.y - this.dragOffset.y;
        }
    }
    
    handleTouchEnd(e) {
        e.preventDefault();
        if (this.isDragging) {
            this.endDrag();
        }
    }
    
    getTouchPos(touch) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (touch.clientX - rect.left) * (this.canvas.width / rect.width),
            y: (touch.clientY - rect.top) * (this.canvas.height / rect.height)
        };
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
        this.setupDragAndDrop();
        
        this.instructionText.textContent = 'Choose a fire truck type and drag it to the build area!';
        this.gameLoop();
    }
    
    
    gameLoop() {
        // Clear canvas
        this.ctx.fillStyle = '#87CEEB';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw ground
        this.ctx.fillStyle = '#2ECC71';
        this.ctx.fillRect(0, this.canvas.height - 100, this.canvas.width, 100);
        
        // Draw the new modular interface
        this.drawModularInterface();
        
        // Update and draw particles
        this.particles.update();
        this.particles.draw(this.ctx);
        
        window.truckBuildingAnimationId = requestAnimationFrame(() => this.gameLoop());
    }
    
    drawModularInterface() {
        // Draw chassis selection area
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.fillRect(20, 180, 480, 120);
        this.ctx.strokeStyle = '#34495e';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(20, 180, 480, 120);
        
        // Title for chassis selection
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('Choose Your Fire Truck:', 30, 170);
        
        // Draw chassis options
        this.chassisOptions.forEach(chassis => {
            this.drawChassisOption(chassis);
        });
        
        // Draw modules area
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.fillRect(20, 320, 480, 100);
        this.ctx.strokeStyle = '#34495e';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(20, 320, 480, 100);
        
        // Title for modules
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.font = 'bold 20px Arial';
        this.ctx.fillText('Equipment & Tools:', 30, 315);
        
        // Draw available modules
        this.availableModules.forEach(module => {
            this.drawModule(module);
        });
        
        // Draw build area
        this.drawBuildArea();
        
        // Draw current truck build if chassis is selected
        if (this.selectedChassis) {
            this.drawCurrentBuild();
        }
    }
    
    drawChassisOption(chassis) {
        // Draw chassis body
        this.ctx.fillStyle = chassis.color;
        this.ctx.fillRect(chassis.x, chassis.y, chassis.width, chassis.height);
        
        // Add gradient for depth
        const gradient = this.ctx.createLinearGradient(chassis.x, chassis.y, chassis.x, chassis.y + chassis.height);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(chassis.x, chassis.y, chassis.width, chassis.height);
        
        // Draw wheels
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.beginPath();
        this.ctx.arc(chassis.x + 20, chassis.y + chassis.height + 8, 8, 0, Math.PI * 2);
        this.ctx.arc(chassis.x + chassis.width - 20, chassis.y + chassis.height + 8, 8, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw truck icon
        this.ctx.font = '32px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillStyle = '#fff';
        this.ctx.fillText(chassis.icon, chassis.x + chassis.width/2, chassis.y + chassis.height/2);
        
        // Draw name and description
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(chassis.name, chassis.x + chassis.width/2, chassis.y + chassis.height + 25);
        
        this.ctx.font = '12px Arial';
        this.ctx.fillStyle = '#7f8c8d';
        this.ctx.fillText(chassis.description, chassis.x + chassis.width/2, chassis.y + chassis.height + 40);
        
        // Highlight if dragging
        if (this.draggedModule === chassis) {
            this.ctx.strokeStyle = '#f39c12';
            this.ctx.lineWidth = 4;
            this.ctx.strokeRect(chassis.x - 2, chassis.y - 2, chassis.width + 4, chassis.height + 4);
        }
    }
    
    drawModule(module) {
        // Draw module body
        this.ctx.fillStyle = module.color;
        this.ctx.fillRect(module.x, module.y, module.width, module.height);
        
        // Add shine effect
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.fillRect(module.x, module.y, module.width, module.height/3);
        
        // Draw module icon
        this.ctx.font = '20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillStyle = '#fff';
        this.ctx.fillText(module.icon, module.x + module.width/2, module.y + module.height/2);
        
        // Draw name
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.font = 'bold 12px Arial';
        this.ctx.fillText(module.name, module.x + module.width/2, module.y + module.height + 15);
        
        // Highlight if dragging
        if (this.draggedModule === module) {
            this.ctx.strokeStyle = '#e74c3c';
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(module.x - 2, module.y - 2, module.width + 4, module.height + 4);
        }
    }
    
    drawBuildArea() {
        // Draw build area background
        this.ctx.fillStyle = this.selectedChassis ? 'rgba(46, 204, 113, 0.2)' : 'rgba(149, 165, 166, 0.2)';
        this.ctx.fillRect(this.buildArea.x, this.buildArea.y, this.buildArea.width, this.buildArea.height);
        
        // Draw border
        this.ctx.strokeStyle = this.selectedChassis ? '#27ae60' : '#95a5a6';
        this.ctx.lineWidth = 3;
        this.ctx.setLineDash([10, 5]);
        this.ctx.strokeRect(this.buildArea.x, this.buildArea.y, this.buildArea.width, this.buildArea.height);
        this.ctx.setLineDash([]);
        
        // Draw instructions
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.font = 'bold 18px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        const instruction = this.selectedChassis ? 'Add Equipment Here!' : 'Drag Fire Truck Here!';
        this.ctx.fillText(instruction, this.buildArea.x + this.buildArea.width/2, this.buildArea.y + this.buildArea.height/2);
    }
    
    drawCurrentBuild() {
        if (!this.selectedChassis) return;
        
        // Draw the selected chassis in build area
        this.drawChassisInBuild(this.selectedChassis);
        
        // Draw attached modules
        this.attachedModules.forEach(module => {
            this.drawAttachedModule(module);
        });
    }
    
    drawChassisInBuild(chassis) {
        // Draw chassis body in build area
        this.ctx.fillStyle = chassis.color;
        this.ctx.fillRect(chassis.x, chassis.y, chassis.width, chassis.height);
        
        // Add gradient
        const gradient = this.ctx.createLinearGradient(chassis.x, chassis.y, chassis.x, chassis.y + chassis.height);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(chassis.x, chassis.y, chassis.width, chassis.height);
        
        // Draw wheels
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.beginPath();
        this.ctx.arc(chassis.x + 25, chassis.y + chassis.height + 10, 10, 0, Math.PI * 2);
        this.ctx.arc(chassis.x + chassis.width - 25, chassis.y + chassis.height + 10, 10, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw truck cab
        this.ctx.fillStyle = '#34495e';
        this.ctx.fillRect(chassis.x + chassis.width - 40, chassis.y - 25, 35, 25);
        
        // Cab window
        this.ctx.fillStyle = '#87CEEB';
        this.ctx.fillRect(chassis.x + chassis.width - 38, chassis.y - 23, 31, 15);
    }
    
    drawAttachedModule(module) {
        // Draw module on the truck
        this.ctx.fillStyle = module.color;
        this.ctx.fillRect(module.x, module.y, module.width, module.height);
        
        // Add shine
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        this.ctx.fillRect(module.x, module.y, module.width, module.height/2);
        
        // Draw icon
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillStyle = '#fff';
        this.ctx.fillText(module.icon, module.x + module.width/2, module.y + module.height/2);
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

