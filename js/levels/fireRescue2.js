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
        this.mistParticles = [];
        this.puddles = [];
        this.firesExtinguished = 0;
        this.waterUsed = 0;
        this.totalFires = 0;
        this.gameStartTime = Date.now();
        this.gracePeriodDuration = 10000; // 10 seconds in milliseconds

        // Truck entrance animation
        this.truckEntranceComplete = false;
        this.truckTargetX = 100; // Final position
        this.truckStartX = -200; // Start off-screen to the left
        this.truckSpeed = 3; // pixels per frame

        // Truck style change animation
        this.truckChanging = false;
        this.truckBackingUp = false;
        this.truckRollingIn = false;
        this.emergencyLightsFlashing = false;
        this.lightFlashTimer = 0;
        this.pendingTruckStyleChange = false;

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

        // Truck style properties
        this.truckStyle = localStorage.getItem('firefighterTruckStyle') || 'classic';
        this.newTruckStyle = null; // For pending truck style changes
        this.pendingTruckStyleChange = false;

        // Hydrant style properties
        this.hydrantStyle = localStorage.getItem('firefighterHydrantStyle') || 'classic';

        // Fun options
        this.doubleSpray = localStorage.getItem('firefighterDoubleSpray') === 'true';
        this.slowLights = localStorage.getItem('firefighterSlowLights') === 'true';
        this.fireSpread = localStorage.getItem('firefighterFireSpread') === 'true';
        this.emergencyLights = localStorage.getItem('firefighterEmergencyLights') === 'true';

        // Callbacks for syncing with options menu
        this.onDebugModeChange = null;
        this.onTruckStyleChange = null;
        
        // Audio - much gentler sounds
        this.actionSynth = new Tone.Synth({
            oscillator: { type: 'sine' },
            envelope: { attack: 0.05, decay: 0.2, sustain: 0.1, release: 0.3 }
        }).toDestination();
        this.actionSynth.volume.value = -12; // Quieter

        this.waterSynth = this.createWaterSynth();
        this.waterSynth.volume.value = -8; // Gentler water sound

        this.hornSynth = new Tone.Synth({
            oscillator: { type: 'triangle' }, // Gentler than sawtooth
            envelope: { attack: 0.1, decay: 0.4, sustain: 0.2, release: 0.8 }
        }).toDestination();
        this.hornSynth.volume.value = -10; // Quieter horn
        
        // Game objects with positions (truck starts off-screen, extended by ~1 inch)
        this.truck = {
            x: this.truckStartX, y: 400, width: 145, height: 80,
            hoseCoil: { x: this.truckStartX + 65, y: 430, radius: 20 },
            port: { x: this.truckStartX + 115, y: 440, radius: 12 }
        };

        // Second truck with extending ladder
        this.truck2 = {
            x: 0, // Will be set based on canvas width
            y: 400,
            targetX: 0, // Will be set to middle of canvas
            width: 160,
            height: 90,
            isActive: false,
            isRollingIn: false,
            hasArrived: false,
            wheelRotation: 0,
            lightFlash: false,

            ladder: {
                baseX: 0,
                baseY: -45,
                angle: 0, // 0° = horizontal
                targetAngle: 45,
                isExtending: false,
                isRetracting: false,

                baseLength: 80,
                extensionLength: 0,
                maxExtension: 60,

                rotationComplete: false,
                extensionComplete: false
            }
        };

        // Walkie-talkie for calling truck2
        this.walkieTalkie = {
            x: 0, // Will be set based on canvas width
            y: 0, // Will be set based on canvas height
            width: 50,
            height: 85,
            antennaHeight: 25,
            isHovered: false,
            isPttPressed: false // PTT = Push To Talk button
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
        this.setupSoundControls();
    }

    createWaterSynth() {
        const soundType = localStorage.getItem('waterSoundType') || 'white';

        if (soundType === 'disable') {
            // Create a silent synth
            return new Tone.Gain(0).toDestination();
        }

        // Create gentler water sounds based on type
        switch (soundType) {
            case 'pink':
                return new Tone.NoiseSynth({
                    noise: { type: 'pink' },
                    envelope: { attack: 0.05, decay: 0.3, sustain: 0.4, release: 0.5 }
                }).toDestination();

            case 'brown':
                return new Tone.NoiseSynth({
                    noise: { type: 'brown' },
                    envelope: { attack: 0.08, decay: 0.4, sustain: 0.5, release: 0.8 }
                }).toDestination();

            default: // white
                return new Tone.NoiseSynth({
                    noise: { type: 'white' },
                    envelope: { attack: 0.03, decay: 0.2, sustain: 0.3, release: 0.4 }
                }).toDestination();
        }
    }

    setupSoundControls() {
        const soundSelect = document.getElementById('sound-select');
        if (soundSelect) {
            // Set initial value from localStorage
            const savedSound = localStorage.getItem('waterSoundType') || 'white';
            soundSelect.value = savedSound;

            // Handle sound changes
            soundSelect.addEventListener('change', () => {
                const newSoundType = soundSelect.value;
                localStorage.setItem('waterSoundType', newSoundType);

                // Recreate water synth with new sound type
                if (this.waterSynth && this.waterSynth.dispose) {
                    this.waterSynth.dispose();
                }
                this.waterSynth = this.createWaterSynth();
                this.waterSynth.volume.value = -8;
            });
        }
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

    setTruckStyle(newStyle) {
        // Don't allow truck change during animations or active gameplay
        if (this.truckChanging || this.isSpraying || !this.truckEntranceComplete) {
            return;
        }

        // Only mark as pending if it's actually different from current style
        if (newStyle !== this.truckStyle) {
            this.pendingTruckStyleChange = true;
            this.newTruckStyle = newStyle; // Store the target style
        } else {
            this.pendingTruckStyleChange = false;
            this.newTruckStyle = null;
        }

        // Update radio button state immediately
        if (this.onTruckStyleChange) {
            this.onTruckStyleChange();
        }
    }

    toggleTruckStyle() {
        // Legacy method - switch to the other style
        const newStyle = this.truckStyle === 'classic' ? 'detailed' : 'classic';
        this.setTruckStyle(newStyle);
    }

    startTruckChangeAnimation() {
        // Don't start if no change is pending
        if (!this.pendingTruckStyleChange) {
            return;
        }

        // Start the truck change animation
        this.truckChanging = true;
        this.truckBackingUp = true;
        this.emergencyLightsFlashing = true;
        this.lightFlashTimer = 0;
        this.pendingTruckStyleChange = false;

        // Completely reset game state
        this.gameState = 'START';
        this.isSpraying = false;
        this.nozzle.attachedToTruck = false;
        this.nozzle.x = 200;
        this.nozzle.y = 300;
        this.nozzle.angle = 0;
        this.truckEntranceComplete = false; // Mark truck as not ready for interaction
        this.instructionText.textContent = 'Switching trucks...';

        // Clear any water effects
        this.waterDrops = [];
        this.mistParticles = [];
    }

    startTruckDriveAnimation() {
        // Don't allow during animations or active gameplay
        if (this.truckChanging || this.isSpraying || !this.truckEntranceComplete) {
            return;
        }

        // Start the drive animation without changing truck style
        this.truckChanging = true;
        this.truckBackingUp = true;
        this.emergencyLightsFlashing = true;
        this.lightFlashTimer = 0;

        // Reset game state
        this.gameState = 'START';
        this.isSpraying = false;
        this.nozzle.attachedToTruck = false;
        this.nozzle.x = 200;
        this.nozzle.y = 300;
        this.nozzle.angle = 0;
        this.truckEntranceComplete = false;

        // Clear any water effects
        this.waterDrops = [];
        this.mistParticles = [];
    }

    completeTruckStyleChange() {
        // Change the truck style to the stored new style
        if (this.newTruckStyle) {
            this.truckStyle = this.newTruckStyle;
            this.newTruckStyle = null;
        } else {
            // Fallback to toggle if no specific style was set
            this.truckStyle = this.truckStyle === 'classic' ? 'detailed' : 'classic';
        }

        // Save to localStorage
        localStorage.setItem('firefighterTruckStyle', this.truckStyle);

        // Notify options menu to update button state
        if (this.onTruckStyleChange) {
            this.onTruckStyleChange();
        }

        // Start rolling in the new truck
        this.truckBackingUp = false;
        this.truckRollingIn = true;
        this.truck.x = this.truckStartX;
        this.truck.hoseCoil.x = this.truckStartX + 50;
        this.truck.port.x = this.truckStartX + 100;
        this.setupTruckEquipment();
    }

    completeTruckDriveAnimation() {
        // Just drive back with the same truck (no style change)
        this.truckBackingUp = false;
        this.truckRollingIn = true;
        this.truck.x = -300; // Start from further off screen
        this.truck.hoseCoil.x = -300 + 50;
        this.truck.port.x = -300 + 100;
        this.setupTruckEquipment();
    }

    // ====== TRUCK 2 FUNCTIONS ======

    callTruck2() {
        if (this.truck2.isActive || this.truck2.isRollingIn) {
            // Truck already active or arriving
            return;
        }

        this.truck2.isActive = true;
        this.truck2.isRollingIn = true;
        this.truck2.hasArrived = false;
        this.truck2.x = this.canvas.width + 200; // Start off-screen right
        this.truck2.wheelRotation = 0;
        this.truck2.lightFlash = false;

        // Play horn sound
        setTimeout(() => {
            this.hornSynth.triggerAttackRelease('C4', '4n');
        }, 100);
    }

    animateTruck2() {
        if (!this.truck2.isRollingIn) return;

        // Roll from right to middle
        const speed = -4; // Negative = moving left, 4px per frame
        this.truck2.x += speed;

        // Animate wheel rotation
        this.truck2.wheelRotation += 0.2;

        // Flash emergency lights
        this.truck2.lightFlash = !this.truck2.lightFlash;

        // Check if reached target
        if (this.truck2.x <= this.truck2.targetX) {
            this.truck2.x = this.truck2.targetX;
            this.truck2.isRollingIn = false;
            this.truck2.hasArrived = true;

            // Play arrival sound
            this.actionSynth.triggerAttackRelease('G3', '4n');
        }
    }

    toggleLadder() {
        if (!this.truck2.hasArrived) {
            return; // Truck must arrive first
        }

        const ladder = this.truck2.ladder;

        if (ladder.isExtending || ladder.isRetracting) {
            return; // Already animating
        }

        if (ladder.extensionComplete) {
            // Retract ladder
            this.startLadderRetraction();
        } else {
            // Extend ladder
            this.startLadderExtension();
        }
    }

    startLadderExtension() {
        const ladder = this.truck2.ladder;

        // Reset ladder state
        ladder.angle = 0;
        ladder.extensionLength = 0;
        ladder.isExtending = true;
        ladder.isRetracting = false;
        ladder.rotationComplete = false;
        ladder.extensionComplete = false;

        // Play sound
        this.actionSynth.triggerAttackRelease('A4', '8n');
    }

    startLadderRetraction() {
        const ladder = this.truck2.ladder;

        ladder.isExtending = false;
        ladder.isRetracting = true;
        ladder.rotationComplete = false;
        ladder.extensionComplete = false;

        // Play sound
        this.actionSynth.triggerAttackRelease('F4', '8n');
    }

    animateLadder() {
        const ladder = this.truck2.ladder;

        if (ladder.isExtending) {
            // PHASE 1: Rotation (0° to 45°)
            if (!ladder.rotationComplete) {
                const rotationSpeed = 1.5; // degrees per frame
                ladder.angle = Math.min(ladder.angle + rotationSpeed, ladder.targetAngle);

                if (ladder.angle >= ladder.targetAngle) {
                    ladder.rotationComplete = true;
                    // Play lock sound
                    this.actionSynth.triggerAttackRelease('C5', '16n');
                }
                return;
            }

            // PHASE 2: Extension (telescoping)
            if (!ladder.extensionComplete) {
                const extensionSpeed = 2; // pixels per frame
                ladder.extensionLength = Math.min(
                    ladder.extensionLength + extensionSpeed,
                    ladder.maxExtension
                );

                if (ladder.extensionLength >= ladder.maxExtension) {
                    ladder.extensionComplete = true;
                    ladder.isExtending = false;
                    // Play final lock sound
                    this.actionSynth.triggerAttackRelease('E5', '16n');
                }
            }
        } else if (ladder.isRetracting) {
            // PHASE 1: Retract extension first
            if (ladder.extensionLength > 0) {
                const retractionSpeed = 2; // pixels per frame
                ladder.extensionLength = Math.max(
                    ladder.extensionLength - retractionSpeed,
                    0
                );
                return;
            }

            // PHASE 2: Rotate back down to 0°
            if (ladder.angle > 0) {
                const rotationSpeed = 1.5; // degrees per frame
                ladder.angle = Math.max(ladder.angle - rotationSpeed, 0);

                if (ladder.angle <= 0) {
                    ladder.angle = 0;
                    ladder.isRetracting = false;
                    ladder.extensionComplete = false;
                    ladder.rotationComplete = false;
                    // Play final sound
                    this.actionSynth.triggerAttackRelease('C4', '16n');
                }
            }
        }
    }

    spreadFires() {
        if (this.fires.length === 0 || this.fires.length >= 20) return; // Allow more fires (was 12)

        // Find fires that are mature enough to spread (at full size and not being extinguished)
        const matureFires = this.fires.filter(fire => !fire.isGrowing && fire.life > 70);
        if (matureFires.length === 0) return;

        // Pick a random mature fire to spread from
        const sourceFire = matureFires[Math.floor(Math.random() * matureFires.length)];

        // Initialize spread timer if not exists
        if (!sourceFire.lastSpreadTime) {
            sourceFire.lastSpreadTime = Date.now();
        }

        // Faster spreading: only 2 seconds between spreads (was 3)
        if (Date.now() - sourceFire.lastSpreadTime < 2000) {
            return;
        }

        // 70% chance of close spread, 30% chance of distant spread
        const isCloseSpread = Math.random() < 0.7;

        // Spread both horizontally and vertically
        // Bias spread direction: 60% horizontal, 40% vertical
        const isHorizontalSpread = Math.random() < 0.6;

        let newX, newY;
        if (isCloseSpread) {
            // Close spread: fires spread to adjacent areas (20-60 pixels away)
            if (isHorizontalSpread) {
                const direction = Math.random() < 0.5 ? -1 : 1;
                const distance = 20 + Math.random() * 40; // 20-60 pixels
                newX = sourceFire.x + (direction * distance);
                newY = sourceFire.y + (Math.random() - 0.5) * 20; // Very small vertical variation
            } else {
                const direction = Math.random() < 0.5 ? -1 : 1;
                const distance = 20 + Math.random() * 40; // 20-60 pixels
                newY = sourceFire.y + (direction * distance);
                newX = sourceFire.x + (Math.random() - 0.5) * 20; // Very small horizontal variation
            }
        } else {
            // Distant spread: embers jumping further (60-120 pixels)
            if (isHorizontalSpread) {
                const direction = Math.random() < 0.5 ? -1 : 1;
                const distance = 60 + Math.random() * 60; // 60-120 pixels
                newX = sourceFire.x + (direction * distance);
                newY = sourceFire.y + (Math.random() - 0.5) * 40; // Some vertical variation
            } else {
                const direction = Math.random() < 0.5 ? -1 : 1;
                const distance = 60 + Math.random() * 60; // 60-120 pixels
                newY = sourceFire.y + (direction * distance);
                newX = sourceFire.x + (Math.random() - 0.5) * 40; // Some horizontal variation
            }
        }

        // Make sure new fire is within game bounds and on a building
        if (newX < 50 || newX > this.canvas.width - 50 || newY < 50 || newY > this.canvas.height - 150) {
            return;
        }

        // Check if new fire location is on a building
        const isOnBuilding = this.buildings.some(building => {
            return newX >= building.x &&
                   newX <= building.x + building.width &&
                   newY >= building.y &&
                   newY <= building.y + building.height;
        });

        if (!isOnBuilding) {
            return; // Don't spawn fires in empty space
        }

        // Reduced minimum distance: allow closer fires (30 pixels instead of 50)
        const tooClose = this.fires.some(fire => {
            return Math.hypot(fire.x - newX, fire.y - newY) < 30;
        });

        if (tooClose) {
            return; // Don't spawn overlapping fires
        }

        // Create the new spreading fire
        const targetSize = 20 + Math.random() * 12;
        this.fires.push({
            x: newX,
            y: newY,
            size: 0, // Start with size 0
            targetSize: targetSize,
            growthRate: targetSize / 60, // Grow to full size over 1 second (60fps * 1)
            life: 100,
            flicker: Math.random() * 10,
            isGrowing: true,
            spreadFrom: sourceFire // Track where it spread from
        });
        this.totalFires++;

        // Update the source fire's spread timer
        sourceFire.lastSpreadTime = Date.now();
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

        // Auto-start with manual timer mode and begin gameplay immediately
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
        this.mistParticles = [];
        this.puddles = [];
        this.firesExtinguished = 0;
        this.waterUsed = 0;
        this.totalFires = 0;
        this.gameStartTime = Date.now();

        // Reset truck entrance animation
        this.truckEntranceComplete = false;
        this.truck.x = this.truckStartX;
        this.truck.hoseCoil.x = this.truckStartX + 50;
        this.truck.port.x = this.truckStartX + 100;

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
        this.instructionText.textContent = 'Fire truck arriving on scene!';
        
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

        // Update truck2 positions
        this.truck2.y = height - 190; // Slightly lower to account for larger size
        this.truck2.targetX = width / 2; // Middle of canvas
        if (!this.truck2.isActive) {
            this.truck2.x = width + 200; // Start off-screen right
        }

        // Update walkie-talkie position (bottom-right corner on the ground)
        this.walkieTalkie.x = width - 70;
        this.walkieTalkie.y = height - 95; // Position on the grey ground

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
        // Preserve existing window lighting states if windows already exist
        const existingWindows = this.windows ? [...this.windows] : [];
        this.windows = [];

        let windowIndex = 0;
        this.buildings.forEach((building, buildingIndex) => {
            const windowWidth = 12;
            const windowHeight = 16;
            const windowSpacingX = Math.floor(building.width / Math.max(2, Math.floor(building.width / 25)));
            const windowSpacingY = 35;

            for (let y = building.y + 25; y < building.y + building.height - 25; y += windowSpacingY) {
                for (let x = building.x + 12; x < building.x + building.width - 12; x += windowSpacingX) {
                    const existingWindow = existingWindows[windowIndex];

                    // Realistic office lighting:
                    // - 75% chance window is lit (most offices have lights on during emergencies)
                    // - Only 20% of windows are "dynamic" (people moving, lights toggling)
                    // - 80% stay static throughout the scene
                    const isDynamic = Math.random() < 0.2;
                    const initialLit = existingWindow ? existingWindow.isLit : Math.random() > 0.25;

                    this.windows.push({
                        x: x,
                        y: y,
                        width: windowWidth,
                        height: windowHeight,
                        isLit: initialLit,
                        isDynamic: isDynamic, // Only some windows change
                        nextChangeTime: existingWindow ? existingWindow.nextChangeTime : Date.now() + Math.random() * 60000 + 30000 // 30-90 seconds
                    });
                    windowIndex++;
                }
            }
        });
    }
    
    spawnInitialFires() {
        // Don't spawn fires during grace period
        return;
    }

    spawnFiresAfterGrace() {
        // Make sure we have buildings before spawning fires
        if (this.buildings.length === 0) {
            console.warn('No buildings available for fire spawning');
            return;
        }

        for (let i = 0; i < 3; i++) {
            const building = this.buildings[Math.floor(Math.random() * this.buildings.length)];
            const targetSize = 25 + Math.random() * 15;
            const fire = {
                x: building.x + building.width * 0.3 + Math.random() * building.width * 0.4,
                y: building.y + Math.random() * 100, // Spawn higher up on buildings
                size: 0, // Start with size 0
                targetSize: targetSize, // Size it will grow to
                growthRate: targetSize / 60, // Grow to full size over 1 second (60fps * 1)
                life: 100,
                flicker: Math.random() * 10,
                isGrowing: true
            };
            this.fires.push(fire);
            this.totalFires++;
            console.log(`Spawned fire at (${fire.x}, ${fire.y}) on building at (${building.x}, ${building.y})`);
        }
    }
    
    spawnNewFire() {
        if (this.buildings.length === 0) return;

        const building = this.buildings[Math.floor(Math.random() * this.buildings.length)];
        const targetSize = 25 + Math.random() * 15;
        const fire = {
            x: building.x + building.width * 0.3 + Math.random() * building.width * 0.4,
            y: building.y + Math.random() * 100,
            size: 0, // Start with size 0
            targetSize: targetSize, // Size it will grow to
            growthRate: targetSize / 60, // Grow to full size over 1 second (60fps * 1)
            life: 100,
            flicker: Math.random() * 10,
            isGrowing: true
        };
        this.fires.push(fire);
        this.totalFires++;
    }

    createPuddle(x, y) {
        // Only create puddles on valid surfaces
        const groundLevel = this.canvas.height - 100;
        const isOnGround = y >= groundLevel;

        // Check if puddle is on a building surface
        const isOnBuilding = this.buildings.some(building => {
            return x >= building.x &&
                   x <= building.x + building.width &&
                   y >= building.y &&
                   y <= building.y + building.height;
        });

        // Only create puddle if it's on ground or on a building
        if (!isOnGround && !isOnBuilding) {
            return;
        }

        // Check if there's already a puddle nearby (within 30 pixels)
        const nearbyPuddle = this.puddles.find(puddle =>
            Math.hypot(puddle.x - x, puddle.y - y) < 30
        );

        if (nearbyPuddle) {
            // Grow existing puddle (no size limit, can cover entire street)
            nearbyPuddle.maxSize += 3;
            const maxOpacity = nearbyPuddle.isOnBuilding ? 0.45 : 0.9; // Half opacity for buildings
            nearbyPuddle.opacity = Math.min(nearbyPuddle.opacity + 0.05, maxOpacity);
        } else {
            // Create new puddle
            const maxSize = 20 + Math.random() * 15;
            const baseFadeRate = 0.0005 / (maxSize / 25);
            this.puddles.push({
                x: x,
                y: y,
                size: 0,
                maxSize: maxSize,
                growthRate: 1.0, // Faster growth for more responsive feel
                opacity: isOnBuilding ? 0.3 : 0.6, // Start lighter on buildings
                fadeRate: isOnBuilding ? baseFadeRate * 2 : baseFadeRate, // Buildings dry twice as fast
                isOnBuilding: isOnBuilding
            });

            // Limit number of puddles for performance
            if (this.puddles.length > 30) {
                this.puddles.shift(); // Remove oldest puddle
            }
        }
    }

    handleClick(e) {
        const pos = this.getMousePos(e);

        // Check walkie-talkie click (always available, larger hit area)
        const wt = this.walkieTalkie;
        const wtRect = {
            x: wt.x - 5, // Add padding for easier clicking
            y: wt.y - wt.antennaHeight - 5,
            width: wt.width + 10,
            height: wt.height + wt.antennaHeight + 10
        };
        if (this.isInRect(pos, wtRect)) {
            // Visual feedback - press the PTT button
            this.walkieTalkie.isPttPressed = true;
            setTimeout(() => {
                this.walkieTalkie.isPttPressed = false;
            }, 150);

            if (!this.truck2.hasArrived) {
                this.callTruck2();
            } else {
                this.toggleLadder();
            }
            return;
        }

        // Check truck2 click (toggle ladder)
        if (this.truck2.hasArrived) {
            const truck2Rect = {
                x: this.truck2.x,
                y: this.truck2.y,
                width: this.truck2.width,
                height: this.truck2.height
            };
            if (this.isInRect(pos, truck2Rect)) {
                this.toggleLadder();
                return;
            }
        }

        // Don't allow clicks until truck entrance is complete or during truck changing
        if (!this.truckEntranceComplete || this.truckChanging) return;

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
        // Don't handle mouse moves during truck changing
        if (this.truckChanging) return;

        this.mouse = this.getMousePos(e);

        // Check if hovering over walkie-talkie
        const wt = this.walkieTalkie;
        const wtRect = {
            x: wt.x - 5,
            y: wt.y - wt.antennaHeight - 5,
            width: wt.width + 10,
            height: wt.height + wt.antennaHeight + 10
        };
        this.walkieTalkie.isHovered = this.isInRect(this.mouse, wtRect);

        if (this.gameState === 'READY_TO_SPRAY' || this.gameState === 'SPRAYING') {
            this.updateNozzleAngle();
        }
    }
    
    handleMouseDown(e) {
        // Don't handle mouse down during truck changing
        if (this.truckChanging) return;

        if (this.gameState === 'READY_TO_SPRAY') {
            this.gameState = 'SPRAYING';
            this.isSpraying = true;
            // Only trigger water sound if it's not disabled
            if (this.waterSynth && this.waterSynth.triggerAttack) {
                this.waterSynth.triggerAttack();
            }
        }
    }

    handleMouseUp() {
        // Don't handle mouse up during truck changing
        if (this.truckChanging) return;

        if (this.gameState === 'SPRAYING') {
            this.gameState = 'READY_TO_SPRAY';
            this.isSpraying = false;
            // Only release water sound if it's not disabled
            if (this.waterSynth && this.waterSynth.triggerRelease) {
                this.waterSynth.triggerRelease();
            }
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
            // Only update dynamic windows (the 20% that change)
            if (window.isDynamic && now >= window.nextChangeTime) {
                // Change the window state
                window.isLit = !window.isLit;

                // Set next change time - realistic office timing
                if (this.slowLights) {
                    window.nextChangeTime = now + Math.random() * 80000 + 40000; // 40-120 seconds (very slow)
                } else {
                    window.nextChangeTime = now + Math.random() * 60000 + 30000; // 30-90 seconds
                }
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

        // Handle truck entrance animation
        if (!this.truckEntranceComplete && this.truck.x < this.truckTargetX) {
            this.truck.x += this.truckSpeed;
            this.truck.hoseCoil.x += this.truckSpeed;
            this.truck.port.x += this.truckSpeed;

            // Update ladder and nozzle positions if they exist
            if (this.ladder && this.nozzle) {
                this.setupTruckEquipment();
            }

            if (this.truck.x >= this.truckTargetX) {
                this.truck.x = this.truckTargetX;
                this.truck.hoseCoil.x = this.truckTargetX + 50;
                this.truck.port.x = this.truckTargetX + 100;
                this.truckEntranceComplete = true;
                this.setupTruckEquipment();

                // Update instructions when truck arrives
                this.instructionText.textContent = 'Click the hose on the truck!';
            }
        }

        // Handle truck style change animation
        if (this.truckChanging) {
            if (this.truckBackingUp) {
                // Move truck backward off screen
                const backupSpeed = this.truckSpeed * 4; // Much faster backup for dramatic effect
                this.truck.x -= backupSpeed;
                this.truck.hoseCoil.x -= backupSpeed;
                this.truck.port.x -= backupSpeed;

                // Also update ladder and nozzle positions
                this.setupTruckEquipment();

                // When truck is completely off screen, either change style or just drive back
                if (this.truck.x <= -300) { // Go much further off screen
                    if (this.newTruckStyle) {
                        // We have a style change to make
                        this.completeTruckStyleChange();
                    } else {
                        // Just a drive animation, return with same truck
                        this.completeTruckDriveAnimation();
                    }
                }
            } else if (this.truckRollingIn) {
                // Roll new truck in (faster for dramatic effect)
                const rollInSpeed = this.truckSpeed * 2;
                this.truck.x += rollInSpeed;
                this.truck.hoseCoil.x += rollInSpeed;
                this.truck.port.x += rollInSpeed;

                // Update ladder and nozzle positions
                this.setupTruckEquipment();

                if (this.truck.x >= this.truckTargetX) {
                    this.truck.x = this.truckTargetX;
                    this.truck.hoseCoil.x = this.truckTargetX + 50;
                    this.truck.port.x = this.truckTargetX + 100;
                    this.setupTruckEquipment();

                    // End animation and reset game properly
                    this.truckRollingIn = false;
                    this.truckChanging = false;
                    this.emergencyLightsFlashing = false;
                    this.truckEntranceComplete = true;

                    // Update instructions for new truck
                    this.instructionText.textContent = 'Click the hose on the truck!';
                }
            }
        }

        // Update emergency lights flashing
        if (this.emergencyLightsFlashing) {
            this.lightFlashTimer++;
        }

        // Update truck2 animations
        if (this.truck2.isActive) {
            this.animateTruck2();
            this.animateLadder();
        }

        // Check if grace period has ended and spawn initial fires
        const timeSinceStart = Date.now() - this.gameStartTime;
        if (timeSinceStart >= this.gracePeriodDuration && this.fires.length === 0 && this.totalFires === 0) {
            this.spawnFiresAfterGrace();
            this.instructionText.textContent = 'Click the hose on the truck!';
        }

        // Occasionally spawn new fires during gameplay (only after grace period)
        if (timeSinceStart >= this.gracePeriodDuration && Math.random() < 0.002 && this.fires.length < 5) {
            this.spawnNewFire();
        }

        // Fire spreading - fires spawn nearby fires if option enabled
        // More aggressive spreading rate: check more frequently
        if (this.fireSpread && timeSinceStart >= this.gracePeriodDuration && Math.random() < 0.008) {
            this.spreadFires();
        }
        
        // Spawn water drops when spraying
        if (this.isSpraying && this.gameState === 'SPRAYING') {
            // Main water stream - fewer but more powerful drops
            for (let i = 0; i < 2; i++) {
                this.waterDrops.push({
                    x: this.nozzle.x,
                    y: this.nozzle.y,
                    vx: Math.cos(this.nozzle.angle) * (10 + Math.random() * 3),
                    vy: Math.sin(this.nozzle.angle) * (10 + Math.random() * 3),
                    life: 80,
                    size: 4 + Math.random() * 2,
                    isMist: false
                });
                this.waterUsed++; // Track water usage

                // Track water usage for scoreboard
                if (window.firefighterScoreboard) {
                    window.firefighterScoreboard.recordWaterUsed(0.5); // Each water drop = 0.5 gallons
                }
            }

            // Regular mist particles - lighter, more affected by gravity
            for (let i = 0; i < 4; i++) {
                const spreadAngle = this.nozzle.angle + (Math.random() - 0.5) * 0.8; // More spread
                const speed = 4 + Math.random() * 4; // Slower than main stream
                this.mistParticles.push({
                    x: this.nozzle.x + Math.cos(this.nozzle.angle) * 20, // Start a bit ahead
                    y: this.nozzle.y + Math.sin(this.nozzle.angle) * 20,
                    vx: Math.cos(spreadAngle) * speed,
                    vy: Math.sin(spreadAngle) * speed,
                    life: 40 + Math.random() * 20,
                    size: 1 + Math.random() * 2,
                    opacity: 0.4 + Math.random() * 0.4,
                    type: 'light'
                });
            }

            // Heavier mist below the main jet - more concentrated under the stream
            for (let i = 0; i < 8; i++) {
                // Bias the angle slightly downward from the main jet
                const downwardBias = this.nozzle.angle + 0.3 + (Math.random() - 0.5) * 0.6;
                const speed = 3 + Math.random() * 3; // Even slower
                const startDistance = 25 + Math.random() * 15; // Start further out
                this.mistParticles.push({
                    x: this.nozzle.x + Math.cos(this.nozzle.angle) * startDistance,
                    y: this.nozzle.y + Math.sin(this.nozzle.angle) * startDistance,
                    vx: Math.cos(downwardBias) * speed,
                    vy: Math.sin(downwardBias) * speed,
                    life: 60 + Math.random() * 30, // Longer lasting
                    size: 1.5 + Math.random() * 2.5, // Slightly larger
                    opacity: 0.5 + Math.random() * 0.3,
                    type: 'heavy'
                });
            }
        }
        
        // Update water drops with enhanced gravity
        this.waterDrops.forEach((drop, index) => {
            drop.x += drop.vx;
            drop.y += drop.vy;
            drop.vy += 0.15; // Enhanced gravity for more realistic arc
            drop.life--;

            // Check if water hits the ground
            if (drop.y >= this.canvas.height - 100) {
                this.createPuddle(drop.x, this.canvas.height - 100);
                this.waterDrops.splice(index, 1);
            } else if (drop.life <= 0) {
                // When water drop expires (hits fire or disappears), create puddle where it lands
                this.createPuddle(drop.x, Math.min(drop.y, this.canvas.height - 100));
                this.waterDrops.splice(index, 1);
            } else if (drop.y > this.canvas.height) {
                this.waterDrops.splice(index, 1);
            }
        });

        // Update mist particles with different physics for heavy vs light mist
        this.mistParticles.forEach((mist, index) => {
            mist.x += mist.vx;
            mist.y += mist.vy;

            // Different gravity and air resistance based on mist type
            if (mist.type === 'heavy') {
                mist.vy += 0.06; // Slower fall than light mist
                mist.vx *= 0.98; // More air resistance
            } else {
                mist.vy += 0.08; // Light mist falls a bit faster
                mist.vx *= 0.99; // Less air resistance
            }

            mist.life--;
            mist.opacity *= 0.985; // Slightly slower fade

            // Remove mist particles when they fade or hit ground
            if (mist.life <= 0 || mist.opacity < 0.1 || mist.y >= this.canvas.height - 100) {
                // Mist doesn't create puddles, just disappears
                this.mistParticles.splice(index, 1);
            }
        });

        // Update puddles
        this.puddles.forEach((puddle, index) => {
            // Grow puddle if not at max size
            if (puddle.size < puddle.maxSize) {
                puddle.size += puddle.growthRate;
                if (puddle.size > puddle.maxSize) {
                    puddle.size = puddle.maxSize;
                }
            }

            // Fade puddle over time
            puddle.opacity -= puddle.fadeRate;

            // Remove fully faded puddles
            if (puddle.opacity <= 0) {
                this.puddles.splice(index, 1);
            }
        });

        // Update fires and check collisions
        this.fires.forEach((fire, fireIndex) => {
            fire.flicker += 0.1;

            // Handle fire growth animation
            if (fire.isGrowing && fire.size < fire.targetSize) {
                fire.size += fire.growthRate;
                if (fire.size >= fire.targetSize) {
                    fire.size = fire.targetSize;
                    fire.isGrowing = false;
                }
            }
            
            // Check water collision with main drops
            this.waterDrops.forEach((drop, dropIndex) => {
                const dist = Math.hypot(drop.x - fire.x, drop.y - fire.y);
                if (dist < fire.size) {
                    fire.life -= 12; // Main drops are more effective
                    this.waterDrops.splice(dropIndex, 1);
                }
            });

            // Check mist collision (less effective but still works)
            this.mistParticles.forEach((mist, mistIndex) => {
                const dist = Math.hypot(mist.x - fire.x, mist.y - fire.y);
                if (dist < fire.size) {
                    fire.life -= 3; // Mist is less effective
                    this.mistParticles.splice(mistIndex, 1);
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
        // Clear canvas with more distinct sky blue
        this.ctx.fillStyle = '#5dade2';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw ground
        this.ctx.fillStyle = '#7f8c8d';
        this.ctx.fillRect(0, this.canvas.height - 100, this.canvas.width, 100);
        
        this.drawBuildings();
        this.drawPuddles();
        this.drawTruck();
        this.drawTruck2(); // Draw second truck
        this.drawHydrant();
        this.drawLadder();
        this.drawHose();
        this.drawNozzle();
        this.drawWater();
        this.drawFires();
        this.drawHighlights();
        this.drawWalkieTalkie(); // Draw walkie-talkie

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
        if (this.truckStyle === 'detailed') {
            this.drawDetailedTruck();
        } else {
            this.drawClassicTruck();
        }
    }

    drawClassicTruck() {
        // Main body
        this.ctx.fillStyle = '#e74c3c';
        this.ctx.fillRect(this.truck.x, this.truck.y, this.truck.width, this.truck.height);

        // Cab (at right edge)
        this.ctx.fillStyle = '#c0392b';
        this.ctx.fillRect(this.truck.x + 105, this.truck.y - 20, 40, 30);

        // Emergency lights on cab roof (smaller for classic truck)
        const shouldFlash = (this.emergencyLightsFlashing && Math.floor(this.lightFlashTimer / 8) % 2 === 0) ||
                          (this.emergencyLights && Math.floor(Date.now() / 300) % 2 === 0);
        if (shouldFlash) {
            this.ctx.fillStyle = '#fff200'; // Bright yellow when flashing
        } else {
            this.ctx.fillStyle = '#e74c3c'; // Normal red
        }
        this.ctx.beginPath();
        this.ctx.arc(this.truck.x + 115, this.truck.y - 25, 2, 0, Math.PI * 2);
        this.ctx.arc(this.truck.x + 135, this.truck.y - 25, 2, 0, Math.PI * 2);
        this.ctx.fill();

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

    drawDetailedTruck() {
        // Main body with panels
        this.ctx.fillStyle = '#e74c3c';
        this.ctx.fillRect(this.truck.x, this.truck.y, this.truck.width, this.truck.height);

        // Equipment compartment panels
        this.ctx.strokeStyle = '#c0392b';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(this.truck.x + 10, this.truck.y + 10, 25, 25);
        this.ctx.strokeRect(this.truck.x + 40, this.truck.y + 10, 25, 25);
        this.ctx.strokeRect(this.truck.x + 10, this.truck.y + 40, 25, 25);
        this.ctx.strokeRect(this.truck.x + 40, this.truck.y + 40, 25, 25);

        // Cab with more detail (at right edge)
        this.ctx.fillStyle = '#c0392b';
        this.ctx.fillRect(this.truck.x + 105, this.truck.y - 20, 40, 30);

        // Cab windows
        this.ctx.fillStyle = '#3498db';
        this.ctx.fillRect(this.truck.x + 110, this.truck.y - 15, 30, 20);

        // Horizontal ladder on top
        const ladderY = this.truck.y - 8;
        this.ctx.fillStyle = '#95a5a6';
        this.ctx.fillRect(this.truck.x + 15, ladderY, 80, 6);

        // Ladder rungs
        this.ctx.fillStyle = '#7f8c8d';
        for (let i = 0; i < 6; i++) {
            const rungX = this.truck.x + 20 + (i * 12);
            this.ctx.fillRect(rungX, ladderY, 2, 6);
        }

        // Ladder mounting brackets
        this.ctx.fillStyle = '#34495e';
        this.ctx.fillRect(this.truck.x + 12, ladderY - 2, 6, 10);
        this.ctx.fillRect(this.truck.x + 92, ladderY - 2, 6, 10);

        // Emergency lights on top (flash during truck change animation or continuously if enabled)
        const shouldFlash = (this.emergencyLightsFlashing && Math.floor(this.lightFlashTimer / 8) % 2 === 0) ||
                          (this.emergencyLights && Math.floor(Date.now() / 300) % 2 === 0);
        if (shouldFlash) {
            this.ctx.fillStyle = '#fff200'; // Bright yellow when flashing
        } else {
            this.ctx.fillStyle = '#e74c3c'; // Normal red
        }
        this.ctx.beginPath();
        this.ctx.arc(this.truck.x + 30, this.truck.y - 12, 3, 0, Math.PI * 2);
        this.ctx.arc(this.truck.x + 70, this.truck.y - 12, 3, 0, Math.PI * 2);
        this.ctx.fill();

        // Wheels with more detail
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.beginPath();
        this.ctx.arc(this.truck.x + 25, this.truck.y + this.truck.height + 15, 15, 0, Math.PI * 2);
        this.ctx.arc(this.truck.x + 95, this.truck.y + this.truck.height + 15, 15, 0, Math.PI * 2);
        this.ctx.fill();

        // Wheel rims
        this.ctx.fillStyle = '#95a5a6';
        this.ctx.beginPath();
        this.ctx.arc(this.truck.x + 25, this.truck.y + this.truck.height + 15, 8, 0, Math.PI * 2);
        this.ctx.arc(this.truck.x + 95, this.truck.y + this.truck.height + 15, 8, 0, Math.PI * 2);
        this.ctx.fill();

        // Bumper (at right edge)
        this.ctx.fillStyle = '#34495e';
        this.ctx.fillRect(this.truck.x + 100, this.truck.y + this.truck.height - 5, 45, 8);

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

    // ====== TRUCK 2 DRAWING FUNCTIONS ======

    drawTruck2() {
        if (!this.truck2.isActive) return;

        const truck = this.truck2;

        // Main body with panels (based on detailed truck)
        this.ctx.fillStyle = '#e74c3c';
        this.ctx.fillRect(truck.x, truck.y, truck.width, truck.height);

        // Equipment compartment panels
        this.ctx.strokeStyle = '#c0392b';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(truck.x + 10, truck.y + 10, 28, 28);
        this.ctx.strokeRect(truck.x + 43, truck.y + 10, 28, 28);
        this.ctx.strokeRect(truck.x + 10, truck.y + 43, 28, 28);
        this.ctx.strokeRect(truck.x + 43, truck.y + 43, 28, 28);

        // Cab with more detail (at right edge)
        this.ctx.fillStyle = '#c0392b';
        this.ctx.fillRect(truck.x + 115, truck.y - 22, 45, 32);

        // Cab windows
        this.ctx.fillStyle = '#3498db';
        this.ctx.fillRect(truck.x + 120, truck.y - 17, 35, 22);

        // Emergency lights on top (flash during arrival or when ladder is active)
        const shouldFlash = (truck.isRollingIn && truck.lightFlash) ||
                          (this.emergencyLights && Math.floor(Date.now() / 300) % 2 === 0);
        if (shouldFlash) {
            this.ctx.fillStyle = '#fff200'; // Bright yellow when flashing
        } else {
            this.ctx.fillStyle = '#e74c3c'; // Normal red
        }
        this.ctx.beginPath();
        this.ctx.arc(truck.x + 130, truck.y - 25, 3, 0, Math.PI * 2);
        this.ctx.arc(truck.x + 145, truck.y - 25, 3, 0, Math.PI * 2);
        this.ctx.fill();

        // Wheels with rotation animation
        this.drawTruck2Wheels(truck);

        // Bumper (at right edge)
        this.ctx.fillStyle = '#34495e';
        this.ctx.fillRect(truck.x + 110, truck.y + truck.height - 5, 50, 8);

        // Draw the extending ladder
        this.drawTruck2Ladder(truck);
    }

    drawTruck2Wheels(truck) {
        const wheelRadius = 18;
        const wheelPositions = [
            truck.x + 30,   // Front wheel
            truck.x + 110   // Rear wheel
        ];

        wheelPositions.forEach(wheelX => {
            // Outer tire
            this.ctx.fillStyle = '#2c3e50';
            this.ctx.beginPath();
            this.ctx.arc(wheelX, truck.y + truck.height + wheelRadius, wheelRadius, 0, Math.PI * 2);
            this.ctx.fill();

            // Rim (rotates during movement)
            if (truck.isRollingIn) {
                this.ctx.save();
                this.ctx.translate(wheelX, truck.y + truck.height + wheelRadius);
                this.ctx.rotate(truck.wheelRotation || 0);

                // Spokes
                for (let i = 0; i < 5; i++) {
                    const angle = (i * Math.PI * 2) / 5;
                    this.ctx.strokeStyle = '#95a5a6';
                    this.ctx.lineWidth = 2;
                    this.ctx.beginPath();
                    this.ctx.moveTo(0, 0);
                    this.ctx.lineTo(Math.cos(angle) * 12, Math.sin(angle) * 12);
                    this.ctx.stroke();
                }

                this.ctx.restore();
            } else {
                // Static rim when not moving
                this.ctx.fillStyle = '#95a5a6';
                this.ctx.beginPath();
                this.ctx.arc(wheelX, truck.y + truck.height + wheelRadius, 10, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });
    }

    drawTruck2Ladder(truck) {
        const ladder = truck.ladder;

        // Ladder anchored to left side of truck (raises on the left)
        const anchorX = truck.x + 20;
        const anchorY = truck.y - 5;

        // Calculate current total length
        const totalLength = ladder.baseLength + ladder.extensionLength;

        // Convert angle to radians
        const angleRad = (ladder.angle * Math.PI) / 180;

        // Calculate end point (extends to the LEFT to face truck1)
        const endX = anchorX - Math.cos(angleRad) * totalLength;
        const endY = anchorY - Math.sin(angleRad) * totalLength;

        // Draw base ladder section (dual rails)
        this.ctx.strokeStyle = '#95a5a6'; // Gray metal
        this.ctx.lineWidth = 6;

        // Left rail (base section)
        this.ctx.beginPath();
        const baseEndX = anchorX - Math.cos(angleRad) * ladder.baseLength;
        const baseEndY = anchorY - Math.sin(angleRad) * ladder.baseLength;
        this.ctx.moveTo(anchorX - 3, anchorY);
        this.ctx.lineTo(baseEndX - 3, baseEndY);
        this.ctx.stroke();

        // Right rail (base section)
        this.ctx.beginPath();
        this.ctx.moveTo(anchorX + 3, anchorY);
        this.ctx.lineTo(baseEndX + 3, baseEndY);
        this.ctx.stroke();

        // Draw extension section if extended (narrower for telescoping effect)
        if (ladder.extensionLength > 0) {
            this.ctx.strokeStyle = '#7f8c8d'; // Slightly darker
            this.ctx.lineWidth = 5; // Narrower

            // Left rail (extension)
            this.ctx.beginPath();
            this.ctx.moveTo(baseEndX - 2.5, baseEndY);
            this.ctx.lineTo(endX - 2.5, endY);
            this.ctx.stroke();

            // Right rail (extension)
            this.ctx.beginPath();
            this.ctx.moveTo(baseEndX + 2.5, baseEndY);
            this.ctx.lineTo(endX + 2.5, endY);
            this.ctx.stroke();

            // Draw connecting bracket
            this.ctx.fillStyle = '#34495e';
            this.ctx.beginPath();
            this.ctx.arc(baseEndX, baseEndY, 7, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // Draw rungs on entire ladder
        const rungSpacing = 15; // One rung every 15px
        const rungCount = Math.floor(totalLength / rungSpacing);
        this.ctx.strokeStyle = '#7f8c8d';
        this.ctx.lineWidth = 3;

        for (let i = 1; i < rungCount; i++) {
            const t = (i * rungSpacing) / totalLength;
            const rungCenterX = anchorX - Math.cos(angleRad) * (totalLength * t);
            const rungCenterY = anchorY - Math.sin(angleRad) * (totalLength * t);

            // Perpendicular rung (8px wide)
            const perpAngle = angleRad + Math.PI / 2;
            const rungStartX = rungCenterX + Math.cos(perpAngle) * 4;
            const rungStartY = rungCenterY - Math.sin(perpAngle) * 4;
            const rungEndX = rungCenterX - Math.cos(perpAngle) * 4;
            const rungEndY = rungCenterY + Math.sin(perpAngle) * 4;

            this.ctx.beginPath();
            this.ctx.moveTo(rungStartX, rungStartY);
            this.ctx.lineTo(rungEndX, rungEndY);
            this.ctx.stroke();
        }

        // Draw base mounting bracket
        this.ctx.fillStyle = '#34495e';
        this.ctx.fillRect(anchorX - 8, anchorY - 4, 16, 8);

        // Draw water cannon at ladder tip (if ladder is extended)
        if (ladder.extensionComplete) {
            this.drawWaterCannon(endX, endY, angleRad);
        }
    }

    drawWaterCannon(x, y, angle) {
        this.ctx.save();
        this.ctx.translate(x, y);
        // Rotate to face left (opposite direction)
        this.ctx.rotate(Math.PI - angle);

        // Cannon body
        this.ctx.fillStyle = '#34495e';
        this.ctx.fillRect(0, -5, 20, 10);

        // Cannon nozzle
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.fillRect(18, -3, 8, 6);

        // Mounting bracket
        this.ctx.fillStyle = '#95a5a6';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 6, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.restore();
    }

    drawWalkieTalkie() {
        const wt = this.walkieTalkie;
        const x = wt.x;
        const y = wt.y;
        const w = wt.width;
        const h = wt.height;

        // Shadow for depth
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.fillRect(x + 2, y + 2, w, h);

        // Main body (boxy shape)
        this.ctx.fillStyle = wt.isHovered ? '#2c3e50' : '#34495e';
        this.ctx.fillRect(x, y, w, h);

        // Border
        this.ctx.strokeStyle = '#1c2833';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, w, h);

        // Top section (slightly darker)
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.fillRect(x, y, w, 25);

        // Antenna
        this.ctx.fillStyle = '#95a5a6';
        this.ctx.fillRect(x + w / 2 - 2, y - wt.antennaHeight, 4, wt.antennaHeight);

        // Antenna tip
        this.ctx.fillStyle = '#7f8c8d';
        this.ctx.beginPath();
        this.ctx.arc(x + w / 2, y - wt.antennaHeight, 3, 0, Math.PI * 2);
        this.ctx.fill();

        // Speaker grill (mesh pattern)
        const grillX = x + 8;
        const grillY = y + 5;
        const grillW = w - 16;
        const grillH = 15;

        this.ctx.fillStyle = '#1c2833';
        this.ctx.fillRect(grillX, grillY, grillW, grillH);

        // Mesh lines
        this.ctx.strokeStyle = '#34495e';
        this.ctx.lineWidth = 1;
        for (let i = 0; i < 8; i++) {
            const lineY = grillY + 2 + (i * 1.5);
            this.ctx.beginPath();
            this.ctx.moveTo(grillX + 1, lineY);
            this.ctx.lineTo(grillX + grillW - 1, lineY);
            this.ctx.stroke();
        }

        // Display screen (small LED/LCD)
        const displayX = x + 8;
        const displayY = y + 28;
        const displayW = w - 16;
        const displayH = 8;

        this.ctx.fillStyle = '#0e1111';
        this.ctx.fillRect(displayX, displayY, displayW, displayH);

        // Display text or indicator
        if (this.truck2.hasArrived) {
            this.ctx.fillStyle = '#27ae60'; // Green when truck arrived
        } else {
            this.ctx.fillStyle = '#e74c3c'; // Red when idle
        }
        this.ctx.fillRect(displayX + 2, displayY + 2, 4, 4);

        // PTT Button (Push To Talk) - main interaction button
        const pttX = x + 10;
        const pttY = y + 45;
        const pttW = w - 20;
        const pttH = 25;

        // Button pressed effect
        if (wt.isPttPressed) {
            this.ctx.fillStyle = '#c0392b';
            this.ctx.fillRect(pttX + 1, pttY + 1, pttW, pttH);
        } else {
            // Button shadow
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            this.ctx.fillRect(pttX + 2, pttY + 2, pttW, pttH);

            // Button face
            this.ctx.fillStyle = wt.isHovered ? '#e67e22' : '#e74c3c';
            this.ctx.fillRect(pttX, pttY, pttW, pttH);
        }

        // Button border
        this.ctx.strokeStyle = '#c0392b';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(pttX, pttY, pttW, pttH);

        // PTT label on button
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 10px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('PTT', x + w / 2, pttY + 16);

        // Side clips/details
        this.ctx.fillStyle = '#1c2833';
        this.ctx.fillRect(x - 2, y + 15, 2, 10);
        this.ctx.fillRect(x + w, y + 15, 2, 10);

        // Status text below
        this.ctx.fillStyle = '#ecf0f1';
        this.ctx.font = 'bold 9px Arial';
        this.ctx.textAlign = 'center';
        const statusText = this.truck2.hasArrived ? 'TRUCK READY' : 'CALL TRUCK';
        this.ctx.fillText(statusText, x + w / 2, y + h + 10);
        this.ctx.textAlign = 'start';
    }

    drawHydrant() {
        if (this.hydrantStyle === 'modern') {
            this.drawModernHydrant();
        } else {
            this.drawClassicHydrant();
        }
    }

    drawClassicHydrant() {
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

    drawModernHydrant() {
        const centerX = this.hydrant.x + this.hydrant.width / 2;

        // Base plate
        this.ctx.fillStyle = '#7f8c8d';
        this.ctx.fillRect(this.hydrant.x - 5, this.hydrant.y + this.hydrant.height, this.hydrant.width + 10, 8);

        // Main body - tapered cylinder
        this.ctx.fillStyle = '#f39c12'; // Yellow/gold color for modern hydrant
        this.ctx.beginPath();
        this.ctx.moveTo(this.hydrant.x + 2, this.hydrant.y + this.hydrant.height);
        this.ctx.lineTo(this.hydrant.x + 5, this.hydrant.y + 15);
        this.ctx.lineTo(this.hydrant.x + this.hydrant.width - 5, this.hydrant.y + 15);
        this.ctx.lineTo(this.hydrant.x + this.hydrant.width - 2, this.hydrant.y + this.hydrant.height);
        this.ctx.closePath();
        this.ctx.fill();

        // Top section - wider
        this.ctx.fillStyle = '#e67e22'; // Darker orange
        this.ctx.fillRect(this.hydrant.x - 2, this.hydrant.y, this.hydrant.width + 4, 20);

        // Top cap - dome shape
        this.ctx.fillStyle = '#d35400';
        this.ctx.beginPath();
        this.ctx.ellipse(centerX, this.hydrant.y, this.hydrant.width/2 + 2, 8, 0, Math.PI, 0, true);
        this.ctx.fill();

        // Side ports (2 on each side)
        this.ctx.fillStyle = '#34495e';

        // Left port
        this.ctx.beginPath();
        this.ctx.arc(this.hydrant.x - 5, this.hydrant.y + 30, 8, 0, Math.PI * 2);
        this.ctx.fill();

        // Right port (the interactive one)
        this.ctx.beginPath();
        this.ctx.arc(this.hydrant.port.x, this.hydrant.port.y, this.hydrant.port.radius, 0, Math.PI * 2);
        this.ctx.fill();

        // Port threads (detail)
        this.ctx.strokeStyle = '#2c3e50';
        this.ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
            this.ctx.beginPath();
            this.ctx.arc(this.hydrant.port.x, this.hydrant.port.y, this.hydrant.port.radius - 2 - (i * 2), 0, Math.PI * 2);
            this.ctx.stroke();
        }

        // Valve - pentagon nut shape on top
        this.ctx.fillStyle = '#e67e22';
        this.ctx.save();
        this.ctx.translate(this.hydrant.valve.x + this.hydrant.valve.width/2, this.hydrant.valve.y + this.hydrant.valve.height/2);
        this.ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = (i * 2 * Math.PI / 5) - Math.PI / 2;
            const x = Math.cos(angle) * 12;
            const y = Math.sin(angle) * 12;
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.strokeStyle = '#d35400';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        this.ctx.restore();

        // Reflective strips for visibility
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.fillRect(this.hydrant.x + 8, this.hydrant.y + 25, 4, 10);
        this.ctx.fillRect(this.hydrant.x + this.hydrant.width - 12, this.hydrant.y + 25, 4, 10);
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

    drawPuddles() {
        this.puddles.forEach(puddle => {
            if (puddle.size > 0) {
                // Check if puddle is on ground or building to determine what to draw
                const groundLevel = this.canvas.height - 100;
                const isOnGround = puddle.y >= groundLevel;

                // Find which building (if any) this puddle is on
                const onBuilding = this.buildings.find(building => {
                    return puddle.x >= building.x &&
                           puddle.x <= building.x + building.width &&
                           puddle.y >= building.y &&
                           puddle.y <= building.y + building.height;
                });

                // Only draw if puddle is on a valid surface
                if (!isOnGround && !onBuilding) {
                    return;
                }

                this.ctx.save();

                // Create specific clipping for this puddle
                this.ctx.beginPath();
                if (isOnGround) {
                    // Clip to ground area only
                    this.ctx.rect(0, groundLevel, this.canvas.width, 100);
                } else if (onBuilding) {
                    // Clip to specific building only
                    this.ctx.rect(onBuilding.x, onBuilding.y, onBuilding.width, onBuilding.height);
                }
                this.ctx.clip();

                // Use consistent dark color for entire puddle
                this.ctx.fillStyle = `rgba(93, 109, 111, ${puddle.opacity})`;

                // Draw main puddle circle (only portions on surfaces will show due to clipping)
                this.ctx.beginPath();
                this.ctx.arc(puddle.x, puddle.y, puddle.size, 0, Math.PI * 2);
                this.ctx.fill();

                // Add smaller overlapping circles for organic shape - same dark color
                if (puddle.size > 8) {
                    this.ctx.beginPath();
                    this.ctx.arc(puddle.x - puddle.size * 0.3, puddle.y + puddle.size * 0.2, puddle.size * 0.6, 0, Math.PI * 2);
                    this.ctx.fill();

                    this.ctx.beginPath();
                    this.ctx.arc(puddle.x + puddle.size * 0.4, puddle.y - puddle.size * 0.1, puddle.size * 0.5, 0, Math.PI * 2);
                    this.ctx.fill();
                }

                this.ctx.restore();
            }
        });
    }

    drawWater() {
        // Draw main water stream
        this.ctx.fillStyle = '#3498db';
        this.waterDrops.forEach(drop => {
            const size = this.doubleSpray ? (drop.size || 4) * 2 : (drop.size || 4);
            this.ctx.beginPath();
            this.ctx.arc(drop.x, drop.y, size, 0, Math.PI * 2);
            this.ctx.fill();
        });

        // Draw mist particles with slight variation for heavy vs light
        this.mistParticles.forEach(mist => {
            const mistSize = this.doubleSpray ? mist.size * 1.5 : mist.size;
            if (mist.type === 'heavy') {
                // Heavy mist is slightly more opaque and blue-white
                this.ctx.fillStyle = `rgba(52, 152, 219, ${mist.opacity * 1.1})`;
            } else {
                // Light mist keeps the original color
                this.ctx.fillStyle = `rgba(52, 152, 219, ${mist.opacity})`;
            }
            this.ctx.beginPath();
            this.ctx.arc(mist.x, mist.y, mistSize, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }
    
    drawFires() {
        this.fires.forEach(fire => {
            // Skip rendering fires that are too small to see
            if (fire.size < 1) return;

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