// --- Fire Rescue Game Management ---

// Global reference to the current game instance for debug synchronization
let currentFireGame = null;

document.addEventListener('DOMContentLoaded', () => {
    // Set up voice controls in options menu
    setupVoiceControls();

    // Set up fire truck click handler
    setupFireTruckClick();

    // Start Fire Rescue game immediately
    startFireRescueGame();
});

const optionsScreen = document.getElementById('options-screen');
const fireGameScreen = document.getElementById('fire-game-screen');
const muteButton = document.getElementById('mute-button');
const heroReportScreen = document.getElementById('hero-report-screen');
const heroReportMessage = document.getElementById('hero-report-message');
const reportMenuButton = document.getElementById('report-menu-button');
const reportPlayAgainButton = document.getElementById('report-play-again-button');

muteButton.addEventListener('click', () => {
    toggleBackgroundMusic();
});

reportMenuButton.addEventListener('click', startFireRescueGame);
reportPlayAgainButton.addEventListener('click', () => {
    heroReportScreen.classList.add('hidden');
    startFireRescueGame();
});

let activeGameIntervals = [];

function startFireRescueGame() {
    // Clear any existing game intervals
    activeGameIntervals.forEach(clearInterval);
    activeGameIntervals = [];

    // Hide all screens except Fire Rescue
    const allScreens = document.querySelectorAll('.game-screen');
    allScreens.forEach(screen => screen.classList.add('hidden'));

    // Start the Fire Rescue game
    currentFireGame = new FireRescueLevel();
    currentFireGame.start();

    // Set up debug sync callback
    currentFireGame.onDebugModeChange = updateDebugButtonFromGame;

    // Initialize debug button state
    updateDebugButtonFromGame();

    toggleBackgroundMusic(true);
}

// Debug toggle functionality - connects to actual game debug mode
document.getElementById('debug-toggle-button').addEventListener('click', () => {
    if (currentFireGame) {
        currentFireGame.toggleDeveloperMode();
    }
});

function updateDebugButtonFromGame() {
    const statusSpan = document.getElementById('debug-status');
    const button = document.getElementById('debug-toggle-button');

    if (!currentFireGame) return;

    const isDebugOn = currentFireGame.developerMode;

    if (isDebugOn) {
        statusSpan.textContent = 'ON';
        statusSpan.style.color = '#27ae60';
        button.style.backgroundColor = '#27ae60';
    } else {
        statusSpan.textContent = 'OFF';
        statusSpan.style.color = '#e74c3c';
        button.style.backgroundColor = '#e74c3c';
    }

    // Save to localStorage for persistence
    localStorage.setItem('firefighterDebugMode', isDebugOn.toString());
}

function showHeroReport(message) {
    heroReportMessage.textContent = message;
    const fireGameScreen = document.getElementById('fire-game-screen');
    if (fireGameScreen) fireGameScreen.classList.add('hidden');

    heroReportScreen.classList.remove('hidden');
    toggleBackgroundMusic(false);
}

function showOptionsOverlay() {
    // Show options screen over the game
    optionsScreen.classList.remove('hidden');
}

function hideOptionsOverlay() {
    // Hide options screen to return to game
    optionsScreen.classList.add('hidden');
}

function goToMenu() {
    // Simply restart the Fire Rescue game
    startFireRescueGame();
}

// Utility function to switch between screens
function showScreen(screenId) {
    // Hide all game screens
    const allScreens = document.querySelectorAll('.game-screen');
    allScreens.forEach(screen => screen.classList.add('hidden'));
    
    // Show target screen
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.remove('hidden');
    } else {
        console.warn(`Screen ${screenId} not found`);
    }
}

function startAudio() {
    if (Tone.context.state !== 'running') {
        Tone.start();
    }
    if (!backgroundMusic) {
        setupBackgroundMusic();
    }
    window.removeEventListener('click', startAudio, true);
}
window.addEventListener('click', startAudio, true);

// --- Background Music ---
let backgroundMusic = null;
let musicPlaying = false;

function setupBackgroundMusic() {
    const musicSynth = new Tone.FMSynth({
        harmonicity: 1.5,
        modulationIndex: 10,
        oscillator: { type: "sine" },
        envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.5 },
        modulation: { type: "square" },
        modulationEnvelope: { attack: 0.01, decay: 0.5, sustain: 0, release: 0.5 }
    }).toDestination();
    musicSynth.volume.value = -12; // Lower the volume

    const melody = ['C4', 'E4', 'G4', 'C5', 'A4', 'G4', 'E4'];
    let noteIndex = 0;

    backgroundMusic = new Tone.Loop(time => {
        let note = melody[noteIndex % melody.length];
        musicSynth.triggerAttackRelease(note, '8n', time);
        noteIndex++;
    }, '4n');

    Tone.Transport.start();
}

function toggleBackgroundMusic(forceState) {
    const shouldBePlaying = forceState !== undefined ? forceState : !musicPlaying;
    if (shouldBePlaying) {
        if (!musicPlaying) {
            backgroundMusic.start(0);
            musicPlaying = true;
        }
    } else {
        if (musicPlaying) {
            backgroundMusic.stop();
            musicPlaying = false;
        }
    }
    muteButton.textContent = musicPlaying ? '🎵' : '🔇';
}

// --- Scene Particle Effects ---
class SceneParticle {
    constructor(canvas, type) {
        this.canvas = canvas;
        this.x = Math.random() * this.canvas.width;
        this.y = Math.random() * this.canvas.height;
        this.type = type;
        if (type === 'stars') {
            this.size = Math.random() * 2;
            this.opacity = Math.random();
        } else { // snow or leaves
            this.y = -10;
            this.size = Math.random() * 5 + 2;
            this.speedX = Math.random() * 2 - 1;
            this.speedY = Math.random() * 2 + 1;
        }
    }
    update() {
        if (this.type !== 'stars') {
            this.x += this.speedX;
            this.y += this.speedY;
            if (this.y > this.canvas.height) {
                this.y = -10;
                this.x = Math.random() * this.canvas.width;
            }
        }
    }
    draw(ctx) {
        if (this.type === 'stars') {
            ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.type === 'snow') {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.type === 'leaves') {
            ctx.fillStyle = '#c0392b';
            ctx.fillRect(this.x, this.y, this.size, this.size);
        }
    }
}

function manageSceneParticles(canvas, ctx) {
    if (currentScene.special && sceneParticles.length < 50 && Math.random() < 0.5) {
        sceneParticles.push(new SceneParticle(canvas, currentScene.special));
    }
    sceneParticles.forEach((p, index) => {
        p.update();
        p.draw(ctx);
        if (p.y > canvas.height + 20) sceneParticles.splice(index, 1);
    });
}

function startFireGame() {
    const canvas = document.getElementById('fireGameCanvas');
    const gameScreen = document.getElementById('fire-game-screen');
    const fireGame = new FireRescueLevel(canvas, gameScreen);
    fireGame.start();
}

// Voice control setup function
function setupVoiceControls() {
    if (!window.voiceGuide) return;

    const checkbox = document.getElementById('voice-enabled-checkbox');
    const volumeSlider = document.getElementById('voice-volume-slider');
    const speedSlider = document.getElementById('voice-speed-slider');
    const pitchSlider = document.getElementById('voice-pitch-slider');
    const testButton = document.getElementById('test-voice-button');

    if (checkbox) {
        checkbox.checked = window.voiceGuide.getEnabled();
        checkbox.addEventListener('change', () => {
            window.voiceGuide.setEnabled(checkbox.checked);
        });
    }

    if (volumeSlider) {
        volumeSlider.value = window.voiceGuide.volume;
        volumeSlider.addEventListener('input', () => {
            window.voiceGuide.volume = parseFloat(volumeSlider.value);
            window.voiceGuide.saveSettings();
        });
    }

    if (speedSlider) {
        speedSlider.value = window.voiceGuide.rate;
        speedSlider.addEventListener('input', () => {
            window.voiceGuide.rate = parseFloat(speedSlider.value);
            window.voiceGuide.saveSettings();
        });
    }

    if (pitchSlider) {
        pitchSlider.value = window.voiceGuide.pitch;
        pitchSlider.addEventListener('input', () => {
            window.voiceGuide.pitch = parseFloat(pitchSlider.value);
            window.voiceGuide.saveSettings();
        });
    }

    if (testButton) {
        testButton.addEventListener('click', () => {
            window.voiceGuide.testVoice("This is a test of the voice guidance system for Fire Rescue!");
        });
    }
}

function restartFireRescue() {
    startFireRescueGame();
}

// Fire truck click handler
function setupFireTruckClick() {
    const fireTruckIcon = document.getElementById('fire-truck-icon');
    let hasRolledOff = false;

    if (fireTruckIcon) {
        // Wait for the initial animation to complete before enabling clicks
        setTimeout(() => {
            fireTruckIcon.addEventListener('click', () => {
                if (!hasRolledOff) {
                    hasRolledOff = true;
                    fireTruckIcon.classList.add('rolling-off');

                    // After the roll-off animation completes, reset for next time
                    setTimeout(() => {
                        fireTruckIcon.classList.remove('rolling-off');
                        hasRolledOff = false;
                    }, 3000); // Match the truckRollOff animation duration
                }
            });
        }, 4000); // Wait for truckCrashIn animation to complete
    }
}

// Other level start functions removed - see FUTURE_LEVELS.md for concepts
