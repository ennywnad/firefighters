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
        // Base fire truck (always present)
        this.baseTruck = {
            x: 350, y: 280, 
            width: 200, height: 80,
            color: '#e74c3c'
        };
        
        // Equipment modules that layer on top
        this.availableEquipment = [
            {
                id: 'wheels',
                name: 'Wheels',
                x: 50, y: 450, width: 60, height: 40,
                color: '#2c3e50',
                icon: '⚫⚫',
                dragOriginalPos: { x: 50, y: 450 },
                attachmentType: 'wheels',
                required: true
            },
            {
                id: 'big-ladder',
                name: 'Ladder Tower',
                x: 150, y: 450, width: 80, height: 40,
                color: '#f39c12',
                icon: '🪜',
                dragOriginalPos: { x: 150, y: 450 },
                attachmentType: 'top',
                description: 'For ladder trucks'
            },
            {
                id: 'side-ladders',
                name: 'Side Ladders',
                x: 270, y: 450, width: 70, height: 40,
                color: '#f39c12',
                icon: '🪜🪜',
                dragOriginalPos: { x: 270, y: 450 },
                attachmentType: 'sides',
                description: 'For engine trucks'
            },
            {
                id: 'rear-cab',
                name: 'Rear Cab',
                x: 380, y: 450, width: 70, height: 40,
                color: '#3498db',
                icon: '🏠',
                dragOriginalPos: { x: 380, y: 450 },
                attachmentType: 'rear',
                description: 'Command center'
            },
            {
                id: 'water-tank',
                name: 'Water Tank',
                x: 490, y: 450, width: 70, height: 40,
                color: '#3498db',
                icon: '💧',
                dragOriginalPos: { x: 490, y: 450 },
                attachmentType: 'tank',
                description: 'Water storage'
            },
            {
                id: 'rescue-compartment',
                name: 'Rescue Gear',
                x: 600, y: 450, width: 70, height: 40,
                color: '#95a5a6',
                icon: '🔧',
                dragOriginalPos: { x: 600, y: 450 },
                attachmentType: 'compartment',
                description: 'Tools & equipment'
            }
        ];
        
        // Attached equipment tracking
        this.attachedEquipment = {
            wheels: null,
            top: null,
            sides: null,
            rear: null,
            tank: null,
            compartment: null
        };
        
        // Game requires wheels to complete
        this.gamePhase = 'BUILDING'; // BUILDING, COMPLETE
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
        // Check available equipment
        for (let equipment of this.availableEquipment) {
            if (this.isPointInRect(x, y, equipment)) {
                this.draggedModule = equipment;
                this.isDragging = true;
                this.dragOffset.x = x - equipment.x;
                this.dragOffset.y = y - equipment.y;
                this.clickSynth.triggerAttackRelease('C4', '8n');
                return;
            }
        }
    }
    
    endDrag() {
        if (!this.draggedModule) return;
        
        // Check if dropped on the fire truck
        if (this.isDroppedOnTruck(this.draggedModule)) {
            this.attachEquipment(this.draggedModule);
        } else {
            // Not on truck, return to original position
            this.returnToOriginalPosition(this.draggedModule);
        }
        
        this.isDragging = false;
        this.draggedModule = null;
    }
    
    attachEquipment(equipment) {
        const attachmentType = equipment.attachmentType;
        
        // Check if this attachment type is already filled
        if (this.attachedEquipment[attachmentType]) {
            // Already have this type, return to original position
            this.returnToOriginalPosition(equipment);
            return;
        }
        
        // Attach the equipment
        this.attachedEquipment[attachmentType] = { ...equipment };
        this.successSynth.triggerAttackRelease('A4', '4n');
        
        // Check if truck is complete (has wheels at minimum)
        if (this.attachedEquipment.wheels) {
            this.gamePhase = 'COMPLETE';
            this.instructionText.textContent = 'Amazing! Your fire truck is ready for action!';
            setTimeout(() => {
                this.completionSynth.triggerAttackRelease(['C4', 'E4', 'G4'], '2n');
                showHeroReport('Excellent work! You built an awesome fire truck!');
            }, 1000);
        } else {
            this.instructionText.textContent = 'Great! Add wheels to make your fire truck complete!';
        }
        
        // Return original equipment to its position
        this.returnToOriginalPosition(equipment);
    }
    
    returnToOriginalPosition(module) {
        module.x = module.dragOriginalPos.x;
        module.y = module.dragOriginalPos.y;
        this.dropSound.triggerAttackRelease('F3', '8n');
    }
    
    isDroppedOnTruck(equipment) {
        const equipmentCenter = {
            x: equipment.x + equipment.width / 2,
            y: equipment.y + equipment.height / 2
        };
        
        // Check if dropped on the truck area (with some margin)
        const truckArea = {
            x: this.baseTruck.x - 50,
            y: this.baseTruck.y - 50,
            width: this.baseTruck.width + 100,
            height: this.baseTruck.height + 100
        };
        
        return equipmentCenter.x >= truckArea.x && 
               equipmentCenter.x <= truckArea.x + truckArea.width &&
               equipmentCenter.y >= truckArea.y && 
               equipmentCenter.y <= truckArea.y + truckArea.height;
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
        
        this.instructionText.textContent = 'Drag equipment onto the fire truck to build it! Start with wheels!';
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
        // Draw the base fire truck
        this.drawBaseTruck();
        
        // Draw equipment selection area
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.fillRect(20, 420, 700, 100);
        this.ctx.strokeStyle = '#34495e';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(20, 420, 700, 100);
        
        // Title for equipment
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.font = 'bold 20px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('Fire Truck Equipment - Drag to Add:', 30, 410);
        
        // Draw available equipment
        this.availableEquipment.forEach(equipment => {
            this.drawEquipment(equipment);
        });
        
        // Draw attached equipment on the truck
        this.drawAttachedEquipment();
    }
    
    drawBaseTruck() {
        const truck = this.baseTruck;
        
        // Draw main truck body
        this.ctx.fillStyle = truck.color;
        this.ctx.fillRect(truck.x, truck.y, truck.width, truck.height);
        
        // Add gradient for 3D effect
        const gradient = this.ctx.createLinearGradient(truck.x, truck.y, truck.x, truck.y + truck.height);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(truck.x, truck.y, truck.width, truck.height);
        
        // Draw front cab
        this.ctx.fillStyle = '#c0392b';
        this.ctx.fillRect(truck.x + truck.width - 60, truck.y - 30, 55, 35);
        
        // Cab windows
        this.ctx.fillStyle = '#87CEEB';
        this.ctx.fillRect(truck.x + truck.width - 55, truck.y - 25, 20, 15);
        this.ctx.fillRect(truck.x + truck.width - 30, truck.y - 25, 20, 15);
        
        // Equipment compartments on side
        this.ctx.strokeStyle = '#34495e';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(truck.x + 10, truck.y + 10, 40, 30);
        this.ctx.strokeRect(truck.x + 60, truck.y + 10, 40, 30);
        this.ctx.strokeRect(truck.x + 110, truck.y + 10, 40, 30);
        
        // Drop zone highlight
        this.ctx.strokeStyle = '#f39c12';
        this.ctx.lineWidth = 3;
        this.ctx.setLineDash([8, 4]);
        this.ctx.strokeRect(truck.x - 20, truck.y - 50, truck.width + 40, truck.height + 80);
        this.ctx.setLineDash([]);
        
        // Instructions
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Drag Equipment Here!', truck.x + truck.width/2, truck.y - 60);
    }
    
    drawEquipment(equipment) {
        // Draw equipment module
        this.ctx.fillStyle = equipment.color;
        this.ctx.fillRect(equipment.x, equipment.y, equipment.width, equipment.height);
        
        // Add shine effect
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.fillRect(equipment.x, equipment.y, equipment.width, equipment.height/3);
        
        // Draw equipment icon
        this.ctx.font = '24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillStyle = '#fff';
        this.ctx.fillText(equipment.icon, equipment.x + equipment.width/2, equipment.y + equipment.height/2);
        
        // Draw name
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.font = 'bold 12px Arial';
        this.ctx.fillText(equipment.name, equipment.x + equipment.width/2, equipment.y + equipment.height + 15);
        
        // Draw description if available
        if (equipment.description) {
            this.ctx.font = '9px Arial';
            this.ctx.fillStyle = '#7f8c8d';
            this.ctx.fillText(equipment.description, equipment.x + equipment.width/2, equipment.y + equipment.height + 27);
        }
        
        // Highlight if dragging
        if (this.draggedModule === equipment) {
            this.ctx.strokeStyle = '#e74c3c';
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(equipment.x - 2, equipment.y - 2, equipment.width + 4, equipment.height + 4);
        }
        
        // Show if already attached
        if (this.attachedEquipment[equipment.attachmentType]) {
            this.ctx.fillStyle = 'rgba(46, 204, 113, 0.7)';
            this.ctx.fillRect(equipment.x, equipment.y, equipment.width, equipment.height);
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 16px Arial';
            this.ctx.fillText('✓', equipment.x + equipment.width/2, equipment.y + equipment.height/2);
        }
    }
    
    drawAttachedEquipment() {
        const truck = this.baseTruck;
        
        // Draw wheels (bottom)
        if (this.attachedEquipment.wheels) {
            this.ctx.fillStyle = '#2c3e50';
            this.ctx.beginPath();
            this.ctx.arc(truck.x + 40, truck.y + truck.height + 15, 15, 0, Math.PI * 2);
            this.ctx.arc(truck.x + 100, truck.y + truck.height + 15, 15, 0, Math.PI * 2);
            this.ctx.arc(truck.x + 160, truck.y + truck.height + 15, 15, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Draw big ladder on top
        if (this.attachedEquipment.top) {
            this.ctx.fillStyle = '#f39c12';
            this.ctx.fillRect(truck.x + 20, truck.y - 30, truck.width - 80, 25);
            // Ladder rungs
            this.ctx.strokeStyle = '#e67e22';
            this.ctx.lineWidth = 2;
            for (let i = 0; i < 8; i++) {
                const x = truck.x + 30 + (i * 15);
                this.ctx.beginPath();
                this.ctx.moveTo(x, truck.y - 28);
                this.ctx.lineTo(x, truck.y - 7);
                this.ctx.stroke();
            }
        }
        
        // Draw side ladders
        if (this.attachedEquipment.sides) {
            this.ctx.fillStyle = '#f39c12';
            // Left side ladder
            this.ctx.fillRect(truck.x - 15, truck.y + 20, 12, 40);
            // Right side ladder
            this.ctx.fillRect(truck.x + truck.width + 3, truck.y + 20, 12, 40);
        }
        
        // Draw rear cab
        if (this.attachedEquipment.rear) {
            this.ctx.fillStyle = '#3498db';
            this.ctx.fillRect(truck.x - 40, truck.y - 10, 35, 50);
            // Windows
            this.ctx.fillStyle = '#87CEEB';
            this.ctx.fillRect(truck.x - 35, truck.y, 10, 15);
            this.ctx.fillRect(truck.x - 20, truck.y, 10, 15);
        }
        
        // Draw water tank (on top, behind cab)
        if (this.attachedEquipment.tank) {
            this.ctx.fillStyle = '#3498db';
            this.ctx.fillRect(truck.x + 10, truck.y - 25, 60, 20);
            // Tank details
            this.ctx.strokeStyle = '#2980b9';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(truck.x + 10, truck.y - 25, 60, 20);
        }
        
        // Draw rescue compartment (side panels)
        if (this.attachedEquipment.compartment) {
            this.ctx.fillStyle = '#95a5a6';
            this.ctx.fillRect(truck.x + 5, truck.y + 45, 50, 15);
            this.ctx.fillRect(truck.x + 145, truck.y + 45, 50, 15);
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

window.TruckBuildingGame = TruckBuildingGame;

