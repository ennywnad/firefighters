# Animation Implementation Guide

## 🎬 Key Animation Techniques

### 1. Smooth Hose Uncurling Animation

```javascript
class HoseSegment {
    constructor(index, totalSegments) {
        this.index = index;
        this.angle = (Math.PI * 2) * (index / totalSegments); // Initial coiled position
        this.targetAngle = 0; // Extended position
        this.currentAngle = this.angle;
        this.spring = 0.1; // Spring constant
        this.damping = 0.8; // Damping factor
        this.velocity = 0;
    }
    
    update() {
        // Spring physics for smooth uncurling
        const force = (this.targetAngle - this.currentAngle) * this.spring;
        this.velocity += force;
        this.velocity *= this.damping;
        this.currentAngle += this.velocity;
    }
}

// Usage: Create 20 segments that uncurl with a slight delay
const hoseSegments = [];
for (let i = 0; i < 20; i++) {
    hoseSegments.push(new HoseSegment(i, 20));
}

// Trigger uncurling with cascading delay
function uncurlHose() {
    hoseSegments.forEach((segment, i) => {
        setTimeout(() => {
            segment.targetAngle = (i / 20) * Math.PI; // Straighten out
        }, i * 50); // 50ms delay between segments
    });
}
```

### 2. Tool Rotation Animations

```javascript
class AnimatedTool {
    constructor(type) {
        this.type = type;
        this.rotation = 0;
        this.targetRotation = 0;
        this.scale = 1;
        this.wobble = 0;
        this.isActive = false;
    }
    
    // Wrench tightening animation
    tightenBolt() {
        this.targetRotation += Math.PI * 2; // Full rotation
        this.scale = 1.2; // Slight scale up
        
        // Ease back to normal
        setTimeout(() => {
            this.scale = 1;
        }, 200);
    }
    
    // Hover effect
    onHover() {
        this.wobble = Math.sin(Date.now() * 0.01) * 0.1;
    }
    
    update() {
        // Smooth rotation
        this.rotation += (this.targetRotation - this.rotation) * 0.2;
    }
    
    draw(ctx, x, y) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(this.rotation + this.wobble);
        ctx.scale(this.scale, this.scale);
        
        // Draw tool based on type
        this.drawToolShape(ctx);
        
        ctx.restore();
    }
}
```

### 3. Particle Effects for Actions

```javascript
class ActionParticle {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.life = 1;
        this.velocity = {
            x: (Math.random() - 0.5) * 5,
            y: -Math.random() * 5 - 2
        };
        
        // Type-specific properties
        if (type === 'sparkle') {
            this.color = `hsl(${Math.random() * 60 + 30}, 100%, 70%)`;
            this.size = Math.random() * 3 + 2;
        } else if (type === 'woodchip') {
            this.color = '#8B4513';
            this.size = Math.random() * 4 + 2;
            this.rotation = Math.random() * Math.PI * 2;
            this.rotationSpeed = (Math.random() - 0.5) * 0.3;
        } else if (type === 'bubble') {
            this.color = 'rgba(100, 180, 255, 0.6)';
            this.size = Math.random() * 8 + 4;
            this.velocity.y = -Math.random() * 2 - 1; // Bubbles rise
        }
    }
    
    update() {
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.life -= 0.02;
        
        if (this.type === 'woodchip') {
            this.velocity.y += 0.3; // Gravity
            this.rotation += this.rotationSpeed;
        } else if (this.type === 'bubble') {
            this.velocity.x += (Math.random() - 0.5) * 0.2; // Wobble
        }
    }
    
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        
        if (this.type === 'sparkle') {
            // Star shape
            ctx.translate(this.x, this.y);
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const angle = (i / 5) * Math.PI * 2;
                const radius = i % 2 ? this.size : this.size * 0.5;
                ctx.lineTo(
                    Math.cos(angle) * radius,
                    Math.sin(angle) * radius
                );
            }
            ctx.fill();
        } else if (this.type === 'woodchip') {
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);
            ctx.fillRect(-this.size/2, -this.size/2, this.size, this.size);
        } else if (this.type === 'bubble') {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
            // Highlight
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.beginPath();
            ctx.arc(this.x - this.size/3, this.y - this.size/3, this.size/3, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
}
```

### 4. Bounce and Spring Effects

```javascript
class BouncyObject {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.baseY = y;
        this.velocityY = 0;
        this.squash = 1; // Vertical scale
        this.stretch = 1; // Horizontal scale
    }
    
    // Trigger a bounce
    bounce(intensity = 10) {
        this.velocityY = -intensity;
    }
    
    update() {
        // Physics
        this.velocityY += 0.8; // Gravity
        this.y += this.velocityY;
        
        // Hit ground
        if (this.y > this.baseY) {
            this.y = this.baseY;
            this.velocityY *= -0.5; // Bounce with damping
            
            // Squash and stretch
            this.squash = 0.8;
            this.stretch = 1.2;
        }
        
        // Gradually return to normal shape
        this.squash += (1 - this.squash) * 0.2;
        this.stretch += (1 - this.stretch) * 0.2;
    }
    
    draw(ctx, drawFunction) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(this.stretch, this.squash);
        drawFunction(ctx);
        ctx.restore();
    }
}
```

### 5. Smooth Transitions and Easing

```javascript
// Easing functions for smooth animations
const Easing = {
    // Acceleration from zero velocity
    easeInQuad: t => t * t,
    
    // Deceleration to zero velocity
    easeOutQuad: t => t * (2 - t),
    
    // Acceleration until halfway, then deceleration
    easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    
    // Elastic bounce effect
    easeOutElastic: t => {
        const p = 0.3;
        return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
    },
    
    // Overshooting cubic easing
    easeOutBack: t => {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }
};

// Usage example: Animate position with easing
class AnimatedPosition {
    constructor(startX, startY) {
        this.x = startX;
        this.y = startY;
        this.targetX = startX;
        this.targetY = startY;
        this.progress = 1;
        this.duration = 1000; // ms
        this.startTime = null;
        this.easingFunction = Easing.easeOutBack;
    }
    
    moveTo(x, y, duration = 1000, easing = Easing.easeOutBack) {
        this.startX = this.x;
        this.startY = this.y;
        this.targetX = x;
        this.targetY = y;
        this.duration = duration;
        this.startTime = Date.now();
        this.easingFunction = easing;
        this.progress = 0;
    }
    
    update() {
        if (this.progress < 1) {
            const elapsed = Date.now() - this.startTime;
            this.progress = Math.min(1, elapsed / this.duration);
            const easedProgress = this.easingFunction(this.progress);
            
            this.x = this.startX + (this.targetX - this.startX) * easedProgress;
            this.y = this.startY + (this.targetY - this.startY) * easedProgress;
        }
    }
}
```

## 🎮 Implementation Priority

1. **Phase 1: Core Animations**
   - Hose uncurling with spring physics
   - Tool hover effects and selection
   - Basic particle systems

2. **Phase 2: Action Animations**
   - Wrench rotation for bolts
   - Water filling with bubbles
   - Badge polishing with sparkles

3. **Phase 3: Character Animations**
   - Firefighter walking cycle
   - Climbing improvements
   - Victory celebration

4. **Phase 4: Environmental Effects**
   - Improved scene particles
   - Dynamic lighting effects
   - Weather transitions

## 🔧 Best Practices

1. **Performance**: Use `requestAnimationFrame` for smooth 60fps
2. **Easing**: Apply easing functions for natural movement
3. **Feedback**: Every action needs visual + audio response
4. **Clarity**: Highlight interactive elements clearly
5. **Delight**: Add small details that surprise and entertain

## 📚 Resources

- [Canvas Animation Basics](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Basic_animations)
- [Easing Functions](https://easings.net/)
- [Spring Physics](https://blog.maximeheckel.com/posts/the-physics-behind-spring-animations/)
- [Particle Systems](https://codepen.io/collection/DYWYxN)
