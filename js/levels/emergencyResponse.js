// ES6 Class for Emergency Response Level (Level 5)
class EmergencyResponseLevel {
    constructor() {
        this.gameScreen = document.getElementById('emergency-response-screen');
        this.canvas = document.getElementById('emergencyResponseCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.instructionText = document.getElementById('emergency-response-instructions');

        const { AnimatedValue } = window.AnimationUtils;
        this.phone = {
            x: 100,
            y: 100,
            rotation: new AnimatedValue(0),
            isRinging: false
        };
        this.map = {
            alpha: new AnimatedValue(0),
            isShowing: false
        };
        
        this.currentStage = 0;
        this.stages = [
            { id: 'ANSWER_CALL', instruction: 'Click the ringing phone!' }
            // ... other stages will be added here
        ];
    }

    start() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        this.canvas.addEventListener('click', (e) => this.handleClick(e));

        this.instructionText.textContent = this.stages[0].instruction;
        this.phone.isRinging = true;
        this.phone.rotation.animateTo(0.2, 100, 'easeOutQuad', () => {
            this.phone.rotation.animateTo(-0.2, 100, 'easeOutQuad', () => {
                this.phone.rotation.animateTo(0, 500, 'easeOutElastic');
            });
        });
        
        this.gameLoop();
    }

    handleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (this.currentStage === 0 && Math.hypot(x - this.phone.x, y - this.phone.y) < 50) {
            this.phone.isRinging = false;
            this.map.isShowing = true;
            this.map.alpha.animateTo(1, 500, 'easeOutQuad');
            this.currentStage++;
            // ... (logic for next stage)
        }
    }

    gameLoop() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }

    draw() {
        // Draw phone
        this.ctx.save();
        this.ctx.translate(this.phone.x, this.phone.y);
        if (this.phone.isRinging) {
            this.ctx.rotate(this.phone.rotation.update());
        }
        this.ctx.fillStyle = 'red';
        this.ctx.fillRect(-20, -30, 40, 60);
        this.ctx.restore();

        // Draw map
        if (this.map.isShowing) {
            this.ctx.save();
            this.ctx.globalAlpha = this.map.alpha.update();
            this.ctx.fillStyle = '#f3eacb';
            this.ctx.fillRect(this.canvas.width / 2 - 150, this.canvas.height / 2 - 100, 300, 200);
            this.ctx.strokeStyle = '#8B4513';
            this.ctx.strokeRect(this.canvas.width / 2 - 150, this.canvas.height / 2 - 100, 300, 200);
            this.ctx.restore();
        }
    }

    resizeCanvas() {
        this.canvas.width = this.gameScreen.clientWidth;
        this.canvas.height = this.gameScreen.clientHeight;
    }
}

window.EmergencyResponseLevel = EmergencyResponseLevel;
