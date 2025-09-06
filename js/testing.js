// Simple testing system for firefighter game

class GameTester {
    constructor() {
        this.tests = [];
        this.results = [];
    }

    addTest(name, testFn) {
        this.tests.push({ name, testFn });
    }

    async runTests() {
        console.log('🧪 Running Game Tests...');
        this.results = [];
        
        for (const test of this.tests) {
            try {
                const startTime = Date.now();
                await test.testFn();
                const duration = Date.now() - startTime;
                this.results.push({
                    name: test.name,
                    status: 'PASS',
                    duration,
                    error: null
                });
                console.log(`✅ ${test.name} (${duration}ms)`);
            } catch (error) {
                this.results.push({
                    name: test.name,
                    status: 'FAIL',
                    duration: 0,
                    error: error.message
                });
                console.error(`❌ ${test.name}: ${error.message}`);
            }
        }
        
        this.displaySummary();
    }

    displaySummary() {
        const passed = this.results.filter(r => r.status === 'PASS').length;
        const failed = this.results.filter(r => r.status === 'FAIL').length;
        console.log(`\n📊 Test Summary: ${passed} passed, ${failed} failed`);
    }
}

// Game-specific tests
const gameTester = new GameTester();

// Test: Fire Rescue level class is available
gameTester.addTest('Fire Rescue Level Available', () => {
    const requiredClasses = [
        'FireRescueLevel'
        // Other levels removed - see FUTURE_LEVELS.md for concepts
    ];
    
    for (const className of requiredClasses) {
        if (!window[className]) {
            throw new Error(`${className} not found in global scope`);
        }
    }
});

// Test: Required game screens exist in DOM
gameTester.addTest('Game Screens Exist', () => {
    const requiredScreens = [
        'menu-screen',
        'fire-game-screen'
        // Other level screens removed - see FUTURE_LEVELS.md for concepts
    ];
    
    for (const screenId of requiredScreens) {
        if (!document.getElementById(screenId)) {
            throw new Error(`Screen ${screenId} not found in DOM`);
        }
    }
});

// Test: Level instantiation works
gameTester.addTest('Level Instantiation', () => {
    // Test FireRescueLevel
    const canvas = document.createElement('canvas');
    const screen = document.createElement('div');
    screen.innerHTML = '<div class="instructions"></div><div class="title"></div>';
    
    const fireLevel = new window.FireRescueLevel(canvas, screen);
    if (!fireLevel.ctx) {
        throw new Error('FireRescueLevel failed to initialize canvas context');
    }
    
    // Only Fire Rescue level is currently active
});

// Test: Essential functions exist
gameTester.addTest('Core Functions Available', () => {
    const requiredFunctions = [
        'goToMenu',
        'showHeroReport',
        'getUnlockedLevel'
    ];
    
    for (const funcName of requiredFunctions) {
        if (typeof window[funcName] !== 'function') {
            throw new Error(`Function ${funcName} not available`);
        }
    }
});

// Test: Animation utilities available
gameTester.addTest('Animation Utils Available', () => {
    if (!window.AnimationUtils) {
        throw new Error('AnimationUtils not found');
    }
    
    const requiredClasses = ['ParticleSystem', 'AnimatedValue'];
    for (const className of requiredClasses) {
        if (!window.AnimationUtils[className]) {
            throw new Error(`AnimationUtils.${className} not found`);
        }
    }
});

// Test: Audio context works
gameTester.addTest('Audio Context Available', () => {
    if (!window.Tone) {
        throw new Error('Tone.js not loaded');
    }
    
    // Test that we can create synths
    const synth = new Tone.Synth();
    if (!synth) {
        throw new Error('Failed to create Tone.Synth');
    }
});

// Auto-run tests when page loads
window.addEventListener('load', () => {
    setTimeout(() => {
        gameTester.runTests();
    }, 1000); // Wait for everything to load
});

// Expose tester globally for manual testing
window.gameTester = gameTester;