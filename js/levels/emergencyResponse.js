// ES6 Class for Emergency Response Level (Level 5)
class EmergencyResponseLevel {
    constructor() {
        this.gameScreen = document.getElementById('emergency-response-screen');
        this.canvas = document.getElementById('emergencyResponseCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.instructionText = document.getElementById('emergency-response-instructions');

        // Audio
        this.actionSynth = new Tone.Synth({ oscillator: { type: 'triangle' } }).toDestination();
        this.phoneSynth = new Tone.Synth({ oscillator: { type: 'sine' } }).toDestination();
        
        this.phone = {
            x: 150,
            y: 200,
            width: 80,
            height: 120,
            isRinging: true,
            ringTimer: 0
        };
        
        this.dispatcher = {
            x: 0,
            y: 0,
            visible: false
        };
        
        this.map = {
            x: 0,
            y: 0,
            visible: false,
            locations: [
                { name: "House Fire", x: 0, y: 0, type: "fire", selected: false },
                { name: "Cat Rescue", x: 0, y: 0, type: "animal", selected: false },
                { name: "Traffic Accident", x: 0, y: 0, type: "accident", selected: false }
            ]
        };
        
        this.currentStage = 0;
        this.selectedLocation = null;
        this.callsHandled = 0;
    }

    start() {
        this.resizeCanvas();
        this.setupPositions();
        window.addEventListener('resize', () => this.resizeCanvas());
        this.canvas.addEventListener('click', (e) => this.handleClick(e));

        this.instructionText.textContent = 'Click the ringing phone!';
        this.phone.isRinging = true;
        
        this.gameLoop();
    }
    
    setupPositions() {
        // Position elements based on canvas size
        this.phone.x = this.canvas.width * 0.2;
        this.phone.y = this.canvas.height * 0.3;
        
        this.dispatcher.x = this.canvas.width * 0.7;
        this.dispatcher.y = this.canvas.height * 0.3;
        
        this.map.x = this.canvas.width * 0.5 - 200;
        this.map.y = this.canvas.height * 0.5 - 150;
        
        // Position map locations
        this.map.locations[0].x = this.map.x + 80;  // House Fire
        this.map.locations[0].y = this.map.y + 80;
        this.map.locations[1].x = this.map.x + 250; // Cat Rescue  
        this.map.locations[1].y = this.map.y + 120;
        this.map.locations[2].x = this.map.x + 160; // Traffic Accident
        this.map.locations[2].y = this.map.y + 200;
    }

    handleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);

        if (this.currentStage === 0) {
            // Click phone to answer
            if (x >= this.phone.x && x <= this.phone.x + this.phone.width &&
                y >= this.phone.y && y <= this.phone.y + this.phone.height) {
                this.phone.isRinging = false;
                this.dispatcher.visible = true;
                this.currentStage = 1;
                this.instructionText.textContent = 'Listen to the emergency call...';
                this.actionSynth.triggerAttackRelease('C4', '8n');
                
                setTimeout(() => {
                    this.map.visible = true;
                    this.currentStage = 2;
                    this.instructionText.textContent = 'Click on an emergency location!';
                }, 2000);
            }
        } else if (this.currentStage === 2) {
            // Click on map locations
            this.map.locations.forEach((location, index) => {
                if (Math.hypot(x - location.x, y - location.y) < 30) {
                    this.selectedLocation = location;
                    location.selected = true;
                    this.currentStage = 3;
                    this.callsHandled++;
                    this.actionSynth.triggerAttackRelease('G4', '8n');
                    
                    setTimeout(() => {
                        const report = `🚨 EMERGENCY DISPATCH REPORT 🚨

📞 Calls Handled: ${this.callsHandled}
🎯 Selected Emergency: ${location.name}
⚡ Response Type: ${location.type.toUpperCase()}

${location.type === 'fire' ? 
  '🔥 Fire crew dispatched! Great choice!' : 
  location.type === 'animal' ? 
    '🐱 Animal rescue team sent! Well done!' : 
    '🚑 Emergency services dispatched! Excellent work!'}

Ready for the next emergency!`;

                        showHeroReport(report);
                    }, 1500);
                }
            });
        }
    }

    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
    
    update() {
        // Phone ringing animation
        if (this.phone.isRinging) {
            this.phone.ringTimer += 0.3;
            if (Math.floor(this.phone.ringTimer) % 60 === 0) {
                this.phoneSynth.triggerAttackRelease('A4', '8n');
            }
        }
    }

    draw() {
        // Clear canvas with emergency room background
        this.ctx.fillStyle = '#ecf0f1';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw dispatch desk
        this.ctx.fillStyle = '#34495e';
        this.ctx.fillRect(0, this.canvas.height - 150, this.canvas.width, 150);
        
        this.drawPhone();
        this.drawDispatcher();
        this.drawMap();
    }
    
    drawPhone() {
        // Phone base
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.fillRect(this.phone.x - 10, this.phone.y + 80, this.phone.width + 20, 40);
        
        // Phone handset
        const shake = this.phone.isRinging ? Math.sin(this.phone.ringTimer) * 3 : 0;
        this.ctx.fillStyle = this.phone.isRinging ? '#e74c3c' : '#95a5a6';
        this.ctx.beginPath();
        this.ctx.roundRect(this.phone.x + shake, this.phone.y, this.phone.width, this.phone.height, 10);
        this.ctx.fill();
        
        // Phone details
        this.ctx.fillStyle = '#2c3e50';
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                this.ctx.beginPath();
                this.ctx.arc(this.phone.x + 20 + j * 20, this.phone.y + 30 + i * 20, 6, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
        
        // Ringing indicator
        if (this.phone.isRinging) {
            const pulse = Math.abs(Math.sin(this.phone.ringTimer * 0.1)) * 10;
            this.ctx.strokeStyle = 'rgba(231, 76, 60, 0.8)';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.arc(this.phone.x + this.phone.width/2, this.phone.y + this.phone.height/2, 50 + pulse, 0, Math.PI * 2);
            this.ctx.stroke();
        }
    }
    
    drawDispatcher() {
        if (!this.dispatcher.visible) return;
        
        // Dispatcher figure
        this.ctx.fillStyle = '#f39c12';
        this.ctx.beginPath();
        this.ctx.arc(this.dispatcher.x, this.dispatcher.y, 30, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Body
        this.ctx.fillStyle = '#3498db';
        this.ctx.fillRect(this.dispatcher.x - 25, this.dispatcher.y + 20, 50, 80);
        
        // Speech bubble
        this.ctx.fillStyle = 'white';
        this.ctx.beginPath();
        this.ctx.roundRect(this.dispatcher.x - 80, this.dispatcher.y - 80, 120, 60, 10);
        this.ctx.fill();
        this.ctx.strokeStyle = '#2c3e50';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Emergency reported!', this.dispatcher.x - 20, this.dispatcher.y - 50);
        this.ctx.fillText('Choose location', this.dispatcher.x - 20, this.dispatcher.y - 35);
    }
    
    drawMap() {
        if (!this.map.visible) return;
        
        // Map background
        this.ctx.fillStyle = '#f3eacb';
        this.ctx.fillRect(this.map.x, this.map.y, 400, 300);
        this.ctx.strokeStyle = '#8B4513';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(this.map.x, this.map.y, 400, 300);
        
        // Map title
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('EMERGENCY MAP', this.map.x + 200, this.map.y + 25);
        
        // Draw roads
        this.ctx.strokeStyle = '#95a5a6';
        this.ctx.lineWidth = 8;
        this.ctx.beginPath();
        this.ctx.moveTo(this.map.x + 50, this.map.y + 150);
        this.ctx.lineTo(this.map.x + 350, this.map.y + 150);
        this.ctx.moveTo(this.map.x + 200, this.map.y + 50);
        this.ctx.lineTo(this.map.x + 200, this.map.y + 250);
        this.ctx.stroke();
        
        // Draw locations
        this.map.locations.forEach((location, index) => {
            const colors = { fire: '#e74c3c', animal: '#f39c12', accident: '#9b59b6' };
            const emojis = { fire: '🔥', animal: '🐱', accident: '🚗' };
            
            // Location marker
            this.ctx.fillStyle = location.selected ? '#27ae60' : colors[location.type];
            this.ctx.beginPath();
            this.ctx.arc(location.x, location.y, 20, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Pulsing effect for unselected
            if (!location.selected && this.currentStage === 2) {
                const pulse = Math.abs(Math.sin(Date.now() * 0.005)) * 5;
                this.ctx.strokeStyle = colors[location.type];
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.arc(location.x, location.y, 25 + pulse, 0, Math.PI * 2);
                this.ctx.stroke();
            }
            
            // Emoji
            this.ctx.font = '20px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(emojis[location.type], location.x, location.y + 7);
            
            // Label
            this.ctx.fillStyle = '#2c3e50';
            this.ctx.font = '12px Arial';
            this.ctx.fillText(location.name, location.x, location.y + 40);
        });
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
        
        // Reposition elements after resize
        this.setupPositions();
    }
}

window.EmergencyResponseLevel = EmergencyResponseLevel;
