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
        this.buildings = [];
        this.gameState = 'START';
        this.firesExtinguished = 0;

        // Audio setup
        this.extinguishSynth = new Tone.Synth({ oscillator: { type: 'sine' }, envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.2 } }).toDestination();
        this.connectSynth = new Tone.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.1 } }).toDestination();
        this.whiteNoiseSynth = new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.005, decay: 0.1, sustain: 0 } }).toDestination();
        this.pinkNoiseSynth = new Tone.NoiseSynth({ noise: { type: 'pink' }, envelope: { attack: 0.005, decay: 0.1, sustain: 0 } }).toDestination();
        this.brownNoiseSynth = new Tone.NoiseSynth({ noise: { type: 'brown' }, envelope: { attack: 0.005, decay: 0.1, sustain: 0 } }).toDestination();

        // Simple approach like the old version
        this.waterParticles = [];
        
        // Create fire truck and hydrant
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
        window.addEventListener('mouseup', () => { 
            this.stopWaterSpraying();
        });
        this.canvas.addEventListener('touchmove', (e) => { 
            e.preventDefault(); 
            this.handleInteraction(e); 
        }, { passive: false });
        this.canvas.addEventListener('touchstart', (e) => { 
            e.preventDefault(); 
            this.handleInteraction(e); 
        }, { passive: false });
        window.addEventListener('touchend', () => { 
            this.stopWaterSpraying();
        });
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    createFireTruckObject() {
        return {
            x: 0,
            y: 0,
            width: 120,
            height: 70,
            nozzle: {
                angle: -Math.PI / 4,
                length: 60,
                width: 15,
                x: 0,
                y: 0
            },
            coiledHose: {
                x: 0,
                y: 0,
                radius: 20
            },
            port: {
                x: 0,
                y: 0,
                radius: 10
            },
            draw: function(ctx, gameState, canvas) {
                // Position truck in center
                this.x = canvas.width / 2 - this.width / 2;
                this.y = canvas.height - this.height - 40;
                
                // Draw main truck body with rounded corners
                ctx.fillStyle = '#e74c3c';
                ctx.beginPath();
                ctx.roundRect(this.x, this.y, this.width, this.height, 10);
                ctx.fill();
                
                // Draw cab
                ctx.fillStyle = '#c0392b';
                ctx.beginPath();
                ctx.roundRect(this.x + this.width * 0.6, this.y - 30, this.width * 0.4, 40, [10, 0, 0, 0]);
                ctx.fill();
                
                // Draw windshield
                ctx.fillStyle = '#87CEEB';
                ctx.fillRect(this.x + this.width * 0.65, this.y - 25, this.width * 0.3, 20);
                
                // Draw wheels
                ctx.fillStyle = '#333';
                ctx.beginPath();
                ctx.arc(this.x + 25, this.y + this.height, 18, 0, Math.PI * 2);
                ctx.arc(this.x + this.width - 25, this.y + this.height, 18, 0, Math.PI * 2);
                ctx.fill();
                
                // Update positions
                this.coiledHose.x = this.x + 35;
                this.coiledHose.y = this.y + 35;
                this.port.x = this.x + this.width - 15;
                this.port.y = this.y + this.height / 2;
                
                // Draw coiled hose
                if (gameState === 'START') {
                    ctx.fillStyle = '#f1c40f';
                    ctx.beginPath();
                    ctx.arc(this.coiledHose.x, this.coiledHose.y, this.coiledHose.radius, 0, Math.PI * 2);
                    ctx.fill();
                    
                    ctx.fillStyle = '#e67e22';
                    ctx.beginPath();
                    ctx.arc(this.coiledHose.x, this.coiledHose.y, this.coiledHose.radius * 0.7, 0, Math.PI * 2);
                    ctx.fill();
                    
                    this.drawHighlight(ctx, this.coiledHose.x, this.coiledHose.y, this.coiledHose.radius);
                }
                
                // Draw port
                ctx.fillStyle = 'black';
                ctx.beginPath();
                ctx.arc(this.port.x, this.port.y, this.port.radius, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.fillStyle = '#555';
                ctx.beginPath();
                ctx.arc(this.port.x, this.port.y, this.port.radius * 0.6, 0, Math.PI * 2);
                ctx.fill();
                
                if (gameState === 'HOSE_UNRAVELED') {
                    this.drawHighlight(ctx, this.port.x, this.port.y, this.port.radius);
                }
                
                // Draw nozzle
                this.nozzle.x = this.x + this.width / 2;
                this.nozzle.y = this.y - 10;
                
                ctx.fillStyle = '#7f8c8d';
                ctx.beginPath();
                ctx.arc(this.nozzle.x, this.nozzle.y, 10, 0, Math.PI * 2);
                ctx.fill();
                
                if (gameState === 'SPRAYING') {
                    ctx.save();
                    ctx.translate(this.nozzle.x, this.nozzle.y);
                    ctx.rotate(this.nozzle.angle);
                    ctx.fillStyle = '#95a5a6';
                    ctx.beginPath();
                    ctx.roundRect(0, -this.nozzle.width / 2, this.nozzle.length, this.nozzle.width, 5);
                    ctx.fill();
                    ctx.restore();
                }
            },
            drawHighlight: function(ctx, x, y, baseRadius) {
                const pulse = Math.abs(Math.sin(Date.now() * 0.005)) * 5;
                ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(x, y, baseRadius + pulse, 0, Math.PI * 2);
                ctx.stroke();
            }
        };
    }

    createHydrantObject() {
        return {
            x: 0,
            y: 0,
            port: {
                x: 0,
                y: 0,
                radius: 12
            },
            valve: {
                x: 0,
                y: 0,
                width: 40,
                height: 10
            },
            draw: function(ctx, gameState, canvas, fireTruck) {
                // Position hydrant relative to truck
                this.x = fireTruck.x - 80;
                this.y = canvas.height - 80;
                this.port.x = this.x;
                this.port.y = this.y + 20;
                this.valve.x = this.x - this.valve.width / 2;
                this.valve.y = this.y - 25;
                
                // Draw hydrant body
                ctx.fillStyle = '#e74c3c';
                ctx.beginPath();
                ctx.roundRect(this.x - 20, this.y, 40, 60, 5);
                ctx.fill();
                
                // Draw hydrant cap
                ctx.fillStyle = '#c0392b';
                ctx.beginPath();
                ctx.arc(this.x, this.y, 25, 0, Math.PI * 2);
                ctx.fill();
                
                // Draw port
                ctx.fillStyle = 'black';
                ctx.beginPath();
                ctx.arc(this.port.x, this.port.y, this.port.radius, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.fillStyle = '#555';
                ctx.beginPath();
                ctx.arc(this.port.x, this.port.y, this.port.radius * 0.6, 0, Math.PI * 2);
                ctx.fill();
                
                if (gameState === 'TRUCK_CONNECTED') {
                    this.drawHighlight(ctx, this.port.x, this.port.y, this.port.radius);
                }
                
                // Draw valve
                ctx.fillStyle = '#c0392b';
                ctx.beginPath();
                ctx.roundRect(this.valve.x, this.valve.y, this.valve.width, this.valve.height, 3);
                ctx.fill();
                
                if (gameState === 'HYDRANT_CONNECTED') {
                    this.drawHighlight(ctx, this.valve.x + this.valve.width/2, this.valve.y + this.valve.height/2, this.valve.width/2);
                }
            },
            drawHighlight: function(ctx, x, y, baseRadius) {
                const pulse = Math.abs(Math.sin(Date.now() * 0.005)) * 5;
                ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(x, y, baseRadius + pulse, 0, Math.PI * 2);
                ctx.stroke();
            }
        };
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
                    
                case 'HOSE_UNRAVELED':
                    if (Math.hypot(pos.x - this.fireTruck.port.x, pos.y - this.fireTruck.port.y) < this.fireTruck.port.radius) {
                        this.gameState = 'TRUCK_CONNECTED';
                        this.instructionText.textContent = 'Drag the hose to the hydrant!';
                        this.connectSynth.triggerAttackRelease('E3', '8n');
                    }
                    break;
                    
                case 'TRUCK_CONNECTED':
                    if (Math.hypot(pos.x - this.hydrant.port.x, pos.y - this.hydrant.port.y) < this.hydrant.port.radius) {
                        this.gameState = 'HYDRANT_CONNECTED';
                        this.instructionText.textContent = 'Turn the red valve on the hydrant!';
                        this.connectSynth.triggerAttackRelease('G3', '8n');
                    }
                    break;
                    
                case 'HYDRANT_CONNECTED':
                    const v = this.hydrant.valve;
                    if (pos.x > v.x && pos.x < v.x + v.width && pos.y > v.y && pos.y < v.y + v.height) {
                        this.gameState = 'SPRAYING';
                        this.instructionText.textContent = 'Aim the nozzle and spray!';
                        this.connectSynth.triggerAttackRelease('C4', '8n');
                    }
                    break;
                    
                case 'SPRAYING':
                    this.isSpraying = true;
                    break;
            }
        }
    }

    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) * (this.canvas.width / rect.width),
            y: (e.clientY - rect.top) * (this.canvas.height / rect.height)
        };
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
        
        // Update truck positions
        this.fireTruck.y = this.canvas.height - 120;
        
        // Update hydrant positions
        this.hydrant.x = this.canvas.width - 100;
        this.hydrant.y = this.canvas.height - 100;
        
        // Update animated hose position
        this.hose.startX = this.fireTruck.x + 90;
        this.hose.startY = this.fireTruck.y + 20;
        
        // Update nozzle position
        this.nozzle.x = this.fireTruck.x + 110;
        this.nozzle.y = this.fireTruck.y + 40;
        
        // Regenerate buildings for new canvas size
        this.generateBuildings();
    }

    generateBuildings() {
        this.buildings = [];
        let currentX = -50;
        
        while (currentX < this.canvas.width + 50) {
            const width = Math.random() * 100 + 80;
            const height = Math.random() * (this.canvas.height / 2) + (this.canvas.height / 4);
            
            const building = {
                x: currentX,
                y: this.canvas.height - height,
                width,
                height,
                windows: []
            };
            
            // Generate windows
            for (let y = building.y + 10; y < this.canvas.height - 20; y += 30) {
                for (let x = building.x + 10; x < building.x + width - 10; x += 30) {
                    building.windows.push({
                        x,
                        y,
                        lit: Math.random() > 0.3
                    });
                }
            }
            
            this.buildings.push(building);
            currentX += width + 10;
        }
    }

    drawBuildings() {
        this.buildings.forEach(building => {
            this.ctx.fillStyle = currentScene.building;
            this.ctx.fillRect(building.x, building.y, building.width, building.height);
            
            const windowColor = currentScene.special === 'night' ? '#f1c40f' : '#34495e';
            building.windows.forEach(window => {
                this.ctx.fillStyle = window.lit ? windowColor : '#34495e';
                this.ctx.fillRect(window.x, window.y, 15, 15);
            });
        });
    }

    drawGround() {
        this.ctx.fillStyle = '#7f8c8d';
        this.ctx.fillRect(0, this.canvas.height - 40, this.canvas.width, 40);
    }


    drawHose() {
        this.ctx.strokeStyle = '#f1c40f';
        this.ctx.lineWidth = 10;
        this.ctx.beginPath();
        
        if (this.gameState === 'TRUCK_CONNECTED') {
            this.ctx.moveTo(this.fireTruck.port.x, this.fireTruck.port.y);
            this.ctx.quadraticCurveTo(
                (this.fireTruck.port.x + this.mouse.x) / 2,
                this.mouse.y - 50,
                this.mouse.x,
                this.mouse.y
            );
        } else if (this.gameState === 'HYDRANT_CONNECTED' || this.gameState === 'SPRAYING') {
            this.ctx.moveTo(this.fireTruck.port.x, this.fireTruck.port.y);
            const controlY = Math.min(this.fireTruck.port.y, this.hydrant.port.y) + 100;
            this.ctx.quadraticCurveTo(
                (this.fireTruck.port.x + this.hydrant.port.x) / 2,
                controlY,
                this.hydrant.port.x,
                this.hydrant.port.y
            );
        }
        
        this.ctx.stroke();
    }
    
    updateNozzleAngle() {
        if (this.gameState !== 'SPRAYING') return;
        const dx = this.mouse.x - this.fireTruck.nozzle.x;
        const dy = this.mouse.y - this.fireTruck.nozzle.y;
        this.fireTruck.nozzle.angle = Math.atan2(dy, dx);
    }
    
    handleWater() {
        if (this.isSpraying && this.gameState === 'SPRAYING') {
            // Play water sound
            const soundType = document.getElementById('sound-select').value;
            if (soundType !== 'disable') {
                if (soundType === 'white') this.whiteNoiseSynth.triggerAttack();
                else if (soundType === 'pink') this.pinkNoiseSynth.triggerAttack();
                else if (soundType === 'brown') this.brownNoiseSynth.triggerAttack();
            }
            
            // Create water particles from nozzle end
            const nozzleEndX = this.fireTruck.nozzle.x + Math.cos(this.fireTruck.nozzle.angle) * this.fireTruck.nozzle.length;
            const nozzleEndY = this.fireTruck.nozzle.y + Math.sin(this.fireTruck.nozzle.angle) * this.fireTruck.nozzle.length;
            
            for (let i = 0; i < 3; i++) {
                this.waterParticles.push(new WaterParticle(nozzleEndX, nozzleEndY, this.fireTruck.nozzle.angle));
            }
        } else {
            // Stop water sounds
            this.whiteNoiseSynth.triggerRelease();
            this.pinkNoiseSynth.triggerRelease();
            this.brownNoiseSynth.triggerRelease();
        }
        
        // Update water particles
        this.waterParticles.forEach((particle, index) => {
            particle.update();
            particle.draw(this.ctx);
            if (particle.y > this.canvas.height || particle.x < 0 || particle.x > this.canvas.width) {
                this.waterParticles.splice(index, 1);
            }
        });
    }
    
    stopWaterSpraying() {
        this.isSpraying = false;
        this.whiteNoiseSynth.triggerRelease();
        this.pinkNoiseSynth.triggerRelease();
        this.brownNoiseSynth.triggerRelease();
    }

    handleFires() {
        this.fires.forEach((fire, fireIndex) => {
            fire.update();
            fire.draw(this.ctx);
            
            // Check collision with water particles
            this.waterParticles.forEach((particle, particleIndex) => {
                const dist = Math.hypot(particle.x - fire.x, particle.y - (fire.y - fire.height/2));
                if (dist < fire.width + particle.size) {
                    this.waterParticles.splice(particleIndex, 1);
                    fire.life -= 5;
                }
            });
            
            if (fire.life <= 0) {
                this.extinguishSynth.triggerAttackRelease('C4', '8n');
                this.fires.splice(fireIndex, 1);
                this.firesExtinguished++;
            }
        });
    }

    gameLoop() {
        // Debug: Check canvas dimensions
        if (this.canvas.width === 0 || this.canvas.height === 0) {
            console.warn('FireRescue: Canvas has 0 dimensions, trying to resize...');
            this.resizeCanvas();
            if (this.canvas.width === 0 || this.canvas.height === 0) {
                console.error('FireRescue: Still 0 dimensions after resize');
                requestAnimationFrame(() => this.gameLoop());
                return;
            }
        }
        
        // Clear and draw background
        this.ctx.fillStyle = currentScene.sky;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw scene elements
        manageSceneParticles(this.canvas, this.ctx);
        this.drawBuildings();
        this.drawGround();
        
        // Draw truck and hydrant
        this.fireTruck.draw(this.ctx, this.gameState, this.canvas);
        this.hydrant.draw(this.ctx, this.gameState, this.canvas, this.fireTruck);
        
        // Draw hose connection
        this.drawHose();
        
        // Update nozzle angle and handle water
        this.updateNozzleAngle();
        this.handleWater();
        this.handleFires();

        // UI feedback
        if (this.fires.length > 0) {
            this.titleElement.classList.add('pulsing');
        } else {
            this.titleElement.classList.remove('pulsing');
        }

        // Win condition
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
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.baseWidth = Math.random() * 20 + 20;
        this.width = this.baseWidth;
        this.height = this.width * 2;
        this.life = 100;
        this.flicker = Math.random() * 10;
    }
    
    update() {
        this.flicker += 0.1;
        this.width = this.baseWidth + Math.sin(this.flicker) * 5;
        this.height = this.width * (Math.random() * 0.5 + 1.8);
    }
    
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        const opacity = this.life / 100;
        
        // Outer flame (orange)
        ctx.fillStyle = `rgba(255, 165, 0, ${0.7 * opacity})`;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(this.width * 0.7, -this.height * 0.5, 0, -this.height);
        ctx.quadraticCurveTo(-this.width * 0.7, -this.height * 0.5, 0, 0);
        ctx.fill();
        
        // Inner flame (yellow)
        ctx.fillStyle = `rgba(255, 255, 0, ${0.9 * opacity})`;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(this.width * 0.4, -this.height * 0.4, 0, -this.height * 0.8);
        ctx.quadraticCurveTo(-this.width * 0.4, -this.height * 0.4, 0, 0);
        ctx.fill();
        
        ctx.restore();
    }
}

class WaterParticle {
    constructor(x, y, angle) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 5 + 5;
        this.speed = Math.random() * 5 + 8;
        this.vx = Math.cos(angle) * this.speed;
        this.vy = Math.sin(angle) * this.speed;
        this.gravity = 0.1;
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
    }
    
    draw(ctx) {
        ctx.fillStyle = 'rgba(52, 152, 219, 0.8)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

window.FireRescueLevel = FireRescueLevel;
