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
    currentFireGame.onTruckStyleChange = updateTruckStyleRadiosFromGame;

    // Set up all option radio buttons
    setupTruckStyleRadios();
    setupTruckColorRadios();
    setupFunOptions();
    setupHydrantStyleRadios();
    setupDebugModeRadios();
    setupVoiceRadios();
    setupWaterSoundRadios();

    // Initialize states
    updateTruckStyleRadiosFromGame();

    toggleBackgroundMusic(true);
}

// Debug mode radio functionality
function setupDebugModeRadios() {
    const debugOnRadio = document.getElementById('debug-on-radio');
    const debugOffRadio = document.getElementById('debug-off-radio');

    if (debugOnRadio && debugOffRadio) {
        // Set initial value from localStorage
        const savedDebug = localStorage.getItem('firefighterDebugMode') === 'true';
        debugOnRadio.checked = savedDebug;
        debugOffRadio.checked = !savedDebug;

        // Handle debug mode changes
        debugOnRadio.addEventListener('change', () => {
            if (debugOnRadio.checked && currentFireGame) {
                if (!currentFireGame.developerMode) {
                    currentFireGame.toggleDeveloperMode();
                }
            }
        });

        debugOffRadio.addEventListener('change', () => {
            if (debugOffRadio.checked && currentFireGame) {
                if (currentFireGame.developerMode) {
                    currentFireGame.toggleDeveloperMode();
                }
            }
        });
    }
}

function updateDebugButtonFromGame() {
    const debugOnRadio = document.getElementById('debug-on-radio');
    const debugOffRadio = document.getElementById('debug-off-radio');

    if (!currentFireGame || !debugOnRadio || !debugOffRadio) return;

    debugOnRadio.checked = currentFireGame.developerMode;
    debugOffRadio.checked = !currentFireGame.developerMode;
    localStorage.setItem('firefighterDebugMode', currentFireGame.developerMode.toString());
}

// Truck style radio functionality
function setupTruckStyleRadios() {
    const classicRadio = document.getElementById('truck-classic-radio');
    const detailedRadio = document.getElementById('truck-detailed-radio');

    if (classicRadio && detailedRadio) {
        // Set initial value from localStorage
        const savedStyle = localStorage.getItem('firefighterTruckStyle') || 'classic';
        classicRadio.checked = (savedStyle === 'classic');
        detailedRadio.checked = (savedStyle === 'detailed');

        // Handle truck style changes
        classicRadio.addEventListener('change', () => {
            if (classicRadio.checked && currentFireGame) {
                currentFireGame.setTruckStyle('classic');
            }
        });

        detailedRadio.addEventListener('change', () => {
            if (detailedRadio.checked && currentFireGame) {
                currentFireGame.setTruckStyle('detailed');
            }
        });
    }
}

function updateTruckStyleRadiosFromGame() {
    const classicRadio = document.getElementById('truck-classic-radio');
    const detailedRadio = document.getElementById('truck-detailed-radio');

    if (!currentFireGame || !classicRadio || !detailedRadio) return;

    // Update radio based on current or pending style
    let targetStyle = currentFireGame.truckStyle;
    if (currentFireGame.pendingTruckStyleChange) {
        targetStyle = currentFireGame.truckStyle === 'classic' ? 'detailed' : 'classic';
    }

    classicRadio.checked = (targetStyle === 'classic');
    detailedRadio.checked = (targetStyle === 'detailed');
    localStorage.setItem('firefighterTruckStyle', currentFireGame.truckStyle);
}

// Truck color radio functionality
function setupTruckColorRadios() {
    // Truck 1 colors
    const truck1Radios = document.querySelectorAll('input[name="truck1-color"]');
    if (truck1Radios.length > 0) {
        const savedColor = localStorage.getItem('firefighterTruck1Color') || '#e74c3c';
        truck1Radios.forEach(radio => {
            radio.checked = (radio.value === savedColor);
            radio.addEventListener('change', () => {
                if (radio.checked && currentFireGame) {
                    currentFireGame.truck1Color = radio.value;
                    localStorage.setItem('firefighterTruck1Color', radio.value);
                }
            });
        });
    }

    // Truck 2 colors
    const truck2Radios = document.querySelectorAll('input[name="truck2-color"]');
    if (truck2Radios.length > 0) {
        const savedColor = localStorage.getItem('firefighterTruck2Color') || '#e74c3c';
        truck2Radios.forEach(radio => {
            radio.checked = (radio.value === savedColor);
            radio.addEventListener('change', () => {
                if (radio.checked && currentFireGame) {
                    currentFireGame.truck2Color = radio.value;
                    localStorage.setItem('firefighterTruck2Color', radio.value);
                }
            });
        });
    }

    // Truck 3 colors
    const truck3Radios = document.querySelectorAll('input[name="truck3-color"]');
    if (truck3Radios.length > 0) {
        const savedColor = localStorage.getItem('firefighterTruck3Color') || '#9ACD32';
        truck3Radios.forEach(radio => {
            radio.checked = (radio.value === savedColor);
            radio.addEventListener('change', () => {
                if (radio.checked && currentFireGame) {
                    currentFireGame.truck3Color = radio.value;
                    localStorage.setItem('firefighterTruck3Color', radio.value);
                }
            });
        });
    }
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

    // Check if there's a pending truck style change and trigger animation
    if (currentFireGame && currentFireGame.pendingTruckStyleChange) {
        currentFireGame.startTruckChangeAnimation();
    }
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
    try {
        if (typeof Tone !== 'undefined' && Tone.context && Tone.context.state !== 'running') {
            Tone.start();
        }
        if (!backgroundMusic) {
            setupBackgroundMusic();
        }
    } catch (e) {
        console.warn('Audio start failed:', e);
    }
    window.removeEventListener('click', startAudio, true);
}
window.addEventListener('click', startAudio, true);

// --- Background Music ---
let backgroundMusic = null;
let musicPlaying = false;

function setupBackgroundMusic() {
    try {
        if (typeof Tone === 'undefined') return;

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
    } catch (e) {
        console.warn('Background music setup failed:', e);
    }
}

function toggleBackgroundMusic(forceState) {
    const shouldBePlaying = forceState !== undefined ? forceState : !musicPlaying;

    if (!backgroundMusic) return;

    try {
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
    } catch (e) {
        console.warn('Toggle music failed:', e);
    }
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
    // This is called from DOMContentLoaded, before the game starts
    // The actual setup happens in setupVoiceRadios()
}

function setupVoiceRadios() {
    const voiceOnRadio = document.getElementById('voice-on-radio');
    const voiceOffRadio = document.getElementById('voice-off-radio');

    if (voiceOnRadio && voiceOffRadio && window.voiceGuide) {
        // Set initial value
        const enabled = window.voiceGuide.getEnabled();
        voiceOnRadio.checked = enabled;
        voiceOffRadio.checked = !enabled;

        // Handle voice toggle changes
        voiceOnRadio.addEventListener('change', () => {
            if (voiceOnRadio.checked) {
                window.voiceGuide.setEnabled(true);
            }
        });

        voiceOffRadio.addEventListener('change', () => {
            if (voiceOffRadio.checked) {
                window.voiceGuide.setEnabled(false);
            }
        });
    }
}

function setupWaterSoundRadios() {
    const whiteRadio = document.getElementById('sound-white-radio');
    const pinkRadio = document.getElementById('sound-pink-radio');
    const brownRadio = document.getElementById('sound-brown-radio');
    const offRadio = document.getElementById('sound-off-radio');

    const radios = [whiteRadio, pinkRadio, brownRadio, offRadio];

    if (radios.every(r => r)) {
        // Set initial value from localStorage
        const savedSound = localStorage.getItem('waterSoundType') || 'white';
        radios.forEach(radio => {
            radio.checked = (radio.value === savedSound);
        });

        // Handle sound changes
        radios.forEach(radio => {
            radio.addEventListener('change', () => {
                if (radio.checked) {
                    localStorage.setItem('waterSoundType', radio.value);
                    if (currentFireGame) {
                        currentFireGame.waterSynth = currentFireGame.createWaterSynth();
                    }
                }
            });
        });
    }
}

function restartFireRescue() {
    startFireRescueGame();
}

// Hydrant style radio buttons
function setupHydrantStyleRadios() {
    const classicRadio = document.getElementById('hydrant-classic-radio');
    const modernRadio = document.getElementById('hydrant-modern-radio');

    if (classicRadio && modernRadio) {
        // Set initial value from localStorage
        const savedStyle = localStorage.getItem('firefighterHydrantStyle') || 'classic';
        classicRadio.checked = (savedStyle === 'classic');
        modernRadio.checked = (savedStyle === 'modern');

        // Handle hydrant style changes
        classicRadio.addEventListener('change', () => {
            if (classicRadio.checked && currentFireGame) {
                currentFireGame.hydrantStyle = 'classic';
                localStorage.setItem('firefighterHydrantStyle', 'classic');
            }
        });

        modernRadio.addEventListener('change', () => {
            if (modernRadio.checked && currentFireGame) {
                currentFireGame.hydrantStyle = 'modern';
                localStorage.setItem('firefighterHydrantStyle', 'modern');
            }
        });
    }
}

function setupFunOptions() {
    // Double spray radios
    const doubleSprayOnRadio = document.getElementById('double-spray-on-radio');
    const doubleSprayOffRadio = document.getElementById('double-spray-off-radio');

    if (doubleSprayOnRadio && doubleSprayOffRadio) {
        const savedDoubleSpray = localStorage.getItem('firefighterDoubleSpray') === 'true';
        doubleSprayOnRadio.checked = savedDoubleSpray;
        doubleSprayOffRadio.checked = !savedDoubleSpray;

        doubleSprayOnRadio.addEventListener('change', () => {
            if (doubleSprayOnRadio.checked && currentFireGame) {
                currentFireGame.doubleSpray = true;
                localStorage.setItem('firefighterDoubleSpray', 'true');
            }
        });

        doubleSprayOffRadio.addEventListener('change', () => {
            if (doubleSprayOffRadio.checked && currentFireGame) {
                currentFireGame.doubleSpray = false;
                localStorage.setItem('firefighterDoubleSpray', 'false');
            }
        });
    }

    // Slow lights radios
    const slowLightsOnRadio = document.getElementById('slow-lights-on-radio');
    const slowLightsOffRadio = document.getElementById('slow-lights-off-radio');

    if (slowLightsOnRadio && slowLightsOffRadio) {
        const savedSlowLights = localStorage.getItem('firefighterSlowLights') === 'true';
        slowLightsOnRadio.checked = savedSlowLights;
        slowLightsOffRadio.checked = !savedSlowLights;

        slowLightsOnRadio.addEventListener('change', () => {
            if (slowLightsOnRadio.checked && currentFireGame) {
                currentFireGame.slowLights = true;
                localStorage.setItem('firefighterSlowLights', 'true');
            }
        });

        slowLightsOffRadio.addEventListener('change', () => {
            if (slowLightsOffRadio.checked && currentFireGame) {
                currentFireGame.slowLights = false;
                localStorage.setItem('firefighterSlowLights', 'false');
            }
        });
    }

    // Fire spread radios
    const fireSpreadOnRadio = document.getElementById('fire-spread-on-radio');
    const fireSpreadOffRadio = document.getElementById('fire-spread-off-radio');

    if (fireSpreadOnRadio && fireSpreadOffRadio) {
        const savedFireSpread = localStorage.getItem('firefighterFireSpread') === 'true';
        fireSpreadOnRadio.checked = savedFireSpread;
        fireSpreadOffRadio.checked = !savedFireSpread;

        fireSpreadOnRadio.addEventListener('change', () => {
            if (fireSpreadOnRadio.checked && currentFireGame) {
                currentFireGame.fireSpread = true;
                localStorage.setItem('firefighterFireSpread', 'true');
            }
        });

        fireSpreadOffRadio.addEventListener('change', () => {
            if (fireSpreadOffRadio.checked && currentFireGame) {
                currentFireGame.fireSpread = false;
                localStorage.setItem('firefighterFireSpread', 'false');
            }
        });
    }

    // Emergency lights radios
    const emergencyLightsOnRadio = document.getElementById('emergency-lights-on-radio');
    const emergencyLightsOffRadio = document.getElementById('emergency-lights-off-radio');

    if (emergencyLightsOnRadio && emergencyLightsOffRadio) {
        const savedEmergencyLights = localStorage.getItem('firefighterEmergencyLights') === 'true';
        emergencyLightsOnRadio.checked = savedEmergencyLights;
        emergencyLightsOffRadio.checked = !savedEmergencyLights;

        emergencyLightsOnRadio.addEventListener('change', () => {
            if (emergencyLightsOnRadio.checked && currentFireGame) {
                currentFireGame.emergencyLights = true;
                localStorage.setItem('firefighterEmergencyLights', 'true');
            }
        });

        emergencyLightsOffRadio.addEventListener('change', () => {
            if (emergencyLightsOffRadio.checked && currentFireGame) {
                currentFireGame.emergencyLights = false;
                localStorage.setItem('firefighterEmergencyLights', 'false');
            }
        });
    }
}

function setupFireTruckClick() {
    const fireTruckIcon = document.getElementById('fire-truck-icon');
    let canClick = false;

    if (fireTruckIcon) {
        // Wait for the initial animation to complete before enabling clicks
        setTimeout(() => {
            canClick = true;
            fireTruckIcon.addEventListener('click', () => {
                if (canClick && currentFireGame) {
                    // Just trigger the drive-off and return animation without changing truck style
                    currentFireGame.startTruckDriveAnimation();

                    // Briefly disable clicking to prevent rapid toggling
                    canClick = false;
                    setTimeout(() => {
                        canClick = true;
                    }, 500);
                }
            });
        }, 4000); // Wait for truckCrashIn animation to complete
    }
}

// Other level start functions removed - see FUTURE_LEVELS.md for concepts
