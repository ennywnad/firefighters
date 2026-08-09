// Simple self-check system for the classic (v1) firefighter game.
//
// These are smoke tests, not unit tests: they confirm the pieces the page needs
// are actually on the page. They do NOT run on a normal visit — load the game
// with ?test=1 (or run gameTester.runTests() from the console) to see them.

class GameTester {
    constructor() {
        this.tests = [];
        this.results = [];
    }

    // optional tests report as SKIP instead of FAIL — used for things the game
    // is designed to work without, like the CDN-hosted audio library
    addTest(name, testFn, options) {
        this.tests.push({ name, testFn, optional: !!(options && options.optional) });
    }

    async runTests() {
        console.log('🧪 Running Game Tests...');
        this.results = [];

        for (const test of this.tests) {
            try {
                const startTime = Date.now();
                await test.testFn();
                const duration = Date.now() - startTime;
                this.results.push({ name: test.name, status: 'PASS', duration, error: null });
                console.log(`✅ ${test.name} (${duration}ms)`);
            } catch (error) {
                const status = test.optional ? 'SKIP' : 'FAIL';
                this.results.push({ name: test.name, status, duration: 0, error: error.message });
                if (test.optional) {
                    console.warn(`⚠️ ${test.name}: ${error.message} (optional — the game runs without it)`);
                } else {
                    console.error(`❌ ${test.name}: ${error.message}`);
                }
            }
        }

        this.displaySummary();
        return this.results;
    }

    displaySummary() {
        const count = s => this.results.filter(r => r.status === s).length;
        console.log(`\n📊 Test Summary: ${count('PASS')} passed, ${count('FAIL')} failed, ${count('SKIP')} skipped`);
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
    // The game boots straight into Fire Rescue; there is no level-select menu.
    const requiredScreens = [
        'fire-game-screen',
        'options-screen',
        'firefighter-scoreboard',
        'hero-report-screen'
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
        'startFireRescueGame',
        'goToMenu',
        'showHeroReport',
        'showOptionsOverlay',
        'hideOptionsOverlay',
        'endFireRescue'
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

// Test: the shared fire-truck header (version picker + title sequence)
gameTester.addTest('Version Bar Mounted', () => {
    if (!window.FireRescueBar) {
        throw new Error('FireRescueBar not loaded from shared/');
    }
    if (!document.querySelector('.frb-wrap .frb-versions')) {
        throw new Error('version picker did not mount onto the header truck');
    }
});

// Test: Audio context works.
// Optional: Tone.js comes from a CDN and both the music and the water synth
// fall back to silent stubs when it is missing, so an offline page still plays.
gameTester.addTest('Audio Context Available', () => {
    if (!window.Tone) {
        throw new Error('Tone.js not loaded (offline or blocked)');
    }

    // Test that we can create synths
    const synth = new Tone.Synth();
    if (!synth) {
        throw new Error('Failed to create Tone.Synth');
    }
}, { optional: true });

// Auto-run only when asked for: firefighters/?test=1
if (/[?&]test=1\b/.test(location.search)) {
    window.addEventListener('load', () => {
        setTimeout(() => gameTester.runTests(), 1000); // wait for everything to load
    });
}

// Expose tester globally for manual testing
window.gameTester = gameTester;
