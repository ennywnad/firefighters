// Advanced hose animation with spring physics
class AnimatedHose {
    constructor(startX, startY, coilRadius = 20) {
        this.startX = startX;
        this.startY = startY;
        this.coilRadius = coilRadius;
        this.segments = [];
        this.isCoiled = true;
        this.isAnimating = false;
        
        // Create hose segments
        const segmentCount = 30;
        for (let i = 0; i < segmentCount; i++) {
            this.segments.push(new HoseSegment(i, segmentCount, coilRadius));
        }
    }
    
    uncurl(targetX, targetY, onComplete) {
        if (this.isAnimating) return;
        
        this.isAnimating = true;
        this.isCoiled = false;
        
        // Calculate target positions for each segment
        const dx = targetX - this.startX;
        const dy = targetY - this.startY;
        const distance = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx);
        
        // Animate each segment with a delay
        this.segments.forEach((segment, i) => {
            setTimeout(() => {
                const progress = (i + 1) / this.segments.length;
                segment.targetX = this.startX + Math.cos(angle) * distance * progress;
                segment.targetY = this.startY + Math.sin(angle) * distance * progress;
                segment.uncurl();
                
                // Add some waviness
                segment.waveOffset = i * 0.2;
                segment.waveAmplitude = 10 * (1 - progress);
            }, i * 30); // 30ms delay between segments
        });
        
        // Mark animation complete
        setTimeout(() => {
            this.isAnimating = false;
            if (onComplete) onComplete();
        }, this.segments.length * 30 + 500);
    }
    
    coil() {
        this.isCoiled = true;
        this.segments.forEach((segment, i) => {
            segment.coil();
        });
    }
    
    update() {
        this.segments.forEach(segment => segment.update());
    }
    
    draw(ctx) {
        // Draw hose as a continuous bezier curve
        ctx.strokeStyle = '#f1c40f';
        ctx.lineWidth = 10;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        ctx.beginPath();
        
        if (this.isCoiled) {
            // Draw coiled hose
            ctx.arc(this.startX, this.startY, this.coilRadius, 0, Math.PI * 2);
            ctx.stroke();
            
            // Inner coil
            ctx.beginPath();
            ctx.arc(this.startX, this.startY, this.coilRadius * 0.7, 0, Math.PI * 2);
            ctx.strokeStyle = '#e67e22';
            ctx.stroke();
        } else {
            // Draw uncurled hose with smooth curves
            ctx.strokeStyle = '#f1c40f';
            ctx.beginPath();
            ctx.moveTo(this.startX, this.startY);
            
            for (let i = 0; i < this.segments.length - 1; i++) {
                const current = this.segments[i];
                const next = this.segments[i + 1];
                
                // Control point for bezier curve
                const cpX = (current.currentX + next.currentX) / 2;
                const cpY = (current.currentY + next.currentY) / 2;
                
                ctx.quadraticCurveTo(
                    current.currentX, current.currentY,
                    cpX, cpY
                );
            }
            
            // Draw to last segment
            const last = this.segments[this.segments.length - 1];
            ctx.lineTo(last.currentX, last.currentY);
            ctx.stroke();
            
            // Draw hose texture/ridges
            ctx.strokeStyle = '#e67e22';
            ctx.lineWidth = 2;
            for (let i = 0; i < this.segments.length; i += 3) {
                const segment = this.segments[i];
                ctx.beginPath();
                ctx.arc(segment.currentX, segment.currentY, 4, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
    }
}

class HoseSegment {
    constructor(index, totalSegments, coilRadius) {
        this.index = index;
        this.totalSegments = totalSegments;
        
        // Coiled position
        const angle = (Math.PI * 2) * (index / totalSegments) * 3; // 3 coils
        this.coiledX = Math.cos(angle) * coilRadius * (0.5 + index / totalSegments * 0.5);
        this.coiledY = Math.sin(angle) * coilRadius * (0.5 + index / totalSegments * 0.5);
        
        // Current position (starts coiled)
        this.currentX = this.coiledX;
        this.currentY = this.coiledY;
        
        // Target position (will be set when uncurling)
        this.targetX = this.coiledX;
        this.targetY = this.coiledY;
        
        // Spring physics
        this.velocityX = 0;
        this.velocityY = 0;
        this.springConstant = 0.15;
        this.damping = 0.85;
        
        // Wave animation
        this.waveOffset = 0;
        this.waveAmplitude = 0;
        this.waveTime = 0;
    }
    
    uncurl() {
        // Target will be set by parent AnimatedHose
    }
    
    coil() {
        this.targetX = this.coiledX;
        this.targetY = this.coiledY;
        this.waveAmplitude = 0;
    }
    
    update() {
        // Spring physics for smooth movement
        const forceX = (this.targetX - this.currentX) * this.springConstant;
        const forceY = (this.targetY - this.currentY) * this.springConstant;
        
        this.velocityX += forceX;
        this.velocityY += forceY;
        
        this.velocityX *= this.damping;
        this.velocityY *= this.damping;
        
        this.currentX += this.velocityX;
        this.currentY += this.velocityY;
        
        // Add wave motion when uncurled
        if (this.waveAmplitude > 0) {
            this.waveTime += 0.1;
            const waveOffset = Math.sin(this.waveTime + this.waveOffset) * this.waveAmplitude;
            this.currentY += waveOffset * 0.1;
        }
    }
}

// Nozzle with smooth rotation and spray effects
class AnimatedNozzle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.rotation = new AnimatedValue(-Math.PI / 4);
        this.length = 60;
        this.width = 15;
        this.isActive = false;
        this.sprayParticles = new ParticleSystem();
    }
    
    aimAt(targetX, targetY) {
        const angle = Math.atan2(targetY - this.y, targetX - this.x);
        this.rotation.animateTo(angle, 200, 'easeOutQuad');
    }
    
    startSpraying() {
        this.isActive = true;
    }
    
    stopSpraying() {
        this.isActive = false;
    }
    
    update(mouseX, mouseY) {
        this.rotation.update();
        
        if (this.isActive) {
            this.aimAt(mouseX, mouseY);
            
            // Create water particles
            const nozzleEndX = this.x + Math.cos(this.rotation.value) * this.length;
            const nozzleEndY = this.y + Math.sin(this.rotation.value) * this.length;
            
            // Emit water particles
            for (let i = 0; i < 3; i++) {
                const spread = 0.2;
                const angle = this.rotation.value + (Math.random() - 0.5) * spread;
                const speed = 8 + Math.random() * 4;
                
                this.sprayParticles.particles.push({
                    x: nozzleEndX,
                    y: nozzleEndY,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    size: Math.random() * 5 + 5,
                    life: 1,
                    gravity: 0.3,
                    update: function() {
                        this.x += this.vx;
                        this.y += this.vy;
                        this.vy += this.gravity;
                        this.life -= 0.02;
                    },
                    draw: function(ctx) {
                        ctx.save();
                        ctx.globalAlpha = this.life * 0.8;
                        ctx.fillStyle = 'rgba(52, 152, 219, 0.8)';
                        ctx.beginPath();
                        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                        ctx.fill();
                        
                        // Inner highlight
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                        ctx.beginPath();
                        ctx.arc(this.x - this.size/3, this.y - this.size/3, this.size/3, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.restore();
                    }
                });
            }
        }
        
        this.sprayParticles.update();
    }
    
    draw(ctx) {
        // Draw nozzle base
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Base mount
        ctx.fillStyle = '#7f8c8d';
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fill();
        
        // Rotating nozzle
        ctx.rotate(this.rotation.value);
        
        // Nozzle body
        ctx.fillStyle = '#95a5a6';
        ctx.fillRect(0, -this.width/2, this.length, this.width);
        
        // Nozzle tip
        ctx.fillStyle = '#bdc3c7';
        ctx.beginPath();
        ctx.moveTo(this.length, -this.width/2);
        ctx.lineTo(this.length + 10, -this.width/3);
        ctx.lineTo(this.length + 10, this.width/3);
        ctx.lineTo(this.length, this.width/2);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
        
        // Draw water spray
        this.sprayParticles.draw(ctx);
    }
}

window.HoseSystem = {
    AnimatedHose,
    AnimatedNozzle
};
