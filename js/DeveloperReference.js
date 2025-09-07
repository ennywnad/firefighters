// Developer Reference Screen for visualizing game elements with measurements
class DeveloperReference {
    constructor() {
        this.canvas = document.getElementById('referenceCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.screen = document.getElementById('developer-reference-screen');
        
        this.showMeasurements = true;
        this.currentView = 'all';
        
        // Create a reference fire rescue level for measurements
        this.fireRescue = null;
        
        this.init();
    }
    
    init() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Set up button event listeners
        document.getElementById('ref-show-truck').addEventListener('click', () => this.setView('truck'));
        document.getElementById('ref-show-hydrant').addEventListener('click', () => this.setView('hydrant'));
        document.getElementById('ref-show-buildings').addEventListener('click', () => this.setView('buildings'));
        document.getElementById('ref-show-all').addEventListener('click', () => this.setView('all'));
        document.getElementById('ref-toggle-measurements').addEventListener('click', () => this.toggleMeasurements());
        
        this.draw();
    }
    
    start() {
        this.screen.classList.remove('hidden');
        this.resizeCanvas();
        
        // Initialize fire rescue with our reference canvas
        this.initializeFireRescue();
        
        setTimeout(() => this.resizeCanvas(), 50);
        this.draw();
    }
    
    initializeFireRescue() {
        // Create a properly initialized fire rescue instance
        this.fireRescue = new FireRescueLevel();
        this.fireRescue.canvas = this.canvas;
        this.fireRescue.ctx = this.ctx;
        this.fireRescue.gameScreen = this.screen;
        
        // Set it to a state where all elements are visible
        this.fireRescue.gameState = 'READY_TO_SPRAY';
        this.fireRescue.ladder.visible = true;
        this.fireRescue.nozzle.attachedToTruck = true;
        
        // Initialize positions
        this.fireRescue.setupTruckEquipment();
        this.fireRescue.resizeCanvas();
    }
    
    resizeCanvas() {
        if (this.screen.classList.contains('hidden')) return;
        
        const container = this.canvas.parentElement;
        const width = container.clientWidth;
        const height = 600; // Match typical game canvas height
        
        this.canvas.width = width;
        this.canvas.height = height;
        
        // Update fire rescue positions for our canvas size
        if (this.fireRescue) {
            this.fireRescue.canvas = this.canvas;
            this.fireRescue.ctx = this.ctx;
            this.fireRescue.resizeCanvas();
        }
        
        this.draw();
    }
    
    setView(view) {
        this.currentView = view;
        this.updateViewButtons();
        this.draw();
    }
    
    toggleMeasurements() {
        this.showMeasurements = !this.showMeasurements;
        this.updateMeasurementButton();
        this.draw();
    }
    
    updateViewButtons() {
        // Reset all button styles
        document.querySelectorAll('#developer-reference-screen .timer-option').forEach(btn => {
            btn.style.background = '#3498db';
        });
        
        // Highlight current view
        const viewButtons = {
            'truck': 'ref-show-truck',
            'hydrant': 'ref-show-hydrant', 
            'buildings': 'ref-show-buildings',
            'all': 'ref-show-all'
        };
        
        if (viewButtons[this.currentView]) {
            document.getElementById(viewButtons[this.currentView]).style.background = '#2980b9';
        }
    }
    
    updateMeasurementButton() {
        const btn = document.getElementById('ref-toggle-measurements');
        btn.textContent = this.showMeasurements ? '📏 Hide Measurements' : '📏 Show Measurements';
        btn.style.background = this.showMeasurements ? '#e74c3c' : '#3498db';
    }
    
    draw() {
        if (!this.fireRescue) return;
        
        // Clear canvas with sky blue background
        this.ctx.fillStyle = '#87CEEB';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw ground
        this.ctx.fillStyle = '#7f8c8d';
        this.ctx.fillRect(0, this.canvas.height - 100, this.canvas.width, 100);
        
        // Draw elements based on current view
        switch (this.currentView) {
            case 'truck':
                this.drawTruckWithMeasurements();
                break;
            case 'hydrant':
                this.drawHydrantWithMeasurements();
                break;
            case 'buildings':
                this.drawBuildingsWithMeasurements();
                break;
            case 'all':
                this.fireRescue.drawBuildings();
                this.drawTruckWithMeasurements();
                this.drawHydrantWithMeasurements();
                break;
        }
    }
    
    drawTruckWithMeasurements() {
        // Draw the truck using fire rescue's method
        this.fireRescue.drawTruck();
        this.fireRescue.drawLadder();
        this.fireRescue.drawNozzle();
        
        if (!this.showMeasurements) return;
        
        const truck = this.fireRescue.truck;
        const ladder = this.fireRescue.ladder;
        const nozzle = this.fireRescue.nozzle;
        
        this.ctx.font = '12px Arial';
        this.ctx.fillStyle = '#000';
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 1;
        
        // Main body measurements
        this.drawMeasurement(truck.x, truck.y - 15, truck.x + truck.width, truck.y - 15, `${truck.width}px`, 'top');
        this.drawMeasurement(truck.x - 15, truck.y, truck.x - 15, truck.y + truck.height, `${truck.height}px`, 'left');
        
        // Cab measurements
        this.drawMeasurement(truck.x + 80, truck.y - 35, truck.x + 120, truck.y - 35, '40px', 'top');
        this.drawMeasurement(truck.x + 125, truck.y - 20, truck.x + 125, truck.y + 10, '30px', 'right');
        
        // Wheel measurements
        this.drawRadialMeasurement(truck.x + 25, truck.y + truck.height + 15, 15, 'Wheel: 15px radius');
        this.drawRadialMeasurement(truck.x + 95, truck.y + truck.height + 15, 15, 'Wheel: 15px radius');
        
        // Hose coil measurement (if visible)
        if (this.fireRescue.gameState === 'START' || this.currentView === 'truck') {
            this.drawRadialMeasurement(truck.hoseCoil.x, truck.hoseCoil.y, truck.hoseCoil.radius, 'Hose: 20px radius');
        }
        
        // Port measurement
        this.drawRadialMeasurement(truck.port.x, truck.port.y, truck.port.radius, 'Port: 12px radius');
        
        // Ladder measurements
        this.drawMeasurement(ladder.x, ladder.y - 25, ladder.x + ladder.width, ladder.y - 25, '60px', 'top');
        
        // Position coordinates
        this.drawCoordinate(truck.x, truck.y, `(${truck.x}, ${truck.y})`);
    }
    
    drawHydrantWithMeasurements() {
        this.fireRescue.drawHydrant();
        
        if (!this.showMeasurements) return;
        
        const hydrant = this.fireRescue.hydrant;
        
        this.ctx.font = '12px Arial';
        this.ctx.fillStyle = '#000';
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 1;
        
        // Main body measurements
        this.drawMeasurement(hydrant.x - 30, hydrant.y, hydrant.x - 30, hydrant.y + hydrant.height, `${hydrant.height}px`, 'left');
        this.drawMeasurement(hydrant.x, hydrant.y + hydrant.height + 15, hydrant.x + hydrant.width, hydrant.y + hydrant.height + 15, `${hydrant.width}px`, 'bottom');
        
        // Top cap
        this.drawRadialMeasurement(hydrant.x + hydrant.width/2, hydrant.y, 25, 'Cap: 25px radius');
        
        // Port measurement
        this.drawRadialMeasurement(hydrant.port.x, hydrant.port.y, hydrant.port.radius, 'Port: 12px radius');
        
        // Valve measurements
        this.drawMeasurement(hydrant.valve.x, hydrant.valve.y - 10, hydrant.valve.x + hydrant.valve.width, hydrant.valve.y - 10, '30px', 'top');
        
        // Position coordinates
        this.drawCoordinate(hydrant.x, hydrant.y, `(${hydrant.x}, ${hydrant.y})`);
    }
    
    drawBuildingsWithMeasurements() {
        this.fireRescue.drawBuildings();
        
        if (!this.showMeasurements) return;
        
        this.ctx.font = '10px Arial';
        this.ctx.fillStyle = '#000';
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 1;
        
        this.fireRescue.buildings.forEach((building, index) => {
            // Height measurement
            this.drawMeasurement(building.x - 20, building.y, building.x - 20, building.y + building.height, `${building.height}px`, 'left');
            
            // Width measurement
            this.drawMeasurement(building.x, building.y - 10, building.x + building.width, building.y - 10, `${building.width}px`, 'top');
            
            // Building label
            this.ctx.fillText(`Building ${index + 1}`, building.x + 5, building.y + 20);
        });
    }
    
    drawMeasurement(x1, y1, x2, y2, text, position) {
        // Draw measurement line
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
        
        // Draw end markers
        const markerSize = 4;
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1 - markerSize);
        this.ctx.lineTo(x1, y1 + markerSize);
        this.ctx.moveTo(x2, y2 - markerSize);
        this.ctx.lineTo(x2, y2 + markerSize);
        this.ctx.stroke();
        
        // Draw text
        const centerX = (x1 + x2) / 2;
        const centerY = (y1 + y2) / 2;
        
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(centerX - 20, centerY - 8, 40, 16);
        this.ctx.strokeRect(centerX - 20, centerY - 8, 40, 16);
        this.ctx.fillStyle = '#000';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(text, centerX, centerY + 4);
        this.ctx.textAlign = 'start';
    }
    
    drawRadialMeasurement(x, y, radius, text) {
        // Draw radius line
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(x + radius, y);
        this.ctx.stroke();
        
        // Draw text
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(x + radius + 5, y - 8, text.length * 6 + 10, 16);
        this.ctx.strokeRect(x + radius + 5, y - 8, text.length * 6 + 10, 16);
        this.ctx.fillStyle = '#000';
        this.ctx.fillText(text, x + radius + 10, y + 4);
    }
    
    drawCoordinate(x, y, text) {
        this.ctx.fillStyle = '#e74c3c';
        this.ctx.beginPath();
        this.ctx.arc(x, y, 3, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(x + 5, y - 8, text.length * 7 + 10, 16);
        this.ctx.strokeRect(x + 5, y - 8, text.length * 7 + 10, 16);
        this.ctx.fillStyle = '#e74c3c';
        this.ctx.fillText(text, x + 10, y + 4);
    }
}

window.DeveloperReference = DeveloperReference;