// Fire Truck Building Level - Level 3
function startTruckBuildingGame() {
    const canvas = document.createElement('canvas');
    canvas.id = 'truckBuildingCanvas';
    const ctx = canvas.getContext('2d');
    
    // Create game screen container
    let gameScreen = document.getElementById('truck-building-screen');
    if (!gameScreen) {
        gameScreen = document.createElement('div');
        gameScreen.id = 'truck-building-screen';
        gameScreen.className = 'game-screen hidden';
        gameScreen.innerHTML = `
            <div class="title">Build Your Fire Truck!</div>
            <div id="truck-building-instructions" class="instructions">Click the toolbox to begin!</div>
            <button class="menu-button" onclick="goToMenu()">Menu</button>
        `;
        gameScreen.appendChild(canvas);
        document.body.appendChild(gameScreen);
    }
    
    const instructionText = document.getElementById('truck-building-instructions');
    
    // Initialize animation systems
    const { SpringAnimation, ParticleSystem, BouncyObject, AnimatedValue } = window.AnimationUtils;
    const particles = new ParticleSystem();
    
    // Sound effects
    const clickSynth = new Tone.Synth({ oscillator: { type: 'triangle' } }).toDestination();
    const successSynth = new Tone.Synth({ oscillator: { type: 'sine' } }).toDestination();
    const completionSynth = new Tone.PolySynth(Tone.Synth).toDestination();
    const wrenchSound = new Tone.MetalSynth().toDestination();
    
    // Game state
    let gameState = 'TOOLBOX_CLOSED';
    let mouse = { x: 0, y: 0 };
    let selectedTool = null;
    let completedSteps = [];
    let currentStep = 0;
    
    // Animated toolbox
    const toolbox = {
        x: 100,
        y: 0,
        width: 120,
        height: 80,
        lidAngle: new AnimatedValue(0),
        isOpen: false,
        tools: [
            { type: 'wrench', x: -30, y: 0, hover: false, rotation: new AnimatedValue(0), selected: false },
            { type: 'hammer', x: 0, y: 0, hover: false, bounce: new AnimatedValue(0), selected: false },
            { type: 'screwdriver', x: 30, y: 0, hover: false, wiggle: new AnimatedValue(0), selected: false }
        ],
        open: function() {
            this.isOpen = true;
            this.lidAngle.animateTo(-Math.PI/3, 500, 'easeOutBack');
            // Make tools jump
            this.tools.forEach((tool, i) => {
                setTimeout(() => {
                    if (tool.type === 'wrench') tool.rotation.animateTo(Math.PI * 2, 300, 'easeOutQuad');
                    if (tool.type === 'hammer') tool.bounce.animateTo(1, 300, 'easeOutBounce');
                }, i * 100);
            });
        },
        draw: function() {
            this.y = canvas.height - 100;
            
            ctx.save();
            ctx.translate(this.x, this.y);
            
            // Box base
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
            
            // Tools (if open)
            if (this.isOpen) {
                this.tools.forEach(tool => {
                    ctx.save();
                    ctx.translate(tool.x, tool.y - 20);
                    
                    // Hover effect
                    if (tool.hover && !tool.selected) {
                        ctx.scale(1.1, 1.1);
                        const wiggle = Math.sin(Date.now() * 0.01) * 0.1;
                        ctx.rotate(wiggle);
                    }
                    
                    if (tool.type === 'wrench') {
                        ctx.rotate(tool.rotation.update());
                        ctx.fillStyle = tool.selected ? '#f39c12' : '#95a5a6';
                        // Draw wrench shape
                        ctx.beginPath();
                        ctx.moveTo(-15, -5);
                        ctx.lineTo(15, -5);
                        ctx.lineTo(20, 0);
                        ctx.lineTo(15, 5);
                        ctx.lineTo(-15, 5);
                        ctx.arc(-15, 0, 5, Math.PI/2, -Math.PI/2, true);
                        ctx.closePath();
                        ctx.fill();
                    } else if (tool.type === 'hammer') {
                        const bounceY = -tool.bounce.update() * 10;
                        ctx.translate(0, bounceY);
                        ctx.fillStyle = tool.selected ? '#f39c12' : '#7f8c8d';
                        // Handle
                        ctx.fillRect(-3, 0, 6, 20);
                        // Head
                        ctx.fillRect(-10, -8, 20, 8);
                    } else if (tool.type === 'screwdriver') {
                        ctx.fillStyle = tool.selected ? '#f39c12' : '#e67e22';
                        // Handle
                        ctx.fillRect(-4, 5, 8, 15);
                        // Shaft
                        ctx.fillStyle = '#95a5a6';
                        ctx.fillRect(-2, -15, 4, 20);
                    }
                    
                    ctx.restore();
                });
            }
            
            // Lid
            ctx.save();
            ctx.translate(0, -this.height/2);
            ctx.rotate(this.lidAngle.update());
            ctx.fillStyle = '#A0522D';
            ctx.fillRect(-this.width/2, 0, this.width, 5);
            ctx.restore();
            
            // Highlight if closed
            if (!this.isOpen && gameState === 'TOOLBOX_CLOSED') {
                drawHighlight(0, 0, this.width/2 + 10);
            }
            
            ctx.restore();
        }
    };
    
    // Truck components with animations
    const truck = {
        x: 0,
        y: 0,
        width: 180,
        height: 100,
        wheelRotation: new AnimatedValue(0),
        badgeShine: new AnimatedValue(0),
        waterLevel: new AnimatedValue(0),
        bounce: new BouncyObject(0, 0),
        ladderProgress: new AnimatedValue(0),
        sirenRotation: new AnimatedValue(0),
        sirenLight: new AnimatedValue(0),
        tireInflation: new AnimatedValue(0.8),
        bolts: [
            { x: -60, y: 40, tightened: false, rotation: new AnimatedValue(0) },
            { x: 60, y: 40, tightened: false, rotation: new AnimatedValue(0) },
            { x: 0, y: -20, tightened: false, rotation: new AnimatedValue(0) }
        ],
        
        draw: function() {
            this.x = canvas.width / 2;
            this.y = canvas.height / 2;
            
            ctx.save();
            ctx.translate(this.x, this.y);
            
            // Apply bounce transformation
            this.bounce.update();
            ctx.translate(0, this.bounce.y - this.bounce.baseY);
            ctx.scale(this.bounce.stretch, this.bounce.squash);
            
            // Truck body
            ctx.fillStyle = '#e74c3c';
            ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
            
            // Cabin
            ctx.fillStyle = '#c0392b';
            ctx.fillRect(this.width/4, -this.height/2 - 30, this.width/2, 40);
            
            // Windows
            ctx.fillStyle = '#87CEEB';
            ctx.fillRect(this.width/4 + 5, -this.height/2 - 25, this.width/2 - 10, 25);
            
            // Water tank
            ctx.fillStyle = '#95a5a6';
            ctx.fillRect(-this.width/2 + 20, -this.height/2 + 10, 60, 40);
            
            // Water level animation
            const waterHeight = this.waterLevel.update() * 35;
            if (waterHeight > 0) {
                ctx.fillStyle = 'rgba(52, 152, 219, 0.7)';
                ctx.fillRect(-this.width/2 + 23, -this.height/2 + 47 - waterHeight, 54, waterHeight);
            }
            
            // Ladder (if installed)
            const ladderPos = this.ladderProgress.update();
            if (ladderPos > 0) {
                ctx.save();
                ctx.translate(0, -this.height/2);
                ctx.fillStyle = '#bdc3c7';
                const ladderWidth = 100 * ladderPos;
                ctx.fillRect(-ladderWidth/2, -10, ladderWidth, 8);
                // Ladder rungs
                ctx.fillStyle = '#7f8c8d';
                for (let i = 0; i < ladderWidth; i += 15) {
                    ctx.fillRect(-ladderWidth/2 + i, -10, 2, 8);
                }
                ctx.restore();
            }
            
            // Badge
            ctx.save();
            ctx.translate(30, 0);
            const shineAmount = this.badgeShine.update();
            ctx.fillStyle = `rgba(255, 215, 0, ${0.5 + shineAmount * 0.5})`;
            ctx.beginPath();
            ctx.arc(0, 0, 15, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#FFD700';
            ctx.font = '20px Bangers';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('FD', 0, 0);
            if (shineAmount > 0) {
                particles.emit(30, this.y, 'sparkle', 2, { spread: 10 });
            }
            ctx.restore();
            
            // Siren
            ctx.save();
            ctx.translate(0, -this.height/2 - 40);
            ctx.rotate(this.sirenRotation.update());
            const lightBrightness = this.sirenLight.update();
            ctx.fillStyle = `rgba(255, 0, 0, ${lightBrightness})`;
            ctx.fillRect(-20, -5, 40, 10);
            ctx.fillStyle = `rgba(0, 0, 255, ${lightBrightness})`;
            ctx.fillRect(-20, -5, 20, 10);
            ctx.restore();
            
            // Wheels with tire inflation
            const tireScale = 0.5 + this.tireInflation.update() * 0.5;
            [-60, 60].forEach(xPos => {
                ctx.save();
                ctx.translate(xPos, this.height/2);
                ctx.scale(tireScale, tireScale);
                ctx.rotate(this.wheelRotation.update());
                ctx.fillStyle = '#333';
                ctx.beginPath();
                ctx.arc(0, 0, 25, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#555';
                ctx.beginPath();
                ctx.arc(0, 0, 15, 0, Math.PI * 2);
                ctx.fill();
                // Spokes
                ctx.strokeStyle = '#777';
                ctx.lineWidth = 2;
                for (let i = 0; i < 6; i++) {
                    const angle = (i / 6) * Math.PI * 2;
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(Math.cos(angle) * 15, Math.sin(angle) * 15);
                    ctx.stroke();
                }
                ctx.restore();
            });
            
            // Bolts
            this.bolts.forEach(bolt => {
                ctx.save();
                ctx.translate(bolt.x, bolt.y);
                ctx.rotate(bolt.rotation.update());
                ctx.fillStyle = bolt.tightened ? '#FFD700' : '#7f8c8d';
                // Hexagonal bolt
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const angle = (i / 6) * Math.PI * 2;
                    const x = Math.cos(angle) * 8;
                    const y = Math.sin(angle) * 8;
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.closePath();
                ctx.fill();
                
                if (bolt.tightened) {
                    // Shine effect
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                    ctx.beginPath();
                    ctx.arc(0, 0, 5, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            });
            
            ctx.restore();
        }
    };
    
    // Game steps
    const steps = [
        {
            id: 'OPEN_TOOLBOX',
            instruction: 'Click the toolbox to open it!',
            check: () => toolbox.isOpen,
            action: () => {
                toolbox.open();
                clickSynth.triggerAttackRelease('C4', '8n');
                particles.emit(toolbox.x, toolbox.y - 40, 'sparkle', 10);
            }
        },
        {
            id: 'SELECT_WRENCH',
            instruction: 'Select the wrench!',
            check: (x, y) => {
                const tool = toolbox.tools.find(t => t.type === 'wrench');
                const dx = x - (toolbox.x + tool.x);
                const dy = y - (toolbox.y + tool.y - 20);
                return Math.hypot(dx, dy) < 20;
            },
            action: () => {
                selectedTool = 'wrench';
                toolbox.tools.find(t => t.type === 'wrench').selected = true;
                clickSynth.triggerAttackRelease('E4', '8n');
            }
        },
        {
            id: 'TIGHTEN_BOLTS',
            instruction: 'Click on the loose bolts to tighten them!',
            check: (x, y) => {
                const untightened = truck.bolts.filter(b => !b.tightened);
                if (untightened.length === 0) return false;
                
                for (let bolt of untightened) {
                    const dx = x - (truck.x + bolt.x);
                    const dy = y - (truck.y + bolt.y);
                    if (Math.hypot(dx, dy) < 15) {
                        bolt.rotation.animateTo(bolt.rotation.value + Math.PI * 4, 800, 'easeOutQuad');
                        bolt.tightened = true;
                        wrenchSound.triggerAttackRelease('C3', '8n');
                        particles.emit(truck.x + bolt.x, truck.y + bolt.y, 'spark', 5);
                        
                        if (truck.bolts.every(b => b.tightened)) {
                            setTimeout(() => successSynth.triggerAttackRelease('G4', '4n'), 500);
                            return true;
                        }
                    }
                }
                return false;
            },
            action: () => {}
        },
        {
            id: 'INSTALL_LADDER',
            instruction: 'Click the top of the truck to install the ladder!',
            check: (x, y) => {
                const dx = x - truck.x;
                const dy = y - (truck.y - truck.height/2);
                return Math.abs(dx) < 50 && Math.abs(dy) < 20;
            },
            action: () => {
                truck.ladderProgress.animateTo(1, 1000, 'easeOutBack');
                successSynth.triggerAttackRelease('A4', '4n');
                particles.emit(truck.x, truck.y - truck.height/2, 'sparkle', 20);
            }
        },
        {
            id: 'FILL_WATER',
            instruction: 'Click the water tank to fill it!',
            check: (x, y) => {
                const tankX = truck.x - truck.width/2 + 50;
                const tankY = truck.y - truck.height/2 + 30;
                const dx = x - tankX;
                const dy = y - tankY;
                return Math.abs(dx) < 30 && Math.abs(dy) < 20;
            },
            action: () => {
                truck.waterLevel.animateTo(1, 2000, 'easeInOutQuad');
                // Create bubble particles
                const bubbleInterval = setInterval(() => {
                    particles.emit(
                        truck.x - truck.width/2 + 50,
                        truck.y - truck.height/2 + 30,
                        'bubble', 3,
                        { spread: 10, gravity: -0.1 }
                    );
                }, 100);
                setTimeout(() => {
                    clearInterval(bubbleInterval);
                    successSynth.triggerAttackRelease('B4', '4n');
                }, 2000);
            }
        },
        {
            id: 'INFLATE_TIRES',
            instruction: 'Click the wheels to inflate the tires!',
            check: (x, y) => {
                const wheel1X = truck.x - 60;
                const wheel2X = truck.x + 60;
                const wheelY = truck.y + truck.height/2;
                
                const dx1 = x - wheel1X;
                const dy1 = y - wheelY;
                const dx2 = x - wheel2X;
                const dy2 = y - wheelY;
                
                return Math.hypot(dx1, dy1) < 25 || Math.hypot(dx2, dy2) < 25;
            },
            action: () => {
                truck.tireInflation.animateTo(1, 1000, 'easeOutElastic');
                truck.wheelRotation.animateTo(Math.PI * 2, 1000, 'easeOutQuad');
                clickSynth.triggerAttackRelease('D4', '8n');
                setTimeout(() => successSynth.triggerAttackRelease('C5', '4n'), 1000);
            }
        },
        {
            id: 'POLISH_BADGE',
            instruction: 'Click and hold the badge to polish it!',
            check: (x, y) => {
                const badgeX = truck.x + 30;
                const badgeY = truck.y;
                const dx = x - badgeX;
                const dy = y - badgeY;
                return Math.hypot(dx, dy) < 20;
            },
            action: () => {
                truck.badgeShine.animateTo(1, 500, 'easeInOutQuad', () => {
                    truck.badgeShine.animateTo(0, 1000, 'easeOutQuad');
                });
                successSynth.triggerAttackRelease('E5', '8n');
            }
        },
        {
            id: 'TEST_SIREN',
            instruction: 'Click the top of the truck to test the siren!',
            check: (x, y) => {
                const dx = x - truck.x;
                const dy = y - (truck.y - truck.height/2 - 40);
                return Math.abs(dx) < 30 && Math.abs(dy) < 20;
            },
            action: () => {
                // Animate siren
                truck.sirenRotation.animateTo(Math.PI * 4, 2000, 'linear');
                truck.sirenLight.animateTo(1, 100, 'easeOutQuad', () => {
                    truck.sirenLight.animateTo(0, 100, 'easeInQuad');
                });
                
                // Play siren sound
                const notes = ['C5', 'E5', 'C5', 'E5', 'C5', 'E5'];
                notes.forEach((note, i) => {
                    setTimeout(() => {
                        completionSynth.triggerAttackRelease(note, '8n');
                    }, i * 200);
                });
                
                // Final celebration
                setTimeout(() => {
                    truck.bounce.bounce(15);
                    particles.emit(truck.x, truck.y, 'confetti', 50, { spread: 50 });
                    showHeroReport('Amazing! You built a fire truck! 🚒');
                }, 2500);
            }
        }
    ];
    
    function drawHighlight(x, y, radius) {
        const pulse = Math.abs(Math.sin(Date.now() * 0.005)) * 5;
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, radius + pulse, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    function handleClick(e) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        if (currentStep < steps.length) {
            const step = steps[currentStep];
            if (step.check(x, y)) {
                step.action();
                completedSteps.push(step.id);
                currentStep++;
                
                if (currentStep < steps.length) {
                    instructionText.textContent = steps[currentStep].instruction;
                }
            }
        }
    }
    
    function handleMouseMove(e) {
        const rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
        
        // Check tool hover
        if (toolbox.isOpen) {
            toolbox.tools.forEach(tool => {
                const dx = mouse.x - (toolbox.x + tool.x);
                const dy = mouse.y - (toolbox.y + tool.y - 20);
                tool.hover = Math.hypot(dx, dy) < 20;
            });
        }
    }
    
    function gameLoop() {
        // Clear canvas
        ctx.fillStyle = currentScene.sky;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw ground
        ctx.fillStyle = currentScene.ground;
        ctx.fillRect(0, canvas.height - 40, canvas.width, 40);
        
        // Update and draw particles
        particles.update();
        
        // Draw truck
        truck.draw();
        
        // Draw toolbox
        toolbox.draw();
        
        // Draw particles on top
        particles.draw(ctx);
        
        // Highlight current interaction area
        if (currentStep < steps.length) {
            const step = steps[currentStep];
            if (step.id === 'TIGHTEN_BOLTS') {
                truck.bolts.forEach(bolt => {
                    if (!bolt.tightened) {
                        drawHighlight(truck.x + bolt.x, truck.y + bolt.y, 12);
                    }
                });
            } else if (step.id === 'FILL_WATER') {
                drawHighlight(truck.x - truck.width/2 + 50, truck.y - truck.height/2 + 30, 30);
            } else if (step.id === 'POLISH_BADGE') {
                drawHighlight(truck.x + 30, truck.y, 20);
            }
        }
        
        requestAnimationFrame(gameLoop);
    }
    
    function resizeCanvas() {
        canvas.width = gameScreen.clientWidth;
        canvas.height = gameScreen.clientHeight;
    }
    
    // Initialize
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('click', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        canvas.dispatchEvent(mouseEvent);
    });
    
    instructionText.textContent = steps[0].instruction;
    gameLoop();
}

// Export for use in main game
window.TruckBuildingGame = startTruckBuildingGame;
