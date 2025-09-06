// --- Global Navigation & Scene Management ---

// Level Progression - Currently only Fire Rescue is active
const levelOrder = ['fire'];

// Debug mode toggle
let debugMode = localStorage.getItem('firefighterDebugMode') === 'true';


function getUnlockedLevel() {
    if (debugMode) return levelOrder.length; // Unlock all levels in debug mode
    return parseInt(localStorage.getItem('firefighterUnlockedLevel') || '1', 10);
}

function unlockLevel(levelNumber) {
    const currentUnlocked = getUnlockedLevel();
    if (levelNumber > currentUnlocked) {
        localStorage.setItem('firefighterUnlockedLevel', levelNumber);
    }
}

function updateLevelButtons() {
    const unlockedLevel = getUnlockedLevel();
    document.querySelectorAll('.level-button').forEach(button => {
        const levelName = button.dataset.level;
        const levelNumber = levelOrder.indexOf(levelName) + 1;
        if (levelNumber <= unlockedLevel) {
            button.disabled = false;
            button.classList.remove('locked');
        } else {
            button.disabled = true;
            button.classList.add('locked');
        }
    });
    
}

document.addEventListener('DOMContentLoaded', () => {
    updateLevelButtons();
    // Set default scene selection
    const defaultSceneButton = document.querySelector('[data-scene="day"]');
    if (defaultSceneButton) {
        defaultSceneButton.classList.add('selected');
    }
    
    document.getElementById('reset-progress-button').addEventListener('click', () => {
        localStorage.removeItem('firefighterUnlockedLevel');
        updateLevelButtons();
    });
    
    // Developer Reference button
    document.getElementById('developer-reference-button').addEventListener('click', () => {
        menuScreen.classList.add('hidden');
        const developerReference = new DeveloperReference();
        developerReference.start();
        toggleBackgroundMusic(false);
    });
    
});

const menuScreen = document.getElementById('menu-screen');
const optionsScreen = document.getElementById('options-screen');
const fireGameScreen = document.getElementById('fire-game-screen');
// Other level screens removed - only Fire Rescue active
const muteButton = document.getElementById('mute-button');
const heroReportScreen = document.getElementById('hero-report-screen');
const heroReportMessage = document.getElementById('hero-report-message');
const reportMenuButton = document.getElementById('report-menu-button');
const reportPlayAgainButton = document.getElementById('report-play-again-button');

muteButton.addEventListener('click', () => {
    toggleBackgroundMusic();
});

reportMenuButton.addEventListener('click', goToMenu);
reportPlayAgainButton.addEventListener('click', () => {
    heroReportScreen.classList.add('hidden');
    if (chosenLevel === 'fire') {
        startFireGame();
    }
    // Other levels removed - see FUTURE_LEVELS.md
});

let activeGameIntervals = [];
let chosenLevel = null;

const scenes = {
    day: { sky: '#87CEEB', ground: '#2ECC71', building: '#bdc3c7', treeTrunk: '#8D6E63', treeLeaves: '#4CAF50', special: null },
    night: { sky: '#2c3e50', ground: '#27ae60', building: '#95a5a6', treeTrunk: '#6D4C41', treeLeaves: '#2c6b2f', special: 'stars' },
    autumn: { sky: '#d35400', ground: '#A1887F', building: '#bdc3c7', treeTrunk: '#8D6E63', treeLeaves: '#e67e22', special: 'leaves' },
    winter: { sky: '#a0d2eb', ground: '#ffffff', building: '#bdc3c7', treeTrunk: '#8D6E63', treeLeaves: '#e0f7fa', special: 'snow' }
};
let currentScene = scenes.day;
let sceneParticles = [];

document.querySelectorAll('.level-button').forEach(button => {
    button.addEventListener('click', () => {
        chosenLevel = button.dataset.level;
        menuScreen.classList.add('hidden');
        
        // Only Fire Rescue level is currently active
        currentScene = scenes.day;
        if (chosenLevel === 'fire') {
            const fireGame = new FireRescueLevel();
            fireGame.start();
        }
        toggleBackgroundMusic(true);
    });
});

// Options menu handling
document.getElementById('options-button').addEventListener('click', () => {
    menuScreen.classList.add('hidden');
    optionsScreen.classList.remove('hidden');
    updateDebugStatus();
});

// Scene selection in options menu
document.querySelectorAll('.scene-button').forEach(button => {
    button.addEventListener('click', () => {
        currentScene = scenes[button.dataset.scene];
        // Visual feedback - highlight selected scene
        document.querySelectorAll('.scene-button').forEach(b => b.classList.remove('selected'));
        button.classList.add('selected');
    });
});

// Debug toggle functionality
document.getElementById('debug-toggle-button').addEventListener('click', () => {
    debugMode = !debugMode;
    localStorage.setItem('firefighterDebugMode', debugMode.toString());
    updateDebugStatus();
    updateLevelButtons();
});

function updateDebugStatus() {
    const statusSpan = document.getElementById('debug-status');
    const button = document.getElementById('debug-toggle-button');
    if (debugMode) {
        statusSpan.textContent = 'ON';
        statusSpan.style.color = '#27ae60';
        button.style.backgroundColor = '#27ae60';
    } else {
        statusSpan.textContent = 'OFF';
        statusSpan.style.color = '#e74c3c';
        button.style.backgroundColor = '#e74c3c';
    }
}

function showHeroReport(message) {
    const currentLevelNumber = levelOrder.indexOf(chosenLevel) + 1;
    if (currentLevelNumber > 0) {
        unlockLevel(currentLevelNumber + 1);
    }

    heroReportMessage.textContent = message;
    const fireGameScreen = document.getElementById('fire-game-screen');
    if (fireGameScreen) fireGameScreen.classList.add('hidden');
    // Only Fire Rescue screen needs to be hidden
    
    heroReportScreen.classList.remove('hidden');
    toggleBackgroundMusic(false);
}

function goToMenu() {
    // Clear all intervals and animation frames
    activeGameIntervals.forEach(clearInterval);
    activeGameIntervals = [];
    
    // Cancel all animation frames
    if (window.fireGameAnimationId) cancelAnimationFrame(window.fireGameAnimationId);
    // Other level animations removed - only Fire Rescue active

    // Hide all game screens
    const allScreens = document.querySelectorAll('.game-screen');
    allScreens.forEach(screen => screen.classList.add('hidden'));
    
    // Show menu screen
    menuScreen.classList.remove('hidden');
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

// Other level start functions removed - see FUTURE_LEVELS.md for concepts
