class AnimalRescueLevel {
    constructor(canvas, gameScreen) {
        this.canvas = canvas;
        this.gameScreen = gameScreen;
        this.ctx = canvas.getContext('2d');
        this.instructionText = gameScreen.querySelector('.instructions');

        this.mouse = { x: 0, y: 0 };
        this.gameState = 'TRUCK_POSITIONING';
        
        // Randomly select animal at start
        const animals = [
            { type: 'kitty', emoji: '🐱', sound: 'A5' },
            { type: 'bird', emoji: '🐦', sound: 'C6' },
            { type: 'squirrel', emoji: '🐿️', sound: 'E5' }
        ];
        this.selectedAnimal = animals[Math.floor(Math.random() * animals.length)];
        
        this.animalPosition = { x: 0, y: 0 };
        this.conePosition = null;
        this.ladder = { startX: 0, startY: 0, endX: 0, endY: 0, currentLength: 0, maxLength: 0, angle: 0, isRaising: false };
        this.firefighter = { x: 0, y: 0, progress: 0, hasAnimal: false };
        
        // Enhanced truck positioning
        this.truck = {
            x: 50, y: 400, width: 120, height: 80,
            targetX: 200, targetY: 400,
            isMoving: false, speed: 2
        };
        
        this.actionSynth = new Tone.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.1 } }).toDestination();
        this.animalSynth = new Tone.Synth().toDestination();
        this.truckSynth = new Tone.Synth({ oscillator: { type: 'sawtooth' }, envelope: { attack: 0.1, decay: 0.2, sustain: 0.1, release: 0.5 } }).toDestination();

        this.tree = this.createTreeObject();
        this.fireTruckRescue = this.createFireTruckObject();

        this.isDragging = false;
        this.canvas.addEventListener('mousedown', (e) => this.handleInteraction(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleInteraction(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleInteraction(e));
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    start() {
        this.gameState = 'TRUCK_POSITIONING';
        this.instructionText.textContent = `A ${this.selectedAnimal.type} needs help! Click to position the fire truck.`;
        this.conePosition = null;
        this.firefighter = { x: 0, y: 0, progress: 0, hasAnimal: false };
        this.ladder.currentLength = 0;
        this.ladder.isRaising = false;
        this.truck.isMoving = false;
        this.truck.x = 50; // Reset truck position
        sceneParticles = [];
        this.resizeCanvas();
        this.gameLoop();
    }

    startGame() {
        this.gameState = 'START';
        this.instructionText.textContent = 'Click the cone button on the truck!';
        this.animalPosition.x = this.tree.x + Math.random() * 60 - 30;
        this.animalPosition.y = this.canvas.height - 250 - Math.random() * 80;
    }

    createTreeObject() {
        // Generate fixed texture positions once
        const textureSpots = [];
        for (let i = 0; i < 5; i++) {
            textureSpots.push({
                offsetX: (Math.random() - 0.5) * 100,
                offsetY: (Math.random() - 0.5) * 100,
                radius: 10 + Math.random() * 20
            });
        }
        
        return {
            x: this.canvas ? this.canvas.width - 150 : 650,
            y: this.canvas ? this.canvas.height - 300 : 300,
            width: 60,
            height: 220,
            textureSpots: textureSpots,
            draw: function(ctx) {
                // Draw tree trunk
                ctx.fillStyle = currentScene.treeTrunk;
                ctx.fillRect(this.x, this.y + 120, this.width, 100);
                
                // Draw tree crown
                ctx.fillStyle = currentScene.treeLeaves;
                ctx.beginPath();
                ctx.arc(this.x + this.width/2, this.y + 60, 80, 0, Math.PI * 2);
                ctx.fill();
                
                // Add fixed texture spots
                ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
                this.textureSpots.forEach(spot => {
                    ctx.beginPath();
                    ctx.arc(
                        this.x + this.width/2 + spot.offsetX,
                        this.y + 60 + spot.offsetY,
                        spot.radius,
                        0, Math.PI * 2
                    );
                    ctx.fill();
                });
            }
        };
    }

    createFireTruckObject() {
        return {
            x: 50,
            y: this.canvas ? this.canvas.height - 120 : 400,
            width: 120,
            height: 80,
            coneButton: {
                x: 50 + 100,
                y: this.canvas ? this.canvas.height - 120 + 30 : 430,
                radius: 15
            },
            ladderButton: {
                x: 50 + 70,
                y: this.canvas ? this.canvas.height - 120 + 30 : 430,
                radius: 15
            },
            ladderBase: {
                x: 50 + 60,
                y: this.canvas ? this.canvas.height - 120 : 400
            },
            draw: function(ctx, gameState) {
                // Note: Truck body is now drawn by drawTruck() method
                // This method only draws interactive buttons
                
                // Draw cone button
                if (gameState === 'TRUCK_POSITIONED') {
                    ctx.fillStyle = '#f39c12';
                    ctx.beginPath();
                    ctx.arc(this.coneButton.x, this.coneButton.y, this.coneButton.radius, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Add cone icon
                    ctx.fillStyle = '#e67e22';
                    ctx.beginPath();
                    ctx.moveTo(this.coneButton.x, this.coneButton.y - 8);
                    ctx.lineTo(this.coneButton.x - 6, this.coneButton.y + 8);
                    ctx.lineTo(this.coneButton.x + 6, this.coneButton.y + 8);
                    ctx.closePath();
                    ctx.fill();
                }
                
                // Draw ladder button
                if (gameState === 'CONE_PLACED') {
                    ctx.fillStyle = '#3498db';
                    ctx.beginPath();
                    ctx.arc(this.ladderButton.x, this.ladderButton.y, this.ladderButton.radius, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Add ladder icon
                    ctx.fillStyle = '#2980b9';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(this.ladderButton.x - 6, this.ladderButton.y - 8);
                    ctx.lineTo(this.ladderButton.x - 6, this.ladderButton.y + 8);
                    ctx.moveTo(this.ladderButton.x + 6, this.ladderButton.y - 8);
                    ctx.lineTo(this.ladderButton.x + 6, this.ladderButton.y + 8);
                    ctx.moveTo(this.ladderButton.x - 6, this.ladderButton.y - 4);
                    ctx.lineTo(this.ladderButton.x + 6, this.ladderButton.y - 4);
                    ctx.moveTo(this.ladderButton.x - 6, this.ladderButton.y + 4);
                    ctx.lineTo(this.ladderButton.x + 6, this.ladderButton.y + 4);
                    ctx.stroke();
                }
            }
        };
    }

    handleInteraction(e) {
        const pos = { x: e.offsetX, y: e.offsetY };
        switch (e.type) {
            case 'mousedown':
                if (this.gameState === 'TRUCK_POSITIONING') {
                    if (pos.x >= this.truck.x && pos.x <= this.truck.x + this.truck.width &&
                        pos.y >= this.truck.y && pos.y <= this.truck.y + this.truck.height) {
                        this.isDragging = true;
                        this.truck.isMoving = true; // For visual dust effect
                    }
                } else if (this.gameState === 'TRUCK_POSITIONED') {
                    if (Math.hypot(pos.x - this.fireTruckRescue.coneButton.x, pos.y - this.fireTruckRescue.coneButton.y) < this.fireTruckRescue.coneButton.radius) {
                        this.conePosition = { x: this.fireTruckRescue.x - 50, y: this.canvas.height - 40 };
                        this.gameState = 'CONE_PLACED';
                        this.instructionText.textContent = 'Safety cone deployed! Click to raise the ladder.';
                        this.actionSynth.triggerAttackRelease('C3', '8n');
                    }
                } else if (this.gameState === 'CONE_PLACED') {
                    this.ladder.isRaising = true;
                    this.ladder.startX = this.fireTruckRescue.x;
                    this.ladder.startY = this.fireTruckRescue.y;
                    this.ladder.endX = this.animalPosition.x;
                    this.ladder.endY = this.animalPosition.y;
                    const dx = this.ladder.endX - this.ladder.startX;
                    const dy = this.ladder.endY - this.ladder.startY;
                    this.ladder.angle = Math.atan2(dy, dx);
                    this.ladder.maxLength = Math.hypot(dx, dy);
                    this.gameState = 'LADDER_RAISING';
                    this.instructionText.textContent = 'Raising ladder to rescue position...';
                    this.actionSynth.triggerAttackRelease('E3', '2n');
                } else if (this.gameState === 'LADDER_EXTENDED') {
                    if (this.isClickOnLadder(pos)) {
                        this.gameState = 'CLIMBING';
                        this.instructionText.textContent = 'Climbing up to rescue the animal!';
                    }
                } else if (this.gameState === 'AT_ANIMAL') {
                    if (Math.hypot(pos.x - this.animalPosition.x, pos.y - this.animalPosition.y) < 30) {
                        this.firefighter.hasAnimal = true;
                        this.gameState = 'DESCENDING';
                        this.instructionText.textContent = 'Safely carrying the animal down!';
                        this.actionSynth.triggerAttackRelease('G3', '8n');
                    }
                }
                break;
            case 'mouseup':
                this.isDragging = false;
                this.truck.isMoving = false;
                if (this.gameState === 'TRUCK_POSITIONING') {
                    // Check if truck is in the right position
                    if (this.truck.x > this.tree.x - 200 && this.truck.x < this.tree.x - 100) {
                        this.gameState = 'TRUCK_POSITIONED';
                        this.instructionText.textContent = 'Perfect position! Click the cone button to deploy safety equipment.';
                        this.truckSynth.triggerAttackRelease('G2', '8n');
                    }
                }
                break;
            case 'mousemove':
                if (this.isDragging) {
                    this.truck.x = pos.x - this.truck.width / 2;
                    // Update related components
                    this.fireTruckRescue.x = this.truck.x;
                    this.fireTruckRescue.coneButton.x = this.truck.x + 100;
                    this.fireTruckRescue.ladderButton.x = this.truck.x + 70;
                }
                break;
        }
    }

    update() {
        // Handle ladder raising animation
        if (this.gameState === 'LADDER_RAISING') {
            if (this.ladder.currentLength < this.ladder.maxLength) {
                this.ladder.currentLength += 3; // Slower raising for more realistic feel
            } else {
                this.ladder.currentLength = this.ladder.maxLength;
                this.gameState = 'LADDER_EXTENDED';
                this.instructionText.textContent = 'Ladder in position! Click the ladder to start climbing.';
            }
        }
        
        if (this.gameState === 'CLIMBING') {
            if (this.firefighter.progress < this.ladder.maxLength) {
                this.firefighter.progress += 2;
            } else {
                this.firefighter.progress = this.ladder.maxLength;
                this.gameState = 'AT_ANIMAL';
                this.instructionText.textContent = `Reach out and click the ${this.selectedAnimal.type} to rescue it safely!`;
            }
        }
        
        if (this.gameState === 'DESCENDING') {
            if (this.firefighter.progress > 0) {
                this.firefighter.progress -= 2;
            } else {
                this.firefighter.progress = 0;
                this.gameState = 'RESCUED';
                this.instructionText.textContent = `Excellent rescue work! The ${this.selectedAnimal.type} is safe!`;
                this.animalSynth.triggerAttackRelease(this.selectedAnimal.sound, '4n');
                setTimeout(() => {
                    showHeroReport(`Outstanding rescue! You safely saved the ${this.selectedAnimal.type}! Your quick thinking and careful ladder work made all the difference.`);
                }, 2000);
            }
        }
    }
    
    isClickOnLadder(pos) {
        const translatedX = pos.x - this.ladder.startX;
        const translatedY = pos.y - this.ladder.startY;
        const rotatedX = translatedX * Math.cos(-this.ladder.angle) - translatedY * Math.sin(-this.ladder.angle);
        const rotatedY = translatedX * Math.sin(-this.ladder.angle) + translatedY * Math.cos(-this.ladder.angle);
        return (rotatedX >= 0 && rotatedX <= this.ladder.maxLength && rotatedY >= -15 && rotatedY <= 15);
    }

    gameLoop() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawScene();
        this.update();
        window.animalRescueAnimationId = requestAnimationFrame(() => this.gameLoop());
    }

    drawScene() {
        // Draw background
        this.ctx.fillStyle = currentScene.sky;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw ground
        this.ctx.fillStyle = currentScene.ground;
        this.ctx.fillRect(0, this.canvas.height - 80, this.canvas.width, 80);
        
        // Draw scene particles
        manageSceneParticles(this.canvas, this.ctx);
        
        // Draw game objects
        this.tree.draw(this.ctx);
        
        // Draw the moving fire truck
        this.drawTruck();
        
        // Only draw fire truck rescue object (buttons) when truck is positioned
        if (this.gameState !== 'TRUCK_POSITIONING' && this.gameState !== 'TRUCK_MOVING') {
            this.fireTruckRescue.draw(this.ctx, this.gameState);
        }
        
        // Draw cone if placed
        if (this.conePosition) {
            this.ctx.fillStyle = '#f39c12';
            this.ctx.beginPath();
            this.ctx.moveTo(this.conePosition.x, this.conePosition.y);
            this.ctx.lineTo(this.conePosition.x - 10, this.conePosition.y + 20);
            this.ctx.lineTo(this.conePosition.x + 10, this.conePosition.y + 20);
            this.ctx.closePath();
            this.ctx.fill();
        }
        
        // Draw ladder
        if (this.gameState === 'LADDER_RAISING' || this.gameState === 'LADDER_EXTENDED' || 
            this.gameState === 'CLIMBING' || this.gameState === 'AT_ANIMAL' || 
            this.gameState === 'DESCENDING' || this.gameState === 'RESCUED') {
            this.ctx.save();
            this.ctx.translate(this.ladder.startX, this.ladder.startY);
            this.ctx.rotate(this.ladder.angle);
            
            this.ctx.fillStyle = '#bdc3c7';
            this.ctx.fillRect(0, -5, this.ladder.currentLength, 10);
            
            this.ctx.fillStyle = '#7f8c8d';
            for (let i = 20; i < this.ladder.currentLength - 10; i += 20) {
                this.ctx.fillRect(i, -8, 2, 16);
            }
            
            this.ctx.restore();
            
            if (this.gameState === 'LADDER_EXTENDED') {
                this.ctx.save();
                this.ctx.translate(this.ladder.startX, this.ladder.startY);
                this.ctx.rotate(this.ladder.angle);
                const pulse = Math.abs(Math.sin(Date.now() * 0.005)) * 8;
                this.ctx.fillStyle = `rgba(255, 255, 0, 0.4)`;
                this.ctx.fillRect(0, -10 - pulse / 2, this.ladder.currentLength, 20 + pulse);
                this.ctx.restore();
            }
        }
        
        // Draw firefighter
        if (this.gameState === 'CLIMBING' || this.gameState === 'AT_ANIMAL' || this.gameState === 'DESCENDING' || this.gameState === 'RESCUED') {
            const onLadderX = this.ladder.startX + Math.cos(this.ladder.angle) * this.firefighter.progress;
            const onLadderY = this.ladder.startY + Math.sin(this.ladder.angle) * this.firefighter.progress;
            this.firefighter.x = onLadderX;
            this.firefighter.y = onLadderY;
            
            this.ctx.fillStyle = '#e74c3c';
            this.ctx.beginPath();
            this.ctx.arc(this.firefighter.x, this.firefighter.y, 15, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.fillStyle = '#f1c40f';
            this.ctx.beginPath();
            this.ctx.arc(this.firefighter.x, this.firefighter.y - 15, 10, 0, Math.PI * 2);
            this.ctx.fill();
            
            if (this.firefighter.hasAnimal) {
                this.ctx.font = '20px sans-serif';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(this.selectedAnimal.emoji, this.firefighter.x + 10, this.firefighter.y - 10);
            }
        }
        
        // Draw animal in tree
        if (this.gameState !== 'SELECT_ANIMAL' && !this.firefighter.hasAnimal) {
            this.ctx.font = '40px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(this.selectedAnimal.emoji, this.animalPosition.x, this.animalPosition.y);
        }
        
        if (this.gameState === 'AT_ANIMAL') {
            this.highlight(this.animalPosition.x, this.animalPosition.y, 30);
        }
    }
    
    highlight(x, y, radius) {
        const pulse = Math.abs(Math.sin(Date.now() * 0.005)) * 5;
        this.ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius + pulse, 0, Math.PI * 2);
        this.ctx.stroke();
    }

    drawTruck() {
        // Draw positioning highlight when in truck positioning state
        if (this.gameState === 'TRUCK_POSITIONING') {
            const pulse = Math.abs(Math.sin(Date.now() * 0.005)) * 10;
            this.ctx.strokeStyle = 'rgba(241, 196, 15, 0.8)';
            this.ctx.lineWidth = 3;
            
            // Highlight the truck itself
            this.ctx.strokeRect(
                this.truck.x - pulse/2, 
                this.truck.y - pulse/2, 
                this.truck.width + pulse, 
                this.truck.height + pulse
            );

            // Draw the target drop zone
            this.ctx.fillStyle = 'rgba(46, 204, 113, 0.3)';
            this.ctx.fillRect(this.tree.x - 200, this.truck.y, 100, this.truck.height);
            this.ctx.strokeStyle = 'rgba(46, 204, 113, 0.8)';
            this.ctx.strokeRect(this.tree.x - 200, this.truck.y, 100, this.truck.height);
        }

        // Draw truck body
        this.ctx.fillStyle = '#e74c3c';
        this.ctx.fillRect(this.truck.x, this.truck.y, this.truck.width, this.truck.height);
        
        // Draw truck cab
        this.ctx.fillStyle = '#c0392b';
        this.ctx.fillRect(this.truck.x + 80, this.truck.y - 20, 40, 30);
        
        // Draw wheels
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.beginPath();
        this.ctx.arc(this.truck.x + 25, this.truck.y + this.truck.height + 10, 12, 0, Math.PI * 2);
        this.ctx.arc(this.truck.x + 95, this.truck.y + this.truck.height + 10, 12, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw ladder on top (visual detail)
        this.ctx.fillStyle = '#bdc3c7';
        this.ctx.fillRect(this.truck.x + 10, this.truck.y - 5, 100, 8);
        
        // Draw equipment compartments
        this.ctx.strokeStyle = '#34495e';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(this.truck.x + 5, this.truck.y + 10, 30, 25);
        this.ctx.strokeRect(this.truck.x + 40, this.truck.y + 10, 30, 25);
        
        // Add movement dust effect when moving
        if (this.truck.isMoving) {
            for (let i = 0; i < 3; i++) {
                this.ctx.fillStyle = `rgba(139, 139, 139, ${0.3 - i * 0.1})`;
                this.ctx.beginPath();
                this.ctx.arc(
                    this.truck.x - 10 - i * 8, 
                    this.truck.y + this.truck.height + 5, 
                    3 + i * 2, 
                    0, Math.PI * 2
                );
                this.ctx.fill();
            }
        }
    }

    resizeCanvas() {
        this.canvas.width = this.gameScreen.clientWidth;
        this.canvas.height = this.gameScreen.clientHeight;
        
        // Update positions
        this.tree.x = this.canvas.width - 150;
        this.tree.y = this.canvas.height - 300;
        this.truck.y = this.canvas.height - 160; // Position truck on ground
        this.truck.targetY = this.canvas.height - 160;
        this.fireTruckRescue.y = this.canvas.height - 120;
        this.fireTruckRescue.coneButton.y = this.canvas.height - 120 + 30;
        this.fireTruckRescue.ladderButton.y = this.canvas.height - 120 + 30;
        this.fireTruckRescue.ladderBase.y = this.canvas.height - 120;
        
        // Update animal position in tree
        this.animalPosition.x = this.tree.x + 20;
        this.animalPosition.y = this.tree.y + 50;
    }
}

window.AnimalRescueLevel = AnimalRescueLevel;
