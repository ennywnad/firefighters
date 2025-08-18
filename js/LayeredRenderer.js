/**
 * Layered canvas rendering system for improved performance
 * Separates static and dynamic content for efficient rendering
 */
class LayeredRenderer {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            width: 800,
            height: 600,
            enableOffscreenCanvas: true,
            enableImageSmoothing: true,
            ...options
        };
        
        this.layers = new Map();
        this.layerOrder = [];
        this.needsRedraw = new Set();
        this.mainCanvas = null;
        this.mainCtx = null;
        
        this.setupMainCanvas();
    }
    
    /**
     * Setup the main display canvas
     */
    setupMainCanvas() {
        this.mainCanvas = document.createElement('canvas');
        this.mainCanvas.width = this.options.width;
        this.mainCanvas.height = this.options.height;
        this.mainCtx = this.mainCanvas.getContext('2d');
        
        // Configure rendering quality
        this.mainCtx.imageSmoothingEnabled = this.options.enableImageSmoothing;
        this.mainCtx.imageSmoothingQuality = 'high';
        
        if (this.container) {
            this.container.appendChild(this.mainCanvas);
        }
        
        // Handle device pixel ratio for crisp rendering
        this.handleDevicePixelRatio();
    }
    
    /**
     * Handle high DPI displays
     */
    handleDevicePixelRatio() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.mainCanvas.getBoundingClientRect();
        
        this.mainCanvas.width = rect.width * dpr;
        this.mainCanvas.height = rect.height * dpr;
        this.mainCtx.scale(dpr, dpr);
        
        this.mainCanvas.style.width = rect.width + 'px';
        this.mainCanvas.style.height = rect.height + 'px';
    }
    
    /**
     * Create a new rendering layer
     */
    createLayer(name, options = {}) {
        const layerOptions = {
            width: this.options.width,
            height: this.options.height,
            zIndex: 0,
            alpha: 1.0,
            visible: true,
            persistent: false, // If true, layer content persists between frames
            ...options
        };
        
        let canvas, ctx;
        
        // Use OffscreenCanvas if available and enabled
        if (this.options.enableOffscreenCanvas && typeof OffscreenCanvas !== 'undefined') {
            try {
                canvas = new OffscreenCanvas(layerOptions.width, layerOptions.height);
                ctx = canvas.getContext('2d');
            } catch (error) {
                console.warn('OffscreenCanvas not supported, falling back to regular canvas');
                canvas = document.createElement('canvas');
                canvas.width = layerOptions.width;
                canvas.height = layerOptions.height;
                ctx = canvas.getContext('2d');
            }
        } else {
            canvas = document.createElement('canvas');
            canvas.width = layerOptions.width;
            canvas.height = layerOptions.height;
            ctx = canvas.getContext('2d');
        }
        
        // Configure context
        ctx.imageSmoothingEnabled = this.options.enableImageSmoothing;
        ctx.imageSmoothingQuality = 'high';
        
        const layer = {
            name,
            canvas,
            ctx,
            ...layerOptions,
            dirty: true
        };
        
        this.layers.set(name, layer);
        this.addToLayerOrder(name, layerOptions.zIndex);
        this.needsRedraw.add(name);
        
        return layer;
    }
    
    /**
     * Add layer to the z-index ordered list
     */
    addToLayerOrder(layerName, zIndex) {
        // Remove if already exists
        this.layerOrder = this.layerOrder.filter(item => item.name !== layerName);
        
        // Add in correct z-index position
        const newItem = { name: layerName, zIndex };
        let inserted = false;
        
        for (let i = 0; i < this.layerOrder.length; i++) {
            if (this.layerOrder[i].zIndex > zIndex) {
                this.layerOrder.splice(i, 0, newItem);
                inserted = true;
                break;
            }
        }
        
        if (!inserted) {
            this.layerOrder.push(newItem);
        }
    }
    
    /**
     * Get a layer by name
     */
    getLayer(name) {
        return this.layers.get(name);
    }
    
    /**
     * Mark a layer as needing redraw
     */
    markLayerDirty(name) {
        const layer = this.layers.get(name);
        if (layer) {
            layer.dirty = true;
            this.needsRedraw.add(name);
        }
    }
    
    /**
     * Clear a layer
     */
    clearLayer(name) {
        const layer = this.layers.get(name);
        if (layer) {
            layer.ctx.clearRect(0, 0, layer.width, layer.height);
            this.markLayerDirty(name);
        }
    }
    
    /**
     * Set layer visibility
     */
    setLayerVisible(name, visible) {
        const layer = this.layers.get(name);
        if (layer && layer.visible !== visible) {
            layer.visible = visible;
            this.markLayerDirty(name);
        }
    }
    
    /**
     * Set layer alpha
     */
    setLayerAlpha(name, alpha) {
        const layer = this.layers.get(name);
        if (layer && layer.alpha !== alpha) {
            layer.alpha = Math.max(0, Math.min(1, alpha));
            this.markLayerDirty(name);
        }
    }
    
    /**
     * Remove a layer
     */
    removeLayer(name) {
        this.layers.delete(name);
        this.layerOrder = this.layerOrder.filter(item => item.name !== name);
        this.needsRedraw.delete(name);
    }
    
    /**
     * Render all layers to the main canvas
     */
    render(force = false) {
        // Only render if there are dirty layers or forced
        if (!force && this.needsRedraw.size === 0) {
            return;
        }
        
        // Clear main canvas
        this.mainCtx.clearRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);
        
        // Render layers in z-index order
        for (const { name } of this.layerOrder) {
            const layer = this.layers.get(name);
            if (!layer || !layer.visible) continue;
            
            this.mainCtx.save();
            this.mainCtx.globalAlpha = layer.alpha;
            
            try {
                this.mainCtx.drawImage(layer.canvas, 0, 0);
            } catch (error) {
                console.warn(`Error rendering layer ${name}:`, error);
            }
            
            this.mainCtx.restore();
        }
        
        // Clear dirty flags if not persistent
        for (const layerName of this.needsRedraw) {
            const layer = this.layers.get(layerName);
            if (layer && !layer.persistent) {
                layer.dirty = false;
            }
        }
        
        this.needsRedraw.clear();
    }
    
    /**
     * Render a specific layer and mark it clean
     */
    renderLayer(name, drawFunction) {
        const layer = this.layers.get(name);
        if (!layer) return;
        
        // Clear layer if not persistent
        if (!layer.persistent) {
            layer.ctx.clearRect(0, 0, layer.width, layer.height);
        }
        
        // Execute draw function
        if (drawFunction) {
            layer.ctx.save();
            try {
                drawFunction(layer.ctx, layer);
            } catch (error) {
                console.warn(`Error in draw function for layer ${name}:`, error);
            }
            layer.ctx.restore();
        }
        
        this.markLayerDirty(name);
    }
    
    /**
     * Batch render multiple layers
     */
    renderLayers(layerDrawMap) {
        for (const [layerName, drawFunction] of Object.entries(layerDrawMap)) {
            this.renderLayer(layerName, drawFunction);
        }
    }
    
    /**
     * Get the main canvas for external use
     */
    getMainCanvas() {
        return this.mainCanvas;
    }
    
    /**
     * Get the main context for external use
     */
    getMainContext() {
        return this.mainCtx;
    }
    
    /**
     * Resize all layers and main canvas
     */
    resize(width, height) {
        this.options.width = width;
        this.options.height = height;
        
        // Resize main canvas
        this.mainCanvas.width = width;
        this.mainCanvas.height = height;
        
        // Resize all layers
        for (const layer of this.layers.values()) {
            layer.width = width;
            layer.height = height;
            layer.canvas.width = width;
            layer.canvas.height = height;
            this.markLayerDirty(layer.name);
        }
        
        this.handleDevicePixelRatio();
    }
    
    /**
     * Create common game layers
     */
    createGameLayers() {
        // Background layer (static)
        this.createLayer('background', {
            zIndex: 0,
            persistent: true
        });
        
        // Environment layer (buildings, trees, etc - mostly static)
        this.createLayer('environment', {
            zIndex: 10,
            persistent: true
        });
        
        // Objects layer (trucks, equipment - semi-static)
        this.createLayer('objects', {
            zIndex: 20,
            persistent: false
        });
        
        // Characters layer (firefighters, animals - dynamic)
        this.createLayer('characters', {
            zIndex: 30,
            persistent: false
        });
        
        // Effects layer (particles, water, fire - very dynamic)
        this.createLayer('effects', {
            zIndex: 40,
            persistent: false
        });
        
        // UI layer (buttons, text - semi-static)
        this.createLayer('ui', {
            zIndex: 50,
            persistent: false
        });
        
        // Debug layer (optional)
        this.createLayer('debug', {
            zIndex: 100,
            persistent: false,
            visible: false
        });
    }
    
    /**
     * Enable/disable debug layer
     */
    toggleDebugLayer(visible) {
        this.setLayerVisible('debug', visible);
    }
    
    /**
     * Draw debug information
     */
    drawDebugInfo(info = {}) {
        this.renderLayer('debug', (ctx) => {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(10, 10, 200, 100);
            
            ctx.fillStyle = 'white';
            ctx.font = '12px monospace';
            ctx.fillText(`Layers: ${this.layers.size}`, 15, 25);
            ctx.fillText(`Dirty: ${this.needsRedraw.size}`, 15, 40);
            ctx.fillText(`FPS: ${info.fps || 'N/A'}`, 15, 55);
            ctx.fillText(`Objects: ${info.objectCount || 'N/A'}`, 15, 70);
            ctx.fillText(`Particles: ${info.particleCount || 'N/A'}`, 15, 85);
        });
    }
    
    /**
     * Get performance statistics
     */
    getStats() {
        return {
            layerCount: this.layers.size,
            dirtyLayers: this.needsRedraw.size,
            layerOrder: this.layerOrder.map(item => item.name),
            memoryUsage: this.getMemoryUsage()
        };
    }
    
    /**
     * Estimate memory usage of all layers
     */
    getMemoryUsage() {
        let totalPixels = 0;
        for (const layer of this.layers.values()) {
            totalPixels += layer.width * layer.height;
        }
        // Estimate 4 bytes per pixel (RGBA)
        return Math.round(totalPixels * 4 / 1024 / 1024 * 100) / 100; // MB
    }
    
    /**
     * Clean up all resources
     */
    destroy() {
        this.layers.clear();
        this.layerOrder = [];
        this.needsRedraw.clear();
        
        if (this.mainCanvas && this.mainCanvas.parentNode) {
            this.mainCanvas.parentNode.removeChild(this.mainCanvas);
        }
        
        this.mainCanvas = null;
        this.mainCtx = null;
    }
}

// Export for use in games
window.LayeredRenderer = LayeredRenderer;