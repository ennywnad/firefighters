/**
 * Base class for all game levels providing common functionality
 * Handles canvas setup, audio management, event listeners, and basic game loop
 */
class GameLevel {
    constructor(options = {}) {
        // Canvas and screen setup
        this.canvas = options.canvas || this.createCanvas();
        this.gameScreen = options.gameScreen || this.createGameScreen();
        this.ctx = this.canvas.getContext('2d');
        this.instructionText = this.gameScreen.querySelector('.instructions');
        this.titleElement = this.gameScreen.querySelector('.title');
        
        // Common game state
        this.gameState = 'START';
        this.mouse = { x: 0, y: 0 };
        this.isRunning = false;
        this.animationId = null;
        
        // Audio system
        this.sounds = this.createSounds();
        
        // Event handling
        this.eventListeners = [];
        this.setupEventListeners();
        
        // Resize handling
        this.setupResizeHandler();
    }
    
    /**
     * Creates canvas element if not provided
     */
    createCanvas() {
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 600;
        return canvas;
    }
    
    /**
     * Creates game screen container if not provided
     */
    createGameScreen() {
        const screen = document.createElement('div');
        screen.className = 'game-screen';
        
        const instructions = document.createElement('div');
        instructions.className = 'instructions';
        screen.appendChild(instructions);
        
        const title = document.createElement('h2');
        title.className = 'title';
        screen.appendChild(title);
        
        return screen;
    }
    
    /**
     * Creates common sound objects using SoundManager
     */
    createSounds() {
        return {
            action: new Tone.Synth({ 
                oscillator: { type: 'triangle' }, 
                envelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.1 } 
            }).toDestination(),
            
            success: new Tone.Synth({ 
                oscillator: { type: 'sine' }, 
                envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.2 } 
            }).toDestination(),
            
            completion: new Tone.PolySynth(Tone.Synth).toDestination()
        };
    }
    
    /**
     * Sets up common event listeners
     */
    setupEventListeners() {
        // Mouse events
        this.addEventHandler(this.canvas, 'mousemove', (e) => this.handleMouseMove(e));
        this.addEventHandler(this.canvas, 'mousedown', (e) => this.handleMouseDown(e));
        this.addEventHandler(window, 'mouseup', (e) => this.handleMouseUp(e));
        
        // Touch events  
        this.addEventHandler(this.canvas, 'touchmove', (e) => this.handleTouchMove(e), { passive: false });
        this.addEventHandler(this.canvas, 'touchstart', (e) => this.handleTouchStart(e), { passive: false });
        this.addEventHandler(window, 'touchend', (e) => this.handleTouchEnd(e));
    }
    
    /**
     * Adds event listener and tracks it for cleanup
     */
    addEventHandler(element, event, handler, options = {}) {
        element.addEventListener(event, handler, options);
        this.eventListeners.push({ element, event, handler, options });
    }
    
    /**
     * Sets up canvas resize handling
     */
    setupResizeHandler() {
        this.addEventHandler(window, 'resize', () => this.resizeCanvas());
    }
    
    /**
     * Updates mouse position from event
     */
    updateMousePosition(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        this.mouse.x = (e.clientX - rect.left) * scaleX;
        this.mouse.y = (e.clientY - rect.top) * scaleY;
    }
    
    /**
     * Updates mouse position from touch event
     */
    updateTouchPosition(e) {
        if (e.touches.length > 0) {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            
            this.mouse.x = (e.touches[0].clientX - rect.left) * scaleX;
            this.mouse.y = (e.touches[0].clientY - rect.top) * scaleY;
        }
    }
    
    /**
     * Default mouse move handler
     */
    handleMouseMove(e) {
        this.updateMousePosition(e);
        this.onMouseMove?.(e);
    }
    
    /**
     * Default mouse down handler
     */
    handleMouseDown(e) {
        this.updateMousePosition(e);
        this.onMouseDown?.(e);
    }
    
    /**
     * Default mouse up handler
     */
    handleMouseUp(e) {
        this.onMouseUp?.(e);
    }
    
    /**
     * Default touch move handler
     */
    handleTouchMove(e) {
        e.preventDefault();
        this.updateTouchPosition(e);
        this.onTouchMove?.(e);
    }
    
    /**
     * Default touch start handler
     */
    handleTouchStart(e) {
        e.preventDefault();
        this.updateTouchPosition(e);
        this.onTouchStart?.(e);
    }
    
    /**
     * Default touch end handler
     */
    handleTouchEnd(e) {
        this.onTouchEnd?.(e);
    }
    
    /**
     * Resizes canvas to fill container while maintaining aspect ratio
     */
    resizeCanvas() {
        const container = this.canvas.parentElement;
        if (!container) return;
        
        const containerRect = container.getBoundingClientRect();
        const aspectRatio = 4 / 3; // Standard game aspect ratio
        
        let width = containerRect.width;
        let height = width / aspectRatio;
        
        if (height > containerRect.height) {
            height = containerRect.height;
            width = height * aspectRatio;
        }
        
        this.canvas.style.width = width + 'px';
        this.canvas.style.height = height + 'px';
        
        // Update internal canvas resolution for crisp rendering
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = width * dpr;
        this.canvas.height = height * dpr;
        this.ctx.scale(dpr, dpr);
        
        this.onResize?.();
    }
    
    /**
     * Starts the game level
     */
    start() {
        this.gameState = 'START';
        this.isRunning = true;
        this.resizeCanvas();
        this.onStart?.();
        this.gameLoop();
    }
    
    /**
     * Stops the game level
     */
    stop() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        this.onStop?.();
    }
    
    /**
     * Main game loop
     */
    gameLoop() {
        if (!this.isRunning) return;
        
        this.update?.();
        this.draw?.();
        
        this.animationId = requestAnimationFrame(() => this.gameLoop());
    }
    
    /**
     * Plays a sound effect
     */
    playSound(soundName, note = 'C4', duration = '8n') {
        try {
            if (this.sounds[soundName]) {
                this.sounds[soundName].triggerAttackRelease(note, duration);
            }
        } catch (error) {
            console.warn('Could not play sound:', soundName, error);
        }
    }
    
    /**
     * Updates instruction text
     */
    setInstructions(text) {
        if (this.instructionText) {
            this.instructionText.textContent = text;
        }
    }
    
    /**
     * Sets the level title
     */
    setTitle(title) {
        if (this.titleElement) {
            this.titleElement.textContent = title;
        }
    }
    
    /**
     * Cleans up resources when level is destroyed
     */
    destroy() {
        this.stop();
        
        // Remove all event listeners
        this.eventListeners.forEach(({ element, event, handler, options }) => {
            element.removeEventListener(event, handler, options);
        });
        this.eventListeners = [];
        
        // Clean up audio
        Object.values(this.sounds).forEach(synth => {
            try {
                synth.dispose?.();
            } catch (error) {
                console.warn('Error disposing synth:', error);
            }
        });
        
        this.onDestroy?.();
    }
    
    /**
     * Override points for subclasses
     */
    onStart() { /* Override in subclass */ }
    onStop() { /* Override in subclass */ }
    onDestroy() { /* Override in subclass */ }
    onResize() { /* Override in subclass */ }
    update() { /* Override in subclass */ }
    draw() { /* Override in subclass */ }
    onMouseMove(e) { /* Override in subclass */ }
    onMouseDown(e) { /* Override in subclass */ }
    onMouseUp(e) { /* Override in subclass */ }
    onTouchMove(e) { /* Override in subclass */ }
    onTouchStart(e) { /* Override in subclass */ }
    onTouchEnd(e) { /* Override in subclass */ }
}