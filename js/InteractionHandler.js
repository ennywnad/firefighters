/**
 * Reusable interaction handler for mouse and touch events
 * Provides unified interface for handling user input across all game levels
 */
class InteractionHandler {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.options = {
            enableHover: true,
            enableDrag: true,
            enableMultiTouch: false,
            touchThreshold: 10, // pixels
            hoverThreshold: 20, // pixels for touch hover simulation
            ...options
        };
        
        this.state = {
            isPressed: false,
            isDragging: false,
            startPosition: { x: 0, y: 0 },
            currentPosition: { x: 0, y: 0 },
            previousPosition: { x: 0, y: 0 },
            dragDistance: 0,
            hoverTarget: null,
            touches: new Map() // For multi-touch support
        };
        
        this.eventListeners = [];
        this.interactables = new Set();
        this.setupEventListeners();
    }
    
    /**
     * Set up all mouse and touch event listeners
     */
    setupEventListeners() {
        // Mouse events
        this.addEventHandler('mousedown', this.handleMouseDown.bind(this));
        this.addEventHandler('mousemove', this.handleMouseMove.bind(this));
        this.addEventHandler('mouseup', this.handleMouseUp.bind(this), window);
        this.addEventHandler('mouseleave', this.handleMouseLeave.bind(this));
        
        // Touch events
        this.addEventHandler('touchstart', this.handleTouchStart.bind(this), null, { passive: false });
        this.addEventHandler('touchmove', this.handleTouchMove.bind(this), null, { passive: false });
        this.addEventHandler('touchend', this.handleTouchEnd.bind(this), window, { passive: false });
        this.addEventHandler('touchcancel', this.handleTouchCancel.bind(this), window);
        
        // Prevent context menu on canvas
        this.addEventHandler('contextmenu', (e) => e.preventDefault());
    }
    
    /**
     * Add event listener and track for cleanup
     */
    addEventHandler(event, handler, element = null, options = {}) {
        const target = element || this.canvas;
        target.addEventListener(event, handler, options);
        this.eventListeners.push({ target, event, handler, options });
    }
    
    /**
     * Convert screen coordinates to canvas coordinates
     */
    getCanvasPosition(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }
    
    /**
     * Mouse down handler
     */
    handleMouseDown(e) {
        e.preventDefault();
        const pos = this.getCanvasPosition(e.clientX, e.clientY);
        
        this.state.isPressed = true;
        this.state.startPosition = pos;
        this.state.currentPosition = pos;
        this.state.previousPosition = pos;
        this.state.dragDistance = 0;
        
        const target = this.findInteractableAt(pos);
        this.emitEvent('pointerstart', { position: pos, target, originalEvent: e });
        
        if (target) {
            this.emitEvent('interactablepress', { target, position: pos, originalEvent: e });
        }
    }
    
    /**
     * Mouse move handler
     */
    handleMouseMove(e) {
        const pos = this.getCanvasPosition(e.clientX, e.clientY);
        this.state.previousPosition = this.state.currentPosition;
        this.state.currentPosition = pos;
        
        if (this.state.isPressed) {
            // Handle dragging
            if (!this.state.isDragging) {
                const distance = this.getDistance(this.state.startPosition, pos);
                if (distance > this.options.touchThreshold) {
                    this.state.isDragging = true;
                    this.emitEvent('dragstart', { 
                        startPosition: this.state.startPosition, 
                        position: pos, 
                        originalEvent: e 
                    });
                }
            }
            
            if (this.state.isDragging) {
                this.state.dragDistance = this.getDistance(this.state.startPosition, pos);
                this.emitEvent('drag', { 
                    startPosition: this.state.startPosition,
                    position: pos,
                    delta: {
                        x: pos.x - this.state.previousPosition.x,
                        y: pos.y - this.state.previousPosition.y
                    },
                    distance: this.state.dragDistance,
                    originalEvent: e 
                });
            }
        } else if (this.options.enableHover) {
            // Handle hover
            const target = this.findInteractableAt(pos);
            
            if (target !== this.state.hoverTarget) {
                if (this.state.hoverTarget) {
                    this.emitEvent('interactablehoverend', { 
                        target: this.state.hoverTarget, 
                        position: pos, 
                        originalEvent: e 
                    });
                }
                
                this.state.hoverTarget = target;
                
                if (target) {
                    this.emitEvent('interactablehoverstart', { 
                        target, 
                        position: pos, 
                        originalEvent: e 
                    });
                }
            }
            
            if (target) {
                this.emitEvent('interactablehover', { 
                    target, 
                    position: pos, 
                    originalEvent: e 
                });
            }
        }
        
        this.emitEvent('pointermove', { position: pos, originalEvent: e });
    }
    
    /**
     * Mouse up handler
     */
    handleMouseUp(e) {
        if (!this.state.isPressed) return;
        
        const pos = this.getCanvasPosition(e.clientX, e.clientY);
        const target = this.findInteractableAt(pos);
        
        if (this.state.isDragging) {
            this.emitEvent('dragend', { 
                startPosition: this.state.startPosition,
                position: pos,
                distance: this.state.dragDistance,
                originalEvent: e 
            });
        } else {
            // This was a click/tap
            this.emitEvent('click', { position: pos, target, originalEvent: e });
            
            if (target) {
                this.emitEvent('interactableclick', { target, position: pos, originalEvent: e });
            }
        }
        
        this.emitEvent('pointerend', { position: pos, target, originalEvent: e });
        this.resetState();
    }
    
    /**
     * Mouse leave handler
     */
    handleMouseLeave(e) {
        if (this.state.hoverTarget) {
            this.emitEvent('interactablehoverend', { 
                target: this.state.hoverTarget, 
                position: this.state.currentPosition, 
                originalEvent: e 
            });
            this.state.hoverTarget = null;
        }
        this.resetState();
    }
    
    /**
     * Touch start handler
     */
    handleTouchStart(e) {
        e.preventDefault();
        
        for (let touch of e.changedTouches) {
            const pos = this.getCanvasPosition(touch.clientX, touch.clientY);
            
            if (!this.options.enableMultiTouch && this.state.touches.size > 0) {
                continue;
            }
            
            this.state.touches.set(touch.identifier, {
                startPosition: pos,
                currentPosition: pos,
                previousPosition: pos,
                isDragging: false,
                dragDistance: 0
            });
            
            // Use primary touch for main state
            if (this.state.touches.size === 1) {
                this.state.isPressed = true;
                this.state.startPosition = pos;
                this.state.currentPosition = pos;
                this.state.previousPosition = pos;
                
                const target = this.findInteractableAt(pos);
                this.emitEvent('pointerstart', { position: pos, target, originalEvent: e });
                
                if (target) {
                    this.emitEvent('interactablepress', { target, position: pos, originalEvent: e });
                }
            }
        }
    }
    
    /**
     * Touch move handler
     */
    handleTouchMove(e) {
        e.preventDefault();
        
        for (let touch of e.changedTouches) {
            const touchState = this.state.touches.get(touch.identifier);
            if (!touchState) continue;
            
            const pos = this.getCanvasPosition(touch.clientX, touch.clientY);
            touchState.previousPosition = touchState.currentPosition;
            touchState.currentPosition = pos;
            
            // Handle dragging for this touch
            if (!touchState.isDragging) {
                const distance = this.getDistance(touchState.startPosition, pos);
                if (distance > this.options.touchThreshold) {
                    touchState.isDragging = true;
                    if (this.state.touches.size === 1) {
                        this.state.isDragging = true;
                        this.emitEvent('dragstart', { 
                            startPosition: touchState.startPosition, 
                            position: pos, 
                            originalEvent: e 
                        });
                    }
                }
            }
            
            if (touchState.isDragging) {
                touchState.dragDistance = this.getDistance(touchState.startPosition, pos);
                
                if (this.state.touches.size === 1) {
                    this.state.currentPosition = pos;
                    this.state.dragDistance = touchState.dragDistance;
                    
                    this.emitEvent('drag', { 
                        startPosition: touchState.startPosition,
                        position: pos,
                        delta: {
                            x: pos.x - touchState.previousPosition.x,
                            y: pos.y - touchState.previousPosition.y
                        },
                        distance: touchState.dragDistance,
                        originalEvent: e 
                    });
                }
            }
        }
        
        if (this.state.touches.size === 1) {
            const touch = Array.from(this.state.touches.values())[0];
            this.emitEvent('pointermove', { position: touch.currentPosition, originalEvent: e });
        }
    }
    
    /**
     * Touch end handler
     */
    handleTouchEnd(e) {
        for (let touch of e.changedTouches) {
            const touchState = this.state.touches.get(touch.identifier);
            if (!touchState) continue;
            
            const pos = this.getCanvasPosition(touch.clientX, touch.clientY);
            const target = this.findInteractableAt(pos);
            
            if (touchState.isDragging) {
                if (this.state.touches.size === 1) {
                    this.emitEvent('dragend', { 
                        startPosition: touchState.startPosition,
                        position: pos,
                        distance: touchState.dragDistance,
                        originalEvent: e 
                    });
                }
            } else {
                // This was a tap
                if (this.state.touches.size === 1) {
                    this.emitEvent('click', { position: pos, target, originalEvent: e });
                    
                    if (target) {
                        this.emitEvent('interactableclick', { target, position: pos, originalEvent: e });
                    }
                }
            }
            
            if (this.state.touches.size === 1) {
                this.emitEvent('pointerend', { position: pos, target, originalEvent: e });
            }
            
            this.state.touches.delete(touch.identifier);
        }
        
        if (this.state.touches.size === 0) {
            this.resetState();
        }
    }
    
    /**
     * Touch cancel handler
     */
    handleTouchCancel(e) {
        this.state.touches.clear();
        this.resetState();
    }
    
    /**
     * Find interactable object at given position
     */
    findInteractableAt(position) {
        for (let interactable of this.interactables) {
            if (this.isPositionInBounds(position, interactable)) {
                return interactable;
            }
        }
        return null;
    }
    
    /**
     * Check if position is within interactable bounds
     */
    isPositionInBounds(position, interactable) {
        if (interactable.isPointInside) {
            return interactable.isPointInside(position.x, position.y);
        }
        
        if (interactable.bounds) {
            const bounds = interactable.bounds;
            return position.x >= bounds.x && 
                   position.x <= bounds.x + bounds.width &&
                   position.y >= bounds.y && 
                   position.y <= bounds.y + bounds.height;
        }
        
        if (interactable.x !== undefined && interactable.y !== undefined) {
            const width = interactable.width || 50;
            const height = interactable.height || 50;
            return position.x >= interactable.x && 
                   position.x <= interactable.x + width &&
                   position.y >= interactable.y && 
                   position.y <= interactable.y + height;
        }
        
        return false;
    }
    
    /**
     * Calculate distance between two points
     */
    getDistance(point1, point2) {
        const dx = point2.x - point1.x;
        const dy = point2.y - point1.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    /**
     * Reset interaction state
     */
    resetState() {
        this.state.isPressed = false;
        this.state.isDragging = false;
        this.state.dragDistance = 0;
    }
    
    /**
     * Add an interactable object
     */
    addInteractable(interactable) {
        this.interactables.add(interactable);
    }
    
    /**
     * Remove an interactable object
     */
    removeInteractable(interactable) {
        this.interactables.delete(interactable);
    }
    
    /**
     * Clear all interactables
     */
    clearInteractables() {
        this.interactables.clear();
    }
    
    /**
     * Emit custom event
     */
    emitEvent(eventName, detail) {
        const event = new CustomEvent(eventName, { detail });
        this.canvas.dispatchEvent(event);
    }
    
    /**
     * Add event listener for interaction events
     */
    on(eventName, handler) {
        this.canvas.addEventListener(eventName, handler);
    }
    
    /**
     * Remove event listener
     */
    off(eventName, handler) {
        this.canvas.removeEventListener(eventName, handler);
    }
    
    /**
     * Get current pointer position
     */
    getCurrentPosition() {
        return { ...this.state.currentPosition };
    }
    
    /**
     * Check if currently pressing/dragging
     */
    isPressed() {
        return this.state.isPressed;
    }
    
    /**
     * Check if currently dragging
     */
    isDragging() {
        return this.state.isDragging;
    }
    
    /**
     * Get drag distance
     */
    getDragDistance() {
        return this.state.dragDistance;
    }
    
    /**
     * Clean up all event listeners
     */
    destroy() {
        this.eventListeners.forEach(({ target, event, handler, options }) => {
            target.removeEventListener(event, handler, options);
        });
        this.eventListeners = [];
        this.interactables.clear();
    }
}