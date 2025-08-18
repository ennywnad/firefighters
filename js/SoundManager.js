/**
 * Centralized sound management system for the firefighter game
 * Handles all audio synthesis, effects, and background music
 */
class SoundManager {
    constructor() {
        this.synths = {};
        this.isInitialized = false;
        this.isMuted = false;
        this.volume = 0.8;
        
        this.init();
    }
    
    /**
     * Initialize all sound synthesizers
     */
    init() {
        try {
            // Action sounds - for button clicks and interactions
            this.synths.action = new Tone.Synth({ 
                oscillator: { type: 'triangle' }, 
                envelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.1 } 
            }).toDestination();
            
            // Success sounds - for completing steps
            this.synths.success = new Tone.Synth({ 
                oscillator: { type: 'sine' }, 
                envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.2 } 
            }).toDestination();
            
            // Completion sounds - for finishing levels
            this.synths.completion = new Tone.PolySynth(Tone.Synth).toDestination();
            
            // Water sounds - for fire rescue
            this.synths.water = new Tone.NoiseSynth({ 
                noise: { type: 'white' }, 
                envelope: { attack: 0.005, decay: 0.1, sustain: 0 } 
            }).toDestination();
            
            // Tool sounds - for truck building
            this.synths.metal = new Tone.MetalSynth().toDestination();
            
            // Animal sounds - for animal rescue
            this.synths.animal = new Tone.Synth({
                oscillator: { type: 'sine' },
                envelope: { attack: 0.01, decay: 0.3, sustain: 0.2, release: 0.5 }
            }).toDestination();
            
            // Emergency sounds - for emergency response
            this.synths.phone = new Tone.Synth({ 
                oscillator: { type: 'square' }, 
                envelope: { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.2 } 
            }).toDestination();
            
            // Siren sound
            this.synths.siren = new Tone.Oscillator({
                frequency: 440,
                type: 'sawtooth'
            }).toDestination();
            
            this.isInitialized = true;
            
        } catch (error) {
            console.warn('Failed to initialize SoundManager:', error);
        }
    }
    
    /**
     * Play an action sound (button clicks, interactions)
     */
    playAction(note = 'C5', duration = '8n') {
        this.play('action', note, duration);
    }
    
    /**
     * Play a success sound (step completion)
     */
    playSuccess(note = 'E5', duration = '4n') {
        this.play('success', note, duration);
    }
    
    /**
     * Play completion chord (level finish)
     */
    playCompletion() {
        if (!this.isReady()) return;
        
        try {
            const chord = ['C5', 'E5', 'G5', 'C6'];
            chord.forEach((note, index) => {
                setTimeout(() => {
                    this.synths.completion.triggerAttackRelease(note, '2n');
                }, index * 100);
            });
        } catch (error) {
            console.warn('Error playing completion sound:', error);
        }
    }
    
    /**
     * Play water spray sound
     */
    playWater(duration = '16n') {
        this.play('water', null, duration);
    }
    
    /**
     * Play metal tool sound (wrench, hammer, etc.)
     */
    playMetal(frequency = 200, duration = '8n') {
        if (!this.isReady()) return;
        
        try {
            this.synths.metal.triggerAttackRelease(frequency, duration);
        } catch (error) {
            console.warn('Error playing metal sound:', error);
        }
    }
    
    /**
     * Play animal sound
     */
    playAnimal(note = 'A5', duration = '4n') {
        this.play('animal', note, duration);
    }
    
    /**
     * Play phone ring
     */
    playPhone(note = 'G4', duration = '8n') {
        this.play('phone', note, duration);
    }
    
    /**
     * Start siren sound
     */
    startSiren() {
        if (!this.isReady()) return;
        
        try {
            this.synths.siren.start();
            
            // Create siren effect by modulating frequency
            this.synths.siren.frequency.rampTo(660, 0.5);
            setTimeout(() => {
                if (this.synths.siren.state === 'started') {
                    this.synths.siren.frequency.rampTo(440, 0.5);
                }
            }, 500);
        } catch (error) {
            console.warn('Error starting siren:', error);
        }
    }
    
    /**
     * Stop siren sound
     */
    stopSiren() {
        try {
            if (this.synths.siren && this.synths.siren.state === 'started') {
                this.synths.siren.stop();
            }
        } catch (error) {
            console.warn('Error stopping siren:', error);
        }
    }
    
    /**
     * Generic play method
     */
    play(synthName, note = 'C4', duration = '8n') {
        if (!this.isReady() || this.isMuted) return;
        
        try {
            const synth = this.synths[synthName];
            if (synth && synth.triggerAttackRelease) {
                synth.triggerAttackRelease(note, duration);
            }
        } catch (error) {
            console.warn(`Error playing ${synthName} sound:`, error);
        }
    }
    
    /**
     * Play a sequence of notes
     */
    playSequence(synthName, notes, timing = 200) {
        if (!this.isReady() || this.isMuted) return;
        
        notes.forEach((note, index) => {
            setTimeout(() => {
                this.play(synthName, note.pitch || note, note.duration || '8n');
            }, index * timing);
        });
    }
    
    /**
     * Create a custom sound effect
     */
    playCustom(options = {}) {
        if (!this.isReady() || this.isMuted) return;
        
        try {
            const synth = new Tone.Synth({
                oscillator: { 
                    type: options.waveform || 'sine' 
                },
                envelope: {
                    attack: options.attack || 0.01,
                    decay: options.decay || 0.1,
                    sustain: options.sustain || 0.1,
                    release: options.release || 0.1
                }
            }).toDestination();
            
            synth.triggerAttackRelease(
                options.note || 'C4', 
                options.duration || '8n'
            );
            
            // Clean up after playing
            setTimeout(() => {
                try {
                    synth.dispose();
                } catch (e) {
                    console.warn('Error disposing custom synth:', e);
                }
            }, 2000);
            
        } catch (error) {
            console.warn('Error playing custom sound:', error);
        }
    }
    
    /**
     * Mute/unmute all sounds
     */
    setMuted(muted) {
        this.isMuted = muted;
    }
    
    /**
     * Set global volume
     */
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        
        if (this.isInitialized) {
            try {
                Tone.Destination.volume.value = Tone.gainToDb(this.volume);
            } catch (error) {
                console.warn('Error setting volume:', error);
            }
        }
    }
    
    /**
     * Check if sound system is ready
     */
    isReady() {
        return this.isInitialized && Tone.context.state === 'running';
    }
    
    /**
     * Start audio context (required for Chrome)
     */
    async startAudioContext() {
        try {
            if (Tone.context.state !== 'running') {
                await Tone.start();
                console.log('Audio context started');
            }
        } catch (error) {
            console.warn('Failed to start audio context:', error);
        }
    }
    
    /**
     * Clean up all synthesizers
     */
    dispose() {
        try {
            Object.values(this.synths).forEach(synth => {
                if (synth && synth.dispose) {
                    synth.dispose();
                }
            });
            this.synths = {};
            this.isInitialized = false;
        } catch (error) {
            console.warn('Error disposing SoundManager:', error);
        }
    }
    
    /**
     * Get all available sound types
     */
    getAvailableSounds() {
        return Object.keys(this.synths);
    }
    
    /**
     * Test all sounds (for debugging)
     */
    testAllSounds() {
        console.log('Testing all sounds...');
        const sounds = this.getAvailableSounds();
        
        sounds.forEach((sound, index) => {
            setTimeout(() => {
                console.log(`Testing ${sound}...`);
                this.play(sound, 'C4', '8n');
            }, index * 500);
        });
    }
}

// Create global instance
window.soundManager = new SoundManager();

// Auto-start audio context on first user interaction
document.addEventListener('click', () => {
    window.soundManager.startAudioContext();
}, { once: true });

document.addEventListener('touchstart', () => {
    window.soundManager.startAudioContext();
}, { once: true });