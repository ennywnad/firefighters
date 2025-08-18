/**
 * Voice guidance system for accessibility
 * Provides text-to-speech functionality for instructions and feedback
 */
class VoiceGuide {
    constructor() {
        this.isEnabled = false;
        this.voice = null;
        this.currentUtterance = null;
        this.volume = 0.8;
        this.rate = 0.9;
        this.pitch = 1.0;
        
        this.init();
    }
    
    /**
     * Initialize the voice guidance system
     */
    init() {
        // Check if speech synthesis is supported
        if (!('speechSynthesis' in window)) {
            console.warn('Speech synthesis not supported');
            return;
        }
        
        this.isEnabled = true;
        
        // Wait for voices to load
        this.loadVoices();
        window.speechSynthesis.onvoiceschanged = () => {
            this.loadVoices();
        };
        
        // Load user preferences
        this.loadSettings();
    }
    
    /**
     * Load available voices and select the best one
     */
    loadVoices() {
        const voices = window.speechSynthesis.getVoices();
        
        // Prefer English voices, especially child-friendly or clear ones
        const preferredVoices = [
            'Google UK English Female',
            'Google US English',
            'Microsoft Zira Desktop',
            'Microsoft David Desktop',
            'Alex',
            'Samantha',
            'Victoria'
        ];
        
        // Find the best voice
        for (const preferred of preferredVoices) {
            const voice = voices.find(v => v.name.includes(preferred));
            if (voice) {
                this.voice = voice;
                break;
            }
        }
        
        // Fallback to any English voice
        if (!this.voice) {
            this.voice = voices.find(v => v.lang.startsWith('en')) || voices[0];
        }
        
        console.log('Selected voice:', this.voice?.name || 'None');
    }
    
    /**
     * Speak the given text
     */
    speak(text, options = {}) {
        if (!this.isEnabled || !text) return;
        
        // Stop any current speech
        this.stop();
        
        // Create utterance
        this.currentUtterance = new SpeechSynthesisUtterance(text);
        
        // Set voice and properties
        if (this.voice) {
            this.currentUtterance.voice = this.voice;
        }
        
        this.currentUtterance.volume = options.volume || this.volume;
        this.currentUtterance.rate = options.rate || this.rate;
        this.currentUtterance.pitch = options.pitch || this.pitch;
        
        // Event handlers
        this.currentUtterance.onstart = () => {
            console.log('Voice guidance started:', text);
        };
        
        this.currentUtterance.onend = () => {
            console.log('Voice guidance ended');
            this.currentUtterance = null;
            options.onComplete?.();
        };
        
        this.currentUtterance.onerror = (event) => {
            console.warn('Voice guidance error:', event.error);
            this.currentUtterance = null;
            options.onError?.(event.error);
        };
        
        // Speak
        try {
            window.speechSynthesis.speak(this.currentUtterance);
        } catch (error) {
            console.warn('Error speaking:', error);
        }
    }
    
    /**
     * Stop current speech
     */
    stop() {
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
        }
        this.currentUtterance = null;
    }
    
    /**
     * Pause current speech
     */
    pause() {
        if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
            window.speechSynthesis.pause();
        }
    }
    
    /**
     * Resume paused speech
     */
    resume() {
        if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
        }
    }
    
    /**
     * Check if currently speaking
     */
    isSpeaking() {
        return window.speechSynthesis.speaking;
    }
    
    /**
     * Set voice guidance enabled/disabled
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
        if (!enabled) {
            this.stop();
        }
        this.saveSettings();
    }
    
    /**
     * Get enabled status
     */
    getEnabled() {
        return this.isEnabled;
    }
    
    /**
     * Set voice properties
     */
    setVoiceProperties(volume, rate, pitch) {
        this.volume = Math.max(0, Math.min(1, volume));
        this.rate = Math.max(0.1, Math.min(10, rate));
        this.pitch = Math.max(0, Math.min(2, pitch));
        this.saveSettings();
    }
    
    /**
     * Speak instruction text with appropriate timing
     */
    speakInstruction(text, delay = 500) {
        if (!text) return;
        
        setTimeout(() => {
            this.speak(text, {
                rate: 0.8, // Slightly slower for instructions
                onComplete: () => {
                    // Add a small pause after instructions
                    setTimeout(() => {
                        console.log('Instruction complete');
                    }, 300);
                }
            });
        }, delay);
    }
    
    /**
     * Speak positive feedback
     */
    speakSuccess(text = "Great job!") {
        this.speak(text, {
            pitch: 1.2, // Higher pitch for excitement
            rate: 1.0
        });
    }
    
    /**
     * Speak encouragement
     */
    speakEncouragement(text = "Keep going, you're doing great!") {
        this.speak(text, {
            pitch: 1.1,
            rate: 0.9
        });
    }
    
    /**
     * Speak level completion
     */
    speakCompletion(text = "Level complete! You're a hero!") {
        this.speak(text, {
            pitch: 1.3,
            rate: 0.8,
            volume: 1.0
        });
    }
    
    /**
     * Get available voices
     */
    getAvailableVoices() {
        return window.speechSynthesis.getVoices();
    }
    
    /**
     * Set specific voice by name
     */
    setVoice(voiceName) {
        const voices = this.getAvailableVoices();
        const selectedVoice = voices.find(v => v.name === voiceName);
        if (selectedVoice) {
            this.voice = selectedVoice;
            this.saveSettings();
            return true;
        }
        return false;
    }
    
    /**
     * Test voice with sample text
     */
    testVoice(text = "Hello! This is a test of the voice guidance system.") {
        this.speak(text);
    }
    
    /**
     * Load settings from localStorage
     */
    loadSettings() {
        try {
            const settings = localStorage.getItem('firefighter-voice-settings');
            if (settings) {
                const parsed = JSON.parse(settings);
                this.isEnabled = parsed.enabled !== false; // Default to true
                this.volume = parsed.volume || 0.8;
                this.rate = parsed.rate || 0.9;
                this.pitch = parsed.pitch || 1.0;
                
                if (parsed.voiceName) {
                    setTimeout(() => {
                        this.setVoice(parsed.voiceName);
                    }, 100);
                }
            }
        } catch (error) {
            console.warn('Error loading voice settings:', error);
        }
    }
    
    /**
     * Save settings to localStorage
     */
    saveSettings() {
        try {
            const settings = {
                enabled: this.isEnabled,
                volume: this.volume,
                rate: this.rate,
                pitch: this.pitch,
                voiceName: this.voice?.name
            };
            localStorage.setItem('firefighter-voice-settings', JSON.stringify(settings));
        } catch (error) {
            console.warn('Error saving voice settings:', error);
        }
    }
    
    /**
     * Create voice control UI
     */
    createVoiceControls() {
        const container = document.createElement('div');
        container.className = 'voice-controls';
        container.style.cssText = `
            position: fixed;
            top: 60px;
            right: 15px;
            z-index: 100;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px;
            border-radius: 10px;
            font-family: Arial, sans-serif;
            font-size: 14px;
            display: none;
        `;
        
        const toggleButton = document.createElement('button');
        toggleButton.textContent = this.isEnabled ? '🔊' : '🔇';
        toggleButton.title = 'Toggle voice guidance';
        toggleButton.style.cssText = `
            background: #f39c12;
            color: white;
            padding: 5px 10px;
            border-radius: 10px;
            font-size: 1.5rem;
            border: 2px solid white;
            cursor: pointer;
            margin-left: 5px;
        `;
        
        toggleButton.onclick = () => {
            this.setEnabled(!this.isEnabled);
            toggleButton.textContent = this.isEnabled ? '🔊' : '🔇';
        };
        
        const voiceButton = document.createElement('button');
        voiceButton.textContent = '⚙️';
        voiceButton.title = 'Voice settings';
        voiceButton.style.cssText = toggleButton.style.cssText;
        voiceButton.onclick = () => {
            container.style.display = container.style.display === 'none' ? 'block' : 'none';
        };
        
        // Add controls to container
        const enabledCheckbox = document.createElement('input');
        enabledCheckbox.type = 'checkbox';
        enabledCheckbox.checked = this.isEnabled;
        enabledCheckbox.onchange = () => this.setEnabled(enabledCheckbox.checked);
        
        container.innerHTML = `
            <div style="margin-bottom: 10px;">
                <label><input type="checkbox" ${this.isEnabled ? 'checked' : ''}> Enable Voice Guidance</label>
            </div>
            <div style="margin-bottom: 5px;">
                <label>Volume: <input type="range" min="0" max="1" step="0.1" value="${this.volume}"></label>
            </div>
            <div style="margin-bottom: 5px;">
                <label>Speed: <input type="range" min="0.5" max="2" step="0.1" value="${this.rate}"></label>
            </div>
            <div style="margin-bottom: 10px;">
                <label>Pitch: <input type="range" min="0.5" max="2" step="0.1" value="${this.pitch}"></label>
            </div>
            <button onclick="window.voiceGuide.testVoice()" style="padding: 5px 10px; border-radius: 5px;">Test Voice</button>
        `;
        
        // Add event listeners
        const checkbox = container.querySelector('input[type="checkbox"]');
        checkbox.onchange = () => this.setEnabled(checkbox.checked);
        
        const ranges = container.querySelectorAll('input[type="range"]');
        ranges[0].oninput = (e) => { this.volume = parseFloat(e.target.value); this.saveSettings(); };
        ranges[1].oninput = (e) => { this.rate = parseFloat(e.target.value); this.saveSettings(); };
        ranges[2].oninput = (e) => { this.pitch = parseFloat(e.target.value); this.saveSettings(); };
        
        // Add to page
        document.body.appendChild(voiceButton);
        document.body.appendChild(container);
        
        return { toggleButton, voiceButton, container };
    }
}

// Create global instance
window.voiceGuide = new VoiceGuide();

// Initialize voice controls when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.voiceGuide.createVoiceControls();
});