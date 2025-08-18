class AnimalRescueLevel {
    constructor(canvas, gameScreen) {
        this.canvas = canvas;
        this.gameScreen = gameScreen;
        this.ctx = canvas.getContext('2d');
        this.instructionText = gameScreen.querySelector('.instructions');
        this.animalMenu = document.getElementById('animal-select-menu');

        this.mouse = { x: 0, y: 0 };
        this.gameState = 'SELECT_ANIMAL';
        this.selectedAnimal = { type: 'kitty', emoji: '🐱', sound: 'C5' };
        this.animalPosition = { x: 0, y: 0 };
        this.conePosition = null;
        this.ladder = { startX: 0, startY: 0, endX: 0, endY: 0, currentLength: 0, maxLength: 0, angle: 0 };
        this.firefighter = { x: 0, y: 0, progress: 0, hasAnimal: false };
        
        this.actionSynth = new Tone.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.1 } }).toDestination();
        this.animalSynth = new Tone.Synth().toDestination();

        this.tree = this.createTreeObject();
        this.fireTruckRescue = this.createFireTruckObject();

        this.initEventListeners();
    }

    start() {
        this.gameState = 'SELECT_ANIMAL';
        this.instructionText.textContent = 'Choose an animal to rescue!';
        this.animalMenu.style.display = 'flex';
        this.conePosition = null;
        this.firefighter = { x: 0, y: 0, progress: 0, hasAnimal: false };
        this.ladder.currentLength = 0;
        sceneParticles = [];
        this.resizeCanvas();
        this.gameLoop();
    }

    initEventListeners() {
        this.animalMenu.onclick = (e) => {
            if (e.target.classList.contains('animal-option')) {
                const animalType = e.target.dataset.animal;
                if (animalType === 'kitty') this.selectedAnimal = { type: 'kitty', emoji: '🐱', sound: 'A5' };
                if (animalType === 'bird') this.selectedAnimal = { type: 'bird', emoji: '🐦', sound: 'C6' };
                if (animalType === 'squirrel') this.selectedAnimal = { type: 'squirrel', emoji: '🐿️', sound: 'E5' };
                this.animalMenu.style.display = 'none';
                this.startGame();
            }
        };
        this.canvas.addEventListener('mousedown', (e) => this.handleInteraction(e));
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    startGame() {
        this.gameState = 'START';
        this.instructionText.textContent = 'Click the cone button on the truck!';
        this.animalPosition.x = this.tree.x + Math.random() * 60 - 30;
        this.animalPosition.y = this.canvas.height - 250 - Math.random() * 80;
    }

    createTreeObject() {
        return {
            x: this.canvas ? this.canvas.width - 150 : 650,
            y: this.canvas ? this.canvas.height - 300 : 300,
            width: 60,
            height: 220,
            draw: function(ctx) {
                // Draw tree trunk
                ctx.fillStyle = currentScene.treeTrunk;
                ctx.fillRect(this.x, this.y + 120, this.width, 100);
                
                // Draw tree crown
                ctx.fillStyle = currentScene.treeLeaves;
                ctx.beginPath();
                ctx.arc(this.x + this.width/2, this.y + 60, 80, 0, Math.PI * 2);
                ctx.fill();
                
                // Add some texture
                ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
                for (let i = 0; i < 5; i++) {
                    ctx.beginPath();
                    ctx.arc(
                        this.x + this.width/2 + (Math.random() - 0.5) * 100,
                        this.y + 60 + (Math.random() - 0.5) * 100,
                        10 + Math.random() * 20,
                        0, Math.PI * 2
                    );
                    ctx.fill();
                }
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
                // Draw truck body
                ctx.fillStyle = '#e74c3c';
                ctx.fillRect(this.x, this.y, this.width, this.height);
                
                // Draw truck details
                ctx.fillStyle = '#c0392b';
                ctx.fillRect(this.x + 10, this.y + 10, 20, 15);
                ctx.fillRect(this.x + 40, this.y + 10, 60, 15);
                
                // Draw wheels
                ctx.fillStyle = '#2c3e50';
                ctx.beginPath();
                ctx.arc(this.x + 20, this.y + this.height + 10, 12, 0, Math.PI * 2);
                ctx.arc(this.x + this.width - 20, this.y + this.height + 10, 12, 0, Math.PI * 2);
                ctx.fill();
                
                // Draw cone button
                if (gameState === 'START') {
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
        if (e.type === 'mousedown') {
            switch (this.gameState) {
                case 'START':
                    if (Math.hypot(pos.x - this.fireTruckRescue.coneButton.x, pos.y - this.fireTruckRescue.coneButton.y) < this.fireTruckRescue.coneButton.radius) {
                        this.conePosition = { x: this.fireTruckRescue.x - 50, y: this.canvas.height - 40 };
                        this.gameState = 'CONE_PLACED';
                        this.instructionText.textContent = 'Click the ladder button!';
                        this.actionSynth.triggerAttackRelease('C3', '8n');
                    }
                    break;
                case 'CONE_PLACED':
                    if (Math.hypot(pos.x - this.fireTruckRescue.ladderButton.x, pos.y - this.fireTruckRescue.ladderButton.y) < this.fireTruckRescue.ladderButton.radius) {
                        this.ladder.startX = this.fireTruckRescue.x;
                        this.ladder.startY = this.fireTruckRescue.y;
                        this.ladder.endX = this.animalPosition.x;
                        this.ladder.endY = this.animalPosition.y;
                        const dx = this.ladder.endX - this.ladder.startX;
                        const dy = this.ladder.endY - this.ladder.startY;
                        this.ladder.angle = Math.atan2(dy, dx);
                        this.ladder.maxLength = Math.hypot(dx, dy);
                        this.gameState = 'LADDER_EXTENDING';
                        this.instructionText.textContent = 'Extending ladder...';
                        this.actionSynth.triggerAttackRelease('E3', '2n');
                    }
                    break;
                case 'LADDER_EXTENDED':
                    if (this.isClickOnLadder(pos)) {
                        this.gameState = 'CLIMBING';
                        this.instructionText.textContent = 'Climbing up!';
                    }
                    break;
                case 'AT_ANIMAL':
                    if (Math.hypot(pos.x - this.animalPosition.x, pos.y - this.animalPosition.y) < 30) {
                        this.firefighter.hasAnimal = true;
                        this.gameState = 'DESCENDING';
                        this.instructionText.textContent = 'Coming down!';
                        this.actionSynth.triggerAttackRelease('G3', '8n');
                    }
                    break;
            }
        }
    }

    update() {
        if (this.gameState === 'LADDER_EXTENDING') {
            if (this.ladder.currentLength < this.ladder.maxLength) {
                this.ladder.currentLength += 5;
            } else {
                this.ladder.currentLength = this.ladder.maxLength;
                this.gameState = 'LADDER_EXTENDED';
                this.instructionText.textContent = 'Click the ladder to climb!';
            }
        }
        
        if (this.gameState === 'CLIMBING') {
            if (this.firefighter.progress < this.ladder.maxLength) {
                this.firefighter.progress += 2;
            } else {
                this.firefighter.progress = this.ladder.maxLength;
                this.gameState = 'AT_ANIMAL';
                this.instructionText.textContent = `Click the ${this.selectedAnimal.type} to rescue it!`;
            }
        }
        
        if (this.gameState === 'DESCENDING') {
            if (this.firefighter.progress > 0) {
                this.firefighter.progress -= 2;
            } else {
                this.firefighter.progress = 0;
                this.gameState = 'RESCUED';
                this.instructionText.textContent = 'Great job! Animal saved!';
                this.animalSynth.triggerAttackRelease(this.selectedAnimal.sound, '4n');
                setTimeout(() => {
                    showHeroReport(`Great rescue! You saved the ${this.selectedAnimal.type}!`);
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
        this.fireTruckRescue.draw(this.ctx, this.gameState);
        
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
        if (this.gameState !== 'SELECT_ANIMAL' && this.gameState !== 'START' && this.gameState !== 'CONE_PLACED') {
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

    resizeCanvas() {
        this.canvas.width = this.gameScreen.clientWidth;
        this.canvas.height = this.gameScreen.clientHeight;
        
        // Update positions
        this.tree.x = this.canvas.width - 150;
        this.tree.y = this.canvas.height - 300;
        this.fireTruckRescue.y = this.canvas.height - 120;
        this.fireTruckRescue.coneButton.y = this.canvas.height - 120 + 30;
        this.fireTruckRescue.ladderButton.y = this.canvas.height - 120 + 30;
        this.fireTruckRescue.ladderBase.y = this.canvas.height - 120;
    }
}

window.AnimalRescueLevel = AnimalRescueLevel;
