// Developer Reference Screen for visualizing game elements with measurements
class DeveloperReference {
    constructor() {
        this.canvas = document.getElementById('referenceCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.screen = document.getElementById('developer-reference-screen');
        
        // Individual toggle states like the in-game mode
        this.showTruckMeasurements = false;
        this.showHydrantMeasurements = false;
        this.showBuildingMeasurements = false;
        this.showCoordinates = false;
        this.showObjects = true; // Toggle to show/hide the actual objects
        
        // Create a reference fire rescue level for measurements
        this.fireRescue = null;
        
        this.init();
    }
    
    init() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Set up button event listeners like in-game developer mode
        document.getElementById('ref-show-truck').addEventListener('click', () => this.toggleTruckMeasurements());
        document.getElementById('ref-show-hydrant').addEventListener('click', () => this.toggleHydrantMeasurements());
        document.getElementById('ref-show-buildings').addEventListener('click', () => this.toggleBuildingMeasurements());
        document.getElementById('ref-show-all').addEventListener('click', () => this.toggleCoordinates());
        document.getElementById('ref-toggle-measurements').addEventListener('click', () => this.toggleObjects());
        
        this.updateButtons();
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
    
    toggleTruckMeasurements() {
        this.showTruckMeasurements = !this.showTruckMeasurements;
        this.updateButtons();
        this.draw();
    }
    
    toggleHydrantMeasurements() {
        this.showHydrantMeasurements = !this.showHydrantMeasurements;
        this.updateButtons();
        this.draw();
    }
    
    toggleBuildingMeasurements() {
        this.showBuildingMeasurements = !this.showBuildingMeasurements;
        this.updateButtons();
        this.draw();
    }
    
    toggleCoordinates() {
        this.showCoordinates = !this.showCoordinates;
        this.updateButtons();
        this.draw();
    }
    
    toggleObjects() {
        this.showObjects = !this.showObjects;
        this.updateButtons();
        this.draw();
    }
    
    updateButtons() {
        // Update truck button
        const truckBtn = document.getElementById('ref-show-truck');
        truckBtn.textContent = '🚒 Truck';
        truckBtn.style.background = this.showTruckMeasurements ? '#27ae60' : '#3498db';
        
        // Update hydrant button  
        const hydrantBtn = document.getElementById('ref-show-hydrant');
        hydrantBtn.textContent = '🚰 Hydrant';
        hydrantBtn.style.background = this.showHydrantMeasurements ? '#27ae60' : '#3498db';
        
        // Update buildings button
        const buildingsBtn = document.getElementById('ref-show-buildings');
        buildingsBtn.textContent = '🏢 Buildings';
        buildingsBtn.style.background = this.showBuildingMeasurements ? '#27ae60' : '#3498db';
        
        // Update coordinates button (reuse the "all" button)
        const coordsBtn = document.getElementById('ref-show-all');
        coordsBtn.textContent = '📍 Coordinates';
        coordsBtn.style.background = this.showCoordinates ? '#27ae60' : '#3498db';
        
        // Update objects toggle button (reuse measurements button)
        const objectsBtn = document.getElementById('ref-toggle-measurements');
        objectsBtn.textContent = this.showObjects ? '👁️ Hide Objects' : '👁️ Show Objects';
        objectsBtn.style.background = this.showObjects ? '#e74c3c' : '#27ae60';
    }
    
    draw() {
        if (!this.fireRescue) return;
        
        // Clear canvas with sky blue background
        this.ctx.fillStyle = '#87CEEB';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw ground
        this.ctx.fillStyle = '#7f8c8d';
        this.ctx.fillRect(0, this.canvas.height - 100, this.canvas.width, 100);
        
        // Draw objects if enabled
        if (this.showObjects) {
            this.fireRescue.drawBuildings();
            this.fireRescue.drawTruck();
            this.fireRescue.drawLadder();
            this.fireRescue.drawNozzle();
            this.fireRescue.drawHydrant();
        }
        
        // Draw measurement overlays based on toggles
        if (this.showTruckMeasurements) {
            this.drawTruckMeasurements();
        }
        
        if (this.showHydrantMeasurements) {
            this.drawHydrantMeasurements();
        }
        
        if (this.showBuildingMeasurements) {
            this.drawBuildingMeasurements();
        }
        
        if (this.showCoordinates) {
            this.drawCoordinates();
        }
    }
    
    drawTruckMeasurements() {
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
        this.drawRadialMeasurement(truck.x + 25, truck.y + truck.height + 15, 15, 'Wheel: 15px');
        this.drawRadialMeasurement(truck.x + 95, truck.y + truck.height + 15, 15, 'Wheel: 15px');
        
        // Port measurement
        this.drawRadialMeasurement(truck.port.x, truck.port.y, truck.port.radius, 'Port: 12px');
        
        // Hose coil measurement
        this.drawRadialMeasurement(truck.hoseCoil.x, truck.hoseCoil.y, truck.hoseCoil.radius, 'Hose: 20px');
        
        // Ladder measurements
        if (ladder.visible) {
            this.drawMeasurement(ladder.x, ladder.y - 25, ladder.x + ladder.width, ladder.y - 25, '60px', 'top');
        }
    }
    
    drawHydrantMeasurements() {
        const hydrant = this.fireRescue.hydrant;
        
        this.ctx.font = '12px Arial';
        this.ctx.fillStyle = '#000';
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 1;
        
        // Main body measurements
        this.drawMeasurement(hydrant.x - 30, hydrant.y, hydrant.x - 30, hydrant.y + hydrant.height, `${hydrant.height}px`, 'left');
        this.drawMeasurement(hydrant.x, hydrant.y + hydrant.height + 15, hydrant.x + hydrant.width, hydrant.y + hydrant.height + 15, `${hydrant.width}px`, 'bottom');
        
        // Top cap
        this.drawRadialMeasurement(hydrant.x + hydrant.width/2, hydrant.y, 25, 'Cap: 25px');
        
        // Port measurement
        this.drawRadialMeasurement(hydrant.port.x, hydrant.port.y, hydrant.port.radius, 'Port: 12px');
        
        // Valve measurements
        this.drawMeasurement(hydrant.valve.x, hydrant.valve.y - 10, hydrant.valve.x + hydrant.valve.width, hydrant.valve.y - 10, '30px', 'top');
    }
    
    drawBuildingMeasurements() {
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
            this.ctx.fillStyle = '#000';
            this.ctx.fillText(`Building ${index + 1}`, building.x + 5, building.y + 20);
        });
    }
    
    drawCoordinates() {
        const elements = [
            { x: this.fireRescue.truck.x, y: this.fireRescue.truck.y, label: `Truck (${this.fireRescue.truck.x}, ${this.fireRescue.truck.y})` },
            { x: this.fireRescue.hydrant.x, y: this.fireRescue.hydrant.y, label: `Hydrant (${this.fireRescue.hydrant.x}, ${this.fireRescue.hydrant.y})` },
            { x: this.fireRescue.nozzle.x, y: this.fireRescue.nozzle.y, label: `Nozzle (${Math.round(this.fireRescue.nozzle.x)}, ${Math.round(this.fireRescue.nozzle.y)})` }
        ];
        
        elements.forEach(element => {
            this.drawCoordinate(element.x, element.y, element.label);
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
        
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
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
        const textWidth = this.ctx.measureText(text).width;
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        this.ctx.fillRect(x + radius + 5, y - 10, textWidth + 10, 20);
        this.ctx.strokeRect(x + radius + 5, y - 10, textWidth + 10, 20);
        this.ctx.fillStyle = '#000';
        this.ctx.fillText(text, x + radius + 10, y + 4);
    }
    
    drawCoordinate(x, y, text) {
        // Draw coordinate point
        this.ctx.fillStyle = '#e74c3c';
        this.ctx.beginPath();
        this.ctx.arc(x, y, 4, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw label
        const textWidth = this.ctx.measureText(text).width;
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        this.ctx.fillRect(x + 8, y - 10, textWidth + 10, 20);
        this.ctx.strokeRect(x + 8, y - 10, textWidth + 10, 20);
        this.ctx.fillStyle = '#e74c3c';
        this.ctx.fillText(text, x + 13, y + 4);
    }
}

window.DeveloperReference = DeveloperReference;