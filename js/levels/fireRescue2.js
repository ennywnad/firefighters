// Fire Rescue - Rebuilt with simpler, more reliable approach
class FireRescueLevel {
    constructor() {
        this.setupScreen();
        this.canvas = document.getElementById('fireGameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.instructionText = document.getElementById('fire-game-instructions');
        
        this.gameState = 'START';
        this.mouse = { x: 0, y: 0 };
        this.isSpraying = false;
        this.fires = [];
        this.waterDrops = [];
        this.firesExtinguished = 0;
        this.waterUsed = 0;
        this.totalFires = 0;
        this.gameStartTime = Date.now();
        
        // Timer properties
        this.timerMode = 'manual'; // 'manual', '1min', '5min'
        this.timerDuration = 0; // in milliseconds
        this.timerStartTime = null;
        this.timerEnded = false;
        
        // Developer mode properties
        this.developerMode = localStorage.getItem('firefighterDebugMode') === 'true';
        this.showTruckMeasurements = false;
        this.showHydrantMeasurements = false;
        this.showBuildingMeasurements = false;
        this.showCoordinates = false;

        // Callback for syncing with options menu
        this.onDebugModeChange = null;
        
        // Audio
        this.actionSynth = new Tone.Synth({ oscillator: { type: 'triangle' } }).toDestination();
        this.waterSynth = new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.01, decay: 0.1, sustain: 0 } }).toDestination();
        this.hornSynth = new Tone.Synth({
            oscillator: { type: 'sawtooth' },
            envelope: { attack: 0.01, decay: 0.3, sustain: 0.3, release: 0.5 }
        }).toDestination();
        
        // Game objects with fixed positions
        this.truck = {
            x: 100, y: 400, width: 120, height: 80,
            hoseCoil: { x: 150, y: 430, radius: 20 },
            port: { x: 200, y: 440, radius: 12 }
        };
        
        this.hydrant = {
            x: 350, y: 420, width: 40, height: 60,
            port: { x: 350, y: 450, radius: 12 },
            valve: { x: 330, y: 400, width: 30, height: 15 }
        };
        
        this.nozzle = { x: 200, y: 300, angle: 0, attachedToTruck: false };
        this.ladder = { x: 0, y: 0, width: 60, height: 8, visible: true };
        
        this.buildings = this.createBuildings();
        this.initializeWindows();
        this.spawnInitialFires();
        
        // Set up ladder and nozzle positions on truck from the start
        this.setupTruckEquipment();
        
        this.init();
    }
    
    setupScreen() {
        this.gameScreen = document.getElementById('fire-game-screen');
    }
    
    setupTruckEquipment() {
        // Position ladder platform on top of truck from the start
        this.ladder.x = this.truck.x + 20;
        this.ladder.y = this.truck.y - 5;
        // Position nozzle on the ladder
        this.nozzle.x = this.ladder.x + this.ladder.width/2;
        this.nozzle.y = this.ladder.y - 8;
    }
    
    init() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        window.addEventListener('mouseup', () => this.handleMouseUp());
        
        // Developer mode keyboard shortcut (Ctrl+Shift+D)
        window.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                e.preventDefault();
                this.toggleDeveloperMode();
            }
        });
        
        // Add Return to Station button functionality
        const returnButton = document.getElementById('return-station-button');
        if (returnButton) {
            returnButton.addEventListener('click', () => this.returnToStation());
        }
        
        // Add timer settings event listeners
        this.setupTimerControls();
        
        // Add developer mode event listeners
        this.setupDeveloperControls();
        
        this.gameLoop();
    }
    
    setupTimerControls() {
        const timer1MinButton = document.getElementById('timer-1min-btn');
        const timer5MinButton = document.getElementById('timer-5min-btn');
        const endNowButton = document.getElementById('end-now-button');

        if (timer1MinButton) {
            timer1MinButton.addEventListener('click', () => this.setTimerMode('1min'));
        }
        if (timer5MinButton) {
            timer5MinButton.addEventListener('click', () => this.setTimerMode('5min'));
        }
        if (endNowButton) {
            endNowButton.addEventListener('click', () => this.endGameNow());
        }
    }
    
    setTimerMode(mode) {
        this.timerMode = mode;
        const statusBar = document.getElementById('fire-game-status');
        const endNowButton = document.getElementById('end-now-button');
        const timer1MinButton = document.getElementById('timer-1min-btn');
        const timer5MinButton = document.getElementById('timer-5min-btn');

        if (statusBar) statusBar.style.display = 'flex';

        // Update button visual feedback
        if (timer1MinButton) {
            timer1MinButton.style.backgroundColor = mode === '1min' ? '#27ae60' : '';
            timer1MinButton.style.color = mode === '1min' ? 'white' : '';
        }
        if (timer5MinButton) {
            timer5MinButton.style.backgroundColor = mode === '5min' ? '#27ae60' : '';
            timer5MinButton.style.color = mode === '5min' ? 'white' : '';
        }

        switch (mode) {
            case '1min':
                this.timerDuration = 60000; // 1 minute
                break;
            case '5min':
                this.timerDuration = 300000; // 5 minutes
                break;
            case 'manual':
                this.timerDuration = 0;
                if (endNowButton) endNowButton.style.display = 'inline-block';
                break;
        }

        this.timerStartTime = Date.now();
        this.timerEnded = false;
        this.updateTimerDisplay();

        // Start the actual gameplay
        this.startGameplay();
    }
    
    setupDeveloperControls() {
        const devToggleTruck = document.getElementById('dev-toggle-truck');
        const devToggleHydrant = document.getElementById('dev-toggle-hydrant');
        const devToggleBuildings = document.getElementById('dev-toggle-buildings');
        const devToggleCoords = document.getElementById('dev-toggle-coords');
        const devModeOff = document.getElementById('dev-mode-off');
        
        if (devToggleTruck) {
            devToggleTruck.addEventListener('click', () => this.toggleTruckMeasurements());
        }
        if (devToggleHydrant) {
            devToggleHydrant.addEventListener('click', () => this.toggleHydrantMeasurements());
        }
        if (devToggleBuildings) {
            devToggleBuildings.addEventListener('click', () => this.toggleBuildingMeasurements());
        }
        if (devToggleCoords) {
            devToggleCoords.addEventListener('click', () => this.toggleCoordinates());
        }
        if (devModeOff) {
            devModeOff.addEventListener('click', () => this.toggleDeveloperMode());
        }
    }
    
    toggleDeveloperMode() {
        this.developerMode = !this.developerMode;
        const devControls = document.getElementById('fire-developer-controls');

        if (devControls) {
            devControls.style.display = this.developerMode ? 'block' : 'none';
        }

        // Reset all measurement toggles when entering developer mode
        if (this.developerMode) {
            this.showTruckMeasurements = false;
            this.showHydrantMeasurements = false;
            this.showBuildingMeasurements = false;
            this.showCoordinates = false;
            this.updateDeveloperButtons();
        }

        // Save to localStorage
        localStorage.setItem('firefighterDebugMode', this.developerMode.toString());

        // Notify options menu to update button state
        if (this.onDebugModeChange) {
            this.onDebugModeChange();
        }
    }
    
    toggleTruckMeasurements() {
        this.showTruckMeasurements = !this.showTruckMeasurements;
        this.updateDeveloperButtons();
    }
    
    toggleHydrantMeasurements() {
        this.showHydrantMeasurements = !this.showHydrantMeasurements;
        this.updateDeveloperButtons();
    }
    
    toggleBuildingMeasurements() {
        this.showBuildingMeasurements = !this.showBuildingMeasurements;
        this.updateDeveloperButtons();
    }
    
    toggleCoordinates() {
        this.showCoordinates = !this.showCoordinates;
        this.updateDeveloperButtons();
    }
    
    updateDeveloperButtons() {
        const buttons = [
            { id: 'dev-toggle-truck', active: this.showTruckMeasurements },
            { id: 'dev-toggle-hydrant', active: this.showHydrantMeasurements },
            { id: 'dev-toggle-buildings', active: this.showBuildingMeasurements },
            { id: 'dev-toggle-coords', active: this.showCoordinates }
        ];

        buttons.forEach(({ id, active }) => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.classList.toggle('active', active);
            }
        });
    }

    playFireTruckHorn() {
        // Play a fire truck horn sound sequence
        setTimeout(() => this.hornSynth.triggerAttackRelease('Bb3', '4n'), 0);
        setTimeout(() => this.hornSynth.triggerAttackRelease('F3', '4n'), 200);
        setTimeout(() => this.hornSynth.triggerAttackRelease('Bb3', '4n'), 500);
        setTimeout(() => this.hornSynth.triggerAttackRelease('F3', '2n'), 700);
    }
    
    updateTimerDisplay() {
        const timerText = document.getElementById('fire-timer-text');
        if (!timerText) return;
        
        if (this.timerMode === 'manual') {
            const elapsed = Math.floor((Date.now() - this.timerStartTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            timerText.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } else {
            const remaining = Math.max(0, this.timerDuration - (Date.now() - this.timerStartTime));
            const minutes = Math.floor(remaining / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);
            timerText.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            // Check if time is up
            if (remaining <= 0 && !this.timerEnded) {
                this.endGameNow();
            }
        }
    }
    
    endGameNow() {
        this.timerEnded = true;
        setTimeout(() => {
            // End session and show scoreboard
            if (window.firefighterScoreboard) {
                window.firefighterScoreboard.endSession();
                window.firefighterScoreboard.showScoreboard();
            } else {
                // Fallback to return to station report
                this.returnToStation();
            }
        }, 500);
    }
    
    start() {
        // Reset timer properties
        this.timerMode = 'manual';
        this.timerDuration = 0;
        this.timerStartTime = null;
        this.timerEnded = false;
        
        this.gameScreen.classList.remove('hidden');

        // Play fire truck horn sound and animation
        setTimeout(() => {
            this.playFireTruckHorn();
        }, 100);

        // Auto-start with manual timer mode
        this.setTimerMode('manual');

        // Initialize developer controls visibility based on saved state
        const devControls = document.getElementById('fire-developer-controls');
        if (devControls) {
            devControls.style.display = this.developerMode ? 'block' : 'none';
        }
        
        this.resizeCanvas();
        // Double-check sizing after a moment
        setTimeout(() => this.resizeCanvas(), 50);
        
        // Set initial instructions
        this.instructionText.textContent = 'Click the hose on the truck!';
    }
    
    startGameplay() {
        // Reset game state
        this.gameState = 'START';
        this.isSpraying = false;
        this.fires = [];
        this.waterDrops = [];
        this.firesExtinguished = 0;
        this.waterUsed = 0;
        this.totalFires = 0;
        this.gameStartTime = Date.now();
        this.nozzle.attachedToTruck = false;
        this.nozzle.x = 200;
        this.nozzle.y = 300;
        this.nozzle.angle = 0;
        
        // Start scoreboard tracking
        if (window.firefighterScoreboard) {
            window.firefighterScoreboard.startSession();
        }
        
        // Store reference for scoreboard access
        window.currentFireRescueGame = this;
        
        // Reset instructions
        this.instructionText.textContent = 'Click the hose on the truck!';
        
        // Respawn initial fires
        this.spawnInitialFires();
        
        // Set up truck equipment
        this.setupTruckEquipment();
    }
    
    resizeCanvas() {
        if (this.gameScreen.classList.contains('hidden')) return;
        
        const width = this.gameScreen.clientWidth || 800;
        const height = this.gameScreen.clientHeight || 600;
        
        this.canvas.width = width;
        this.canvas.height = height;
        
        // Update positions based on canvas size
        this.truck.y = height - 180;
        this.truck.hoseCoil.y = this.truck.y + 30;
        this.truck.port.y = this.truck.y + 40;
        
        this.hydrant.y = height - 160;
        this.hydrant.port.y = this.hydrant.y + 30;
        this.hydrant.valve.y = this.hydrant.y - 20;
        
        this.nozzle.y = height - 300;
        
        // Always update ladder and nozzle positions (they're always visible now)
        this.setupTruckEquipment();
        
        // Update building heights based on new canvas size
        this.buildings.forEach((building, index) => {
            const config = [
                { height: 280 }, { height: 200 }, { height: 350 }, 
                { height: 250 }, { height: 180 }, { height: 320 }, { height: 220 }
            ][index];
            if (config) {
                building.y = height - config.height - 100;
            }
        });
        
        // Reinitialize windows after building positions change
        if (this.windows) {
            this.initializeWindows();
        }
    }
    
    createBuildings() {
        const buildings = [];
        let currentX = -20; // Start slightly off-screen
        
        // Create buildings with varied spacing and heights like the legacy version
        const buildingConfigs = [
            { width: 80, height: 280, gap: 15 },   // Tall left building
            { width: 120, height: 200, gap: 25 },  // Medium building
            { width: 90, height: 350, gap: 20 },   // Very tall center building
            { width: 110, height: 250, gap: 30 },  // Medium-tall building
            { width: 100, height: 180, gap: 15 },  // Shorter building
            { width: 85, height: 320, gap: 20 },   // Tall right building
            { width: 75, height: 220, gap: 0 }     // Final building
        ];
        
        buildingConfigs.forEach(config => {
            buildings.push({
                x: currentX,
                y: this.canvas ? this.canvas.height - config.height - 100 : 150,
                width: config.width,
                height: config.height
            });
            currentX += config.width + config.gap;
        });
        
        return buildings;
    }
    
    initializeWindows() {
        // Create window objects with positions and lighting state
        this.windows = [];
        
        this.buildings.forEach((building, buildingIndex) => {
            const windowWidth = 12;
            const windowHeight = 16;
            const windowSpacingX = Math.floor(building.width / Math.max(2, Math.floor(building.width / 25)));
            const windowSpacingY = 35;
            
            for (let y = building.y + 25; y < building.y + building.height - 25; y += windowSpacingY) {
                for (let x = building.x + 12; x < building.x + building.width - 12; x += windowSpacingX) {
                    this.windows.push({
                        x: x,
                        y: y,
                        width: windowWidth,
                        height: windowHeight,
                        isLit: Math.random() > 0.5, // Start with random state
                        nextChangeTime: Date.now() + Math.random() * 12000 + 4000 // Change in 4-16 seconds
                    });
                }
            }
        });
    }
    
    spawnInitialFires() {
        // Make sure we have buildings before spawning fires
        if (this.buildings.length === 0) {
            console.warn('No buildings available for fire spawning');
            return;
        }
        
        for (let i = 0; i < 3; i++) {
            const building = this.buildings[Math.floor(Math.random() * this.buildings.length)];
            const fire = {
                x: building.x + building.width * 0.3 + Math.random() * building.width * 0.4,
                y: building.y + Math.random() * 100, // Spawn higher up on buildings
                size: 25 + Math.random() * 15,
                life: 100,
                flicker: Math.random() * 10
            };
            this.fires.push(fire);
            this.totalFires++;
            console.log(`Spawned fire at (${fire.x}, ${fire.y}) on building at (${building.x}, ${building.y})`);
        }
    }
    
    spawnNewFire() {
        if (this.buildings.length === 0) return;
        
        const building = this.buildings[Math.floor(Math.random() * this.buildings.length)];
        const fire = {
            x: building.x + building.width * 0.3 + Math.random() * building.width * 0.4,
            y: building.y + Math.random() * 100,
            size: 25 + Math.random() * 15,
            life: 100,
            flicker: Math.random() * 10
        };
        this.fires.push(fire);
        this.totalFires++;
    }
    
    handleClick(e) {
        // Don't allow clicks until timer is selected
        if (!this.timerStartTime) return;
        
        const pos = this.getMousePos(e);
        
        switch (this.gameState) {
            case 'START':
                if (this.isInCircle(pos, this.truck.hoseCoil)) {
                    this.gameState = 'HOSE_UNCOILED';
                    this.instructionText.textContent = 'Click the truck port!';
                    this.actionSynth.triggerAttackRelease('C4', '8n');
                }
                break;
                
            case 'HOSE_UNCOILED':
                if (this.isInCircle(pos, this.truck.port)) {
                    this.gameState = 'TRUCK_CONNECTED';
                    this.instructionText.textContent = 'Connect to hydrant port!';
                    this.actionSynth.triggerAttackRelease('E4', '8n');
                }
                break;
                
            case 'TRUCK_CONNECTED':
                if (this.isInCircle(pos, this.hydrant.port)) {
                    this.gameState = 'HYDRANT_CONNECTED';
                    this.instructionText.textContent = 'Turn the valve!';
                    this.actionSynth.triggerAttackRelease('G4', '8n');
                }
                break;
                
            case 'HYDRANT_CONNECTED':
                if (this.isInRect(pos, this.hydrant.valve)) {
                    this.gameState = 'READY_TO_SPRAY';
                    this.nozzle.attachedToTruck = true;
                    this.instructionText.textContent = 'Hold mouse to spray water!';
                    this.actionSynth.triggerAttackRelease('C5', '8n');
                }
                break;
        }
    }
    
    handleMouseMove(e) {
        this.mouse = this.getMousePos(e);
        if (this.gameState === 'READY_TO_SPRAY' || this.gameState === 'SPRAYING') {
            this.updateNozzleAngle();
        }
    }
    
    handleMouseDown(e) {
        if (this.gameState === 'READY_TO_SPRAY') {
            this.gameState = 'SPRAYING';
            this.isSpraying = true;
            this.waterSynth.triggerAttack();
        }
    }
    
    handleMouseUp() {
        if (this.gameState === 'SPRAYING') {
            this.gameState = 'READY_TO_SPRAY';
            this.isSpraying = false;
            this.waterSynth.triggerRelease();
        }
    }
    
    updateNozzleAngle() {
        const dx = this.mouse.x - this.nozzle.x;
        const dy = this.mouse.y - this.nozzle.y;
        this.nozzle.angle = Math.atan2(dy, dx);
    }
    
    isInCircle(pos, circle) {
        const dist = Math.hypot(pos.x - circle.x, pos.y - circle.y);
        return dist < circle.radius;
    }
    
    isInRect(pos, rect) {
        return pos.x >= rect.x && pos.x <= rect.x + rect.width &&
               pos.y >= rect.y && pos.y <= rect.y + rect.height;
    }
    
    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) * (this.canvas.width / rect.width),
            y: (e.clientY - rect.top) * (this.canvas.height / rect.height)
        };
    }
    
    updateWindows() {
        const now = Date.now();
        this.windows.forEach(window => {
            if (now >= window.nextChangeTime) {
                // Change the window state
                window.isLit = !window.isLit;
                // Set next change time (4-16 seconds from now) - half the frequency
                window.nextChangeTime = now + Math.random() * 12000 + 4000;
            }
        });
    }
    
    update() {
        // Update timer display if timer is active
        if (this.timerStartTime && !this.timerEnded) {
            this.updateTimerDisplay();
        }
        
        // Update window lighting gradually
        this.updateWindows();
        
        // Occasionally spawn new fires during gameplay
        if (Math.random() < 0.002 && this.fires.length < 5) { // Small chance each frame
            this.spawnNewFire();
        }
        
        // Spawn water drops when spraying
        if (this.isSpraying && this.gameState === 'SPRAYING') {
            for (let i = 0; i < 3; i++) {
                this.waterDrops.push({
                    x: this.nozzle.x,
                    y: this.nozzle.y,
                    vx: Math.cos(this.nozzle.angle) * (8 + Math.random() * 4),
                    vy: Math.sin(this.nozzle.angle) * (8 + Math.random() * 4),
                    life: 60
                });
                this.waterUsed++; // Track water usage
                
                // Track water usage for scoreboard
                if (window.firefighterScoreboard) {
                    window.firefighterScoreboard.recordWaterUsed(0.5); // Each water drop = 0.5 gallons
                }
            }
        }
        
        // Update water drops
        this.waterDrops.forEach((drop, index) => {
            drop.x += drop.vx;
            drop.y += drop.vy;
            drop.vy += 0.1; // gravity
            drop.life--;
            
            if (drop.life <= 0 || drop.y > this.canvas.height) {
                this.waterDrops.splice(index, 1);
            }
        });
        
        // Update fires and check collisions
        this.fires.forEach((fire, fireIndex) => {
            fire.flicker += 0.1;
            
            // Check water collision
            this.waterDrops.forEach((drop, dropIndex) => {
                const dist = Math.hypot(drop.x - fire.x, drop.y - fire.y);
                if (dist < fire.size) {
                    fire.life -= 10;
                    this.waterDrops.splice(dropIndex, 1);
                }
            });
            
            if (fire.life <= 0) {
                this.fires.splice(fireIndex, 1);
                this.firesExtinguished++;
                this.actionSynth.triggerAttackRelease('A5', '4n');
                
                // Track fire extinguished for scoreboard
                if (window.firefighterScoreboard) {
                    window.firefighterScoreboard.recordFireExtinguished();
                }
            }
        });
        
        // Check win condition - but don't auto-end in manual mode unless explicitly ended
        if (this.fires.length === 0 && this.firesExtinguished > 0 && this.timerMode !== 'manual') {
            setTimeout(() => {
                this.endGameNow();
            }, 1000);
        } else if (this.fires.length === 0 && this.timerMode !== 'manual') {
            // Spawn a new fire to keep the game going in timed modes
            this.spawnNewFire();
        }
    }
    
    returnToStation() {
        const gameTime = Math.round((Date.now() - this.gameStartTime) / 1000);
        const waterEfficiency = this.firesExtinguished > 0 ? Math.round(this.waterUsed / this.firesExtinguished) : 0;
        
        const report = `🚒 FIRE RESCUE REPORT 🚒

🔥 Fires Encountered: ${this.totalFires}
💧 Fires Extinguished: ${this.firesExtinguished}
🏢 Fires Still Burning: ${this.fires.length}
💦 Water Drops Used: ${this.waterUsed}
⏱️ Time on Scene: ${gameTime} seconds
📊 Water per Fire: ${waterEfficiency} drops

${this.firesExtinguished === this.totalFires ? 
  '⭐ EXCELLENT WORK! All fires extinguished!' : 
  this.firesExtinguished > 0 ? 
    '✅ Good job firefighter! Some fires contained.' : 
    '⚠️ No fires extinguished. More training needed.'}`;

        showHeroReport(report);
    }
    
    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#87CEEB';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw ground
        this.ctx.fillStyle = '#7f8c8d';
        this.ctx.fillRect(0, this.canvas.height - 100, this.canvas.width, 100);
        
        this.drawBuildings();
        this.drawTruck();
        this.drawHydrant();
        this.drawLadder();
        this.drawHose();
        this.drawNozzle();
        this.drawWater();
        this.drawFires();
        this.drawHighlights();
        
        // Draw developer measurements if enabled
        if (this.developerMode) {
            this.drawDeveloperOverlays();
        }
    }
    
    drawBuildings() {
        // Draw building structures
        this.buildings.forEach(building => {
            this.ctx.fillStyle = '#bdc3c7';
            this.ctx.fillRect(building.x, building.y, building.width, building.height);
        });
        
        // Draw windows with gradual lighting changes
        this.windows.forEach(window => {
            this.ctx.fillStyle = window.isLit ? '#f1c40f' : '#34495e';
            this.ctx.fillRect(window.x, window.y, window.width, window.height);
        });
    }
    
    drawTruck() {
        // Main body
        this.ctx.fillStyle = '#e74c3c';
        this.ctx.fillRect(this.truck.x, this.truck.y, this.truck.width, this.truck.height);
        
        // Cab
        this.ctx.fillStyle = '#c0392b';
        this.ctx.fillRect(this.truck.x + 80, this.truck.y - 20, 40, 30);
        
        // Wheels
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.beginPath();
        this.ctx.arc(this.truck.x + 25, this.truck.y + this.truck.height + 15, 15, 0, Math.PI * 2);
        this.ctx.arc(this.truck.x + 95, this.truck.y + this.truck.height + 15, 15, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Hose coil
        if (this.gameState === 'START') {
            this.ctx.fillStyle = '#f1c40f';
            this.ctx.beginPath();
            this.ctx.arc(this.truck.hoseCoil.x, this.truck.hoseCoil.y, this.truck.hoseCoil.radius, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Port
        this.ctx.fillStyle = '#34495e';
        this.ctx.beginPath();
        this.ctx.arc(this.truck.port.x, this.truck.port.y, this.truck.port.radius, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    drawHydrant() {
        // Main body
        this.ctx.fillStyle = '#e74c3c';
        this.ctx.fillRect(this.hydrant.x, this.hydrant.y, this.hydrant.width, this.hydrant.height);
        
        // Top cap
        this.ctx.fillStyle = '#c0392b';
        this.ctx.beginPath();
        this.ctx.arc(this.hydrant.x + this.hydrant.width/2, this.hydrant.y, 25, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Port
        this.ctx.fillStyle = '#34495e';
        this.ctx.beginPath();
        this.ctx.arc(this.hydrant.port.x, this.hydrant.port.y, this.hydrant.port.radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Valve
        this.ctx.fillStyle = '#c0392b';
        this.ctx.fillRect(this.hydrant.valve.x, this.hydrant.valve.y, this.hydrant.valve.width, this.hydrant.valve.height);
    }
    
    drawLadder() {
        if (this.ladder.visible) {
            // Draw white ladder platform
            this.ctx.fillStyle = '#ecf0f1';
            this.ctx.fillRect(this.ladder.x, this.ladder.y, this.ladder.width, this.ladder.height);
            
            // Draw ladder rungs
            this.ctx.fillStyle = '#bdc3c7';
            for (let i = 8; i < this.ladder.width - 8; i += 12) {
                this.ctx.fillRect(this.ladder.x + i, this.ladder.y, 2, this.ladder.height);
            }
            
            // Draw support posts
            this.ctx.fillStyle = '#95a5a6';
            this.ctx.fillRect(this.ladder.x, this.ladder.y, 3, this.ladder.height);
            this.ctx.fillRect(this.ladder.x + this.ladder.width - 3, this.ladder.y, 3, this.ladder.height);
        }
    }
    
    drawHose() {
        if (this.gameState === 'TRUCK_CONNECTED') {
            // Hose to mouse
            this.ctx.strokeStyle = '#f1c40f';
            this.ctx.lineWidth = 8;
            this.ctx.beginPath();
            this.ctx.moveTo(this.truck.port.x, this.truck.port.y);
            this.ctx.quadraticCurveTo(
                (this.truck.port.x + this.mouse.x) / 2,
                this.mouse.y - 50,
                this.mouse.x,
                this.mouse.y
            );
            this.ctx.stroke();
        } else if (this.gameState !== 'START' && this.gameState !== 'HOSE_UNCOILED') {
            // Connected hose
            this.ctx.strokeStyle = '#f1c40f';
            this.ctx.lineWidth = 8;
            this.ctx.beginPath();
            this.ctx.moveTo(this.truck.port.x, this.truck.port.y);
            this.ctx.quadraticCurveTo(
                (this.truck.port.x + this.hydrant.port.x) / 2,
                Math.min(this.truck.port.y, this.hydrant.port.y) - 50,
                this.hydrant.port.x,
                this.hydrant.port.y
            );
            this.ctx.stroke();
            
            // Extended hose to nozzle
            if (this.gameState === 'READY_TO_SPRAY' || this.gameState === 'SPRAYING') {
                this.ctx.beginPath();
                this.ctx.moveTo(this.truck.port.x, this.truck.port.y);
                this.ctx.quadraticCurveTo(
                    (this.truck.port.x + this.nozzle.x) / 2,
                    Math.min(this.truck.port.y, this.nozzle.y) - 30,
                    this.nozzle.x,
                    this.nozzle.y
                );
                this.ctx.stroke();
            }
        }
    }
    
    drawNozzle() {
        if (this.ladder.visible) {
            this.ctx.save();
            this.ctx.translate(this.nozzle.x, this.nozzle.y);
            this.ctx.rotate(this.nozzle.angle);
            
            this.ctx.fillStyle = '#95a5a6';
            this.ctx.fillRect(0, -8, 40, 16);
            
            this.ctx.restore();
        }
    }
    
    drawWater() {
        this.ctx.fillStyle = '#3498db';
        this.waterDrops.forEach(drop => {
            this.ctx.beginPath();
            this.ctx.arc(drop.x, drop.y, 4, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }
    
    drawFires() {
        this.fires.forEach(fire => {
            this.ctx.save();
            this.ctx.translate(fire.x, fire.y);
            
            const opacity = fire.life / 100;
            const flicker = Math.sin(fire.flicker) * 5;
            
            // Outer flame
            this.ctx.fillStyle = `rgba(255, 165, 0, ${0.8 * opacity})`;
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.quadraticCurveTo(fire.size + flicker, -fire.size, 0, -fire.size * 2);
            this.ctx.quadraticCurveTo(-fire.size - flicker, -fire.size, 0, 0);
            this.ctx.fill();
            
            // Inner flame
            this.ctx.fillStyle = `rgba(255, 255, 0, ${0.9 * opacity})`;
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.quadraticCurveTo(fire.size * 0.6, -fire.size * 0.7, 0, -fire.size * 1.4);
            this.ctx.quadraticCurveTo(-fire.size * 0.6, -fire.size * 0.7, 0, 0);
            this.ctx.fill();
            
            this.ctx.restore();
        });
    }
    
    drawHighlights() {
        const pulse = Math.abs(Math.sin(Date.now() * 0.005)) * 5;
        this.ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
        this.ctx.lineWidth = 3;
        
        if (this.gameState === 'START') {
            this.ctx.beginPath();
            this.ctx.arc(this.truck.hoseCoil.x, this.truck.hoseCoil.y, this.truck.hoseCoil.radius + pulse, 0, Math.PI * 2);
            this.ctx.stroke();
        } else if (this.gameState === 'HOSE_UNCOILED') {
            this.ctx.beginPath();
            this.ctx.arc(this.truck.port.x, this.truck.port.y, this.truck.port.radius + pulse, 0, Math.PI * 2);
            this.ctx.stroke();
        } else if (this.gameState === 'TRUCK_CONNECTED') {
            this.ctx.beginPath();
            this.ctx.arc(this.hydrant.port.x, this.hydrant.port.y, this.hydrant.port.radius + pulse, 0, Math.PI * 2);
            this.ctx.stroke();
        } else if (this.gameState === 'HYDRANT_CONNECTED') {
            this.ctx.strokeRect(
                this.hydrant.valve.x - pulse/2, 
                this.hydrant.valve.y - pulse/2, 
                this.hydrant.valve.width + pulse, 
                this.hydrant.valve.height + pulse
            );
        }
    }
    
    gameLoop() {
        this.update();
        this.draw();
        window.fireGameAnimationId = requestAnimationFrame(() => this.gameLoop());
    }
    
    drawDeveloperOverlays() {
        this.ctx.save();
        this.ctx.font = '12px Arial';
        this.ctx.strokeStyle = '#ff0000';
        this.ctx.lineWidth = 2;
        
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
        
        this.ctx.restore();
    }
    
    drawTruckMeasurements() {
        const truck = this.truck;
        const ladder = this.ladder;
        const nozzle = this.nozzle;
        
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
        
        // Hose coil measurement (if visible)
        if (this.gameState === 'START') {
            this.drawRadialMeasurement(truck.hoseCoil.x, truck.hoseCoil.y, truck.hoseCoil.radius, 'Hose: 20px');
        }
        
        // Ladder measurements
        if (ladder.visible) {
            this.drawMeasurement(ladder.x, ladder.y - 25, ladder.x + ladder.width, ladder.y - 25, '60px', 'top');
        }
    }
    
    drawHydrantMeasurements() {
        const hydrant = this.hydrant;
        
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
        this.buildings.forEach((building, index) => {
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
            { x: this.truck.x, y: this.truck.y, label: `Truck (${this.truck.x}, ${this.truck.y})` },
            { x: this.hydrant.x, y: this.hydrant.y, label: `Hydrant (${this.hydrant.x}, ${this.hydrant.y})` },
            { x: this.nozzle.x, y: this.nozzle.y, label: `Nozzle (${Math.round(this.nozzle.x)}, ${Math.round(this.nozzle.y)})` }
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
        this.ctx.fillRect(centerX - 25, centerY - 10, 50, 20);
        this.ctx.strokeRect(centerX - 25, centerY - 10, 50, 20);
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

window.FireRescueLevel = FireRescueLevel;