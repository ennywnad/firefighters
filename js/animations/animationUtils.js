// Animation utilities and easing functions
const Animations = {
    // Easing functions for smooth animations
    easing: {
        linear: t => t,
        easeInQuad: t => t * t,
        easeOutQuad: t => t * (2 - t),
        easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
        easeOutElastic: t => {
            const p = 0.3;
            return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
        },
        easeOutBack: t => {
            const c1 = 1.70158;
            const c3 = c1 + 1;
            return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
        },
        easeOutBounce: t => {
            const n1 = 7.5625;
            const d1 = 2.75;
            if (t < 1 / d1) {
                return n1 * t * t;
            } else if (t < 2 / d1) {
                return n1 * (t -= 1.5 / d1) * t + 0.75;
            } else if (t < 2.5 / d1) {
                return n1 * (t -= 2.25 / d1) * t + 0.9375;
            } else {
                return n1 * (t -= 2.625 / d1) * t + 0.984375;
            }
        }
    },

    // Animate a value over time
    animate: function(startValue, endValue, duration, easingFunc, onUpdate, onComplete) {
        const startTime = Date.now();
        const easing = this.easing[easingFunc] || this.easing.linear;
        
        const update = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easing(progress);
            const currentValue = startValue + (endValue - startValue) * easedProgress;
            
            onUpdate(currentValue, progress);
            
            if (progress < 1) {
                requestAnimationFrame(update);
            } else if (onComplete) {
                onComplete();
            }
        };
        
        requestAnimationFrame(update);
    }
};

// Spring physics for smooth, natural animations
class SpringAnimation {
    constructor(value = 0, springConstant = 0.1, damping = 0.8) {
        this.current = value;
        this.target = value;
        this.velocity = 0;
        this.springConstant = springConstant;
        this.damping = damping;
    }
    
    setTarget(target) {
        this.target = target;
    }
    
    update() {
        const force = (this.target - this.current) * this.springConstant;
        this.velocity += force;
        this.velocity *= this.damping;
        this.current += this.velocity;
        return this.current;
    }
    
    isSettled(threshold = 0.01) {
        return Math.abs(this.velocity) < threshold && Math.abs(this.target - this.current) < threshold;
    }
}

// Particle system for visual effects
class ParticleSystem {
    constructor() {
        this.particles = [];
    }
    
    emit(x, y, type, count = 10, options = {}) {
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(x, y, type, options));
        }
    }
    
    update() {
        this.particles = this.particles.filter(p => {
            p.update();
            return p.life > 0;
        });
    }
    
    draw(ctx) {
        this.particles.forEach(p => p.draw(ctx));
    }
    
    clear() {
        this.particles = [];
    }
}

class Particle {
    constructor(x, y, type, options = {}) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.life = 1;
        
        // Common properties
        this.velocity = {
            x: (Math.random() - 0.5) * (options.spread || 5),
            y: -Math.random() * (options.initialVelocity || 5) - 2
        };
        
        // Type-specific properties
        switch(type) {
            case 'sparkle':
                this.color = options.color || `hsl(${Math.random() * 60 + 30}, 100%, 70%)`;
                this.size = Math.random() * 3 + 2;
                this.rotation = Math.random() * Math.PI * 2;
                this.rotationSpeed = (Math.random() - 0.5) * 0.2;
                break;
                
            case 'bubble':
                this.color = 'rgba(100, 180, 255, 0.6)';
                this.size = Math.random() * 8 + 4;
                this.velocity.y = -Math.random() * 2 - 1; // Bubbles rise
                break;
                
            case 'woodchip':
                this.color = options.color || '#8B4513';
                this.size = Math.random() * 4 + 2;
                this.rotation = Math.random() * Math.PI * 2;
                this.rotationSpeed = (Math.random() - 0.5) * 0.3;
                break;
                
            case 'spark':
                this.color = options.color || '#FFA500';
                this.size = Math.random() * 2 + 1;
                this.trail = [];
                break;
                
            case 'confetti':
                const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];
                this.color = colors[Math.floor(Math.random() * colors.length)];
                this.size = Math.random() * 6 + 3;
                this.rotation = Math.random() * Math.PI * 2;
                this.rotationSpeed = (Math.random() - 0.5) * 0.2;
                this.shape = Math.random() > 0.5 ? 'square' : 'circle';
                break;
        }
        
        this.fadeRate = options.fadeRate || 0.02;
        this.gravity = options.gravity !== undefined ? options.gravity : 0.3;
    }
    
    update() {
        // Update position
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        
        // Apply gravity
        if (this.type !== 'bubble') {
            this.velocity.y += this.gravity;
        }
        
        // Type-specific updates
        if (this.type === 'bubble') {
            this.velocity.x += (Math.random() - 0.5) * 0.2; // Wobble
        } else if (this.type === 'spark' && this.trail) {
            this.trail.push({x: this.x, y: this.y, alpha: this.life});
            if (this.trail.length > 5) this.trail.shift();
        }
        
        // Update rotation
        if (this.rotation !== undefined) {
            this.rotation += this.rotationSpeed;
        }
        
        // Fade out
        this.life -= this.fadeRate;
    }
    
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life;
        
        switch(this.type) {
            case 'sparkle':
                ctx.translate(this.x, this.y);
                ctx.rotate(this.rotation);
                ctx.fillStyle = this.color;
                ctx.beginPath();
                for (let i = 0; i < 8; i++) {
                    const angle = (i / 8) * Math.PI * 2;
                    const radius = i % 2 ? this.size : this.size * 0.4;
                    const x = Math.cos(angle) * radius;
                    const y = Math.sin(angle) * radius;
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.closePath();
                ctx.fill();
                break;
                
            case 'bubble':
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                // Highlight
                ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.beginPath();
                ctx.arc(this.x - this.size/3, this.y - this.size/3, this.size/3, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'woodchip':
                ctx.translate(this.x, this.y);
                ctx.rotate(this.rotation);
                ctx.fillStyle = this.color;
                ctx.fillRect(-this.size/2, -this.size/2, this.size, this.size * 0.5);
                break;
                
            case 'spark':
                // Draw trail
                if (this.trail) {
                    ctx.strokeStyle = this.color;
                    ctx.lineWidth = this.size;
                    ctx.beginPath();
                    this.trail.forEach((point, index) => {
                        ctx.globalAlpha = point.alpha * (index / this.trail.length);
                        if (index === 0) ctx.moveTo(point.x, point.y);
                        else ctx.lineTo(point.x, point.y);
                    });
                    ctx.stroke();
                }
                // Draw spark
                ctx.globalAlpha = this.life;
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'confetti':
                ctx.translate(this.x, this.y);
                ctx.rotate(this.rotation);
                ctx.fillStyle = this.color;
                if (this.shape === 'square') {
                    ctx.fillRect(-this.size/2, -this.size/2, this.size, this.size);
                } else {
                    ctx.beginPath();
                    ctx.arc(0, 0, this.size/2, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;
        }
        
        ctx.restore();
    }
}

// Bouncy object with squash and stretch
class BouncyObject {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.baseY = y;
        this.velocityY = 0;
        this.squash = 1;
        this.stretch = 1;
        this.rotation = 0;
        this.rotationVelocity = 0;
    }
    
    bounce(intensity = 10) {
        this.velocityY = -intensity;
        this.rotationVelocity = (Math.random() - 0.5) * 0.2;
    }
    
    update() {
        // Physics
        this.velocityY += 0.8; // Gravity
        this.y += this.velocityY;
        this.rotation += this.rotationVelocity;
        
        // Hit ground
        if (this.y > this.baseY) {
            this.y = this.baseY;
            this.velocityY *= -0.5; // Bounce with damping
            this.rotationVelocity *= 0.8;
            
            // Squash and stretch
            this.squash = 0.7;
            this.stretch = 1.3;
        }
        
        // Gradually return to normal shape
        this.squash += (1 - this.squash) * 0.2;
        this.stretch += (1 - this.stretch) * 0.2;
    }
    
    draw(ctx, drawFunction) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.scale(this.stretch, this.squash);
        drawFunction(ctx);
        ctx.restore();
    }
}

// Animated value with various interpolation methods
class AnimatedValue {
    constructor(initial = 0) {
        this.current = initial;
        this.target = initial;
        this.startValue = initial;
        this.startTime = 0;
        this.duration = 1000;
        this.easingFunc = 'easeOutQuad';
        this.isAnimating = false;
        this.onComplete = null;
    }
    
    animateTo(target, duration = 1000, easing = 'easeOutQuad', onComplete = null) {
        this.startValue = this.current;
        this.target = target;
        this.startTime = Date.now();
        this.duration = duration;
        this.easingFunc = easing;
        this.isAnimating = true;
        this.onComplete = onComplete;
    }
    
    update() {
        if (!this.isAnimating) return this.current;
        
        const elapsed = Date.now() - this.startTime;
        const progress = Math.min(elapsed / this.duration, 1);
        const easedProgress = Animations.easing[this.easingFunc](progress);
        
        this.current = this.startValue + (this.target - this.startValue) * easedProgress;
        
        if (progress >= 1) {
            this.isAnimating = false;
            if (this.onComplete) this.onComplete();
        }
        
        return this.current;
    }
    
    get value() {
        return this.current;
    }
    
    set value(v) {
        this.current = v;
        this.target = v;
        this.isAnimating = false;
    }
}

// Export for use in main game
window.AnimationUtils = {
    Animations,
    SpringAnimation,
    ParticleSystem,
    BouncyObject,
    AnimatedValue
};
