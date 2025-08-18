/**
 * Firefighter Scoreboard System
 * Tracks performance metrics and displays achievements for fire rescue levels
 */
class FirefighterScoreboard {
    constructor() {
        this.stats = {
            firesExtinguished: 0,
            waterUsed: 0,
            responseTime: 0,
            accuracy: 100,
            startTime: null,
            waterShots: 0,
            successfulShots: 0,
            totalPlayTime: 0
        };
        
        this.achievements = [
            {
                id: 'quick_responder',
                name: 'Quick Responder',
                icon: '⚡',
                description: 'Complete level in under 60 seconds',
                earned: false,
                condition: (stats) => stats.responseTime < 60
            },
            {
                id: 'water_saver',
                name: 'Water Saver',
                icon: '💧',
                description: 'Use less than 50 gallons',
                earned: false,
                condition: (stats) => stats.waterUsed < 50
            },
            {
                id: 'fire_master',
                name: 'Fire Master',
                icon: '🔥',
                description: 'Extinguish 10+ fires',
                earned: false,
                condition: (stats) => stats.firesExtinguished >= 10
            },
            {
                id: 'sharpshooter',
                name: 'Sharpshooter',
                icon: '🎯',
                description: 'Maintain 90%+ accuracy',
                earned: false,
                condition: (stats) => stats.accuracy >= 90
            },
            {
                id: 'perfect_hero',
                name: 'Perfect Hero',
                icon: '⭐',
                description: 'Complete with 100% accuracy',
                earned: false,
                condition: (stats) => stats.accuracy === 100
            },
            {
                id: 'efficient_firefighter',
                name: 'Efficient Firefighter',
                icon: '🚀',
                description: 'High speed + low water usage',
                earned: false,
                condition: (stats) => stats.responseTime < 90 && stats.waterUsed < 75
            }
        ];
    }
    
    /**
     * Start tracking a new fire rescue session
     */
    startSession() {
        this.stats = {
            firesExtinguished: 0,
            waterUsed: 0,
            responseTime: 0,
            accuracy: 100,
            startTime: Date.now(),
            waterShots: 0,
            successfulShots: 0,
            totalPlayTime: 0
        };
        
        // Reset achievement status
        this.achievements.forEach(achievement => {
            achievement.earned = false;
        });
        
        console.log('🚒 Fire rescue session started');
    }
    
    /**
     * Record a fire being extinguished
     */
    recordFireExtinguished() {
        this.stats.firesExtinguished++;
        this.stats.successfulShots++;
        this.updateAccuracy();
        
        window.soundManager?.playSuccess('C5', '4n');
        console.log(`🔥 Fire extinguished! Total: ${this.stats.firesExtinguished}`);
    }
    
    /**
     * Record water being used
     */
    recordWaterUsed(amount = 1) {
        this.stats.waterUsed += amount;
        this.stats.waterShots++;
        this.updateAccuracy();
    }
    
    /**
     * Update accuracy calculation
     */
    updateAccuracy() {
        if (this.stats.waterShots > 0) {
            this.stats.accuracy = Math.round((this.stats.successfulShots / this.stats.waterShots) * 100);
        }
    }
    
    /**
     * End the session and calculate final scores
     */
    endSession() {
        if (this.stats.startTime) {
            this.stats.responseTime = Math.round((Date.now() - this.stats.startTime) / 1000);
            this.stats.totalPlayTime = this.stats.responseTime;
        }
        
        this.checkAchievements();
        this.saveStats();
        
        console.log('🏆 Fire rescue session completed:', this.stats);
        return this.stats;
    }
    
    /**
     * Check which achievements have been earned
     */
    checkAchievements() {
        this.achievements.forEach(achievement => {
            if (achievement.condition(this.stats)) {
                achievement.earned = true;
                console.log(`🏅 Achievement earned: ${achievement.name}`);
                
                // Play achievement sound
                if (window.soundManager) {
                    setTimeout(() => {
                        window.soundManager.playCompletion();
                    }, 500);
                }
            }
        });
    }
    
    /**
     * Calculate efficiency score
     */
    calculateEfficiencyScore() {
        let score = 0;
        
        // Time efficiency (0-30 points)
        if (this.stats.responseTime <= 30) score += 30;
        else if (this.stats.responseTime <= 60) score += 25;
        else if (this.stats.responseTime <= 120) score += 20;
        else if (this.stats.responseTime <= 180) score += 15;
        else score += 10;
        
        // Water efficiency (0-25 points)
        if (this.stats.waterUsed <= 30) score += 25;
        else if (this.stats.waterUsed <= 50) score += 20;
        else if (this.stats.waterUsed <= 75) score += 15;
        else if (this.stats.waterUsed <= 100) score += 10;
        else score += 5;
        
        // Accuracy (0-25 points)
        if (this.stats.accuracy >= 95) score += 25;
        else if (this.stats.accuracy >= 90) score += 20;
        else if (this.stats.accuracy >= 80) score += 15;
        else if (this.stats.accuracy >= 70) score += 10;
        else score += 5;
        
        // Fires extinguished (0-20 points)
        if (this.stats.firesExtinguished >= 15) score += 20;
        else if (this.stats.firesExtinguished >= 10) score += 15;
        else if (this.stats.firesExtinguished >= 5) score += 10;
        else score += Math.min(this.stats.firesExtinguished * 2, 8);
        
        // Convert to letter grade
        if (score >= 90) return 'A+';
        else if (score >= 85) return 'A';
        else if (score >= 80) return 'A-';
        else if (score >= 75) return 'B+';
        else if (score >= 70) return 'B';
        else if (score >= 65) return 'B-';
        else if (score >= 60) return 'C+';
        else if (score >= 55) return 'C';
        else if (score >= 50) return 'C-';
        else return 'D';
    }
    
    /**
     * Get hero message based on performance
     */
    getHeroMessage() {
        const score = this.calculateEfficiencyScore();
        const achievements = this.achievements.filter(a => a.earned).length;
        
        if (score === 'A+' && achievements >= 4) {
            return {
                title: 'LEGENDARY FIREFIGHTER!',
                description: 'You are a true hero! Your exceptional skills saved the day with perfect efficiency and outstanding performance!'
            };
        } else if (score.startsWith('A') && achievements >= 3) {
            return {
                title: 'OUTSTANDING FIREFIGHTER!',
                description: 'Excellent work! Your quick thinking and skillful water management made you a real hero today!'
            };
        } else if (score.startsWith('B') && achievements >= 2) {
            return {
                title: 'SKILLED FIREFIGHTER!',
                description: 'Great job! You showed real firefighting talent and helped save the day!'
            };
        } else if (score.startsWith('C') || achievements >= 1) {
            return {
                title: 'BRAVE FIREFIGHTER!',
                description: 'Good work! Every fire you put out made a difference. Keep practicing to become an even better hero!'
            };
        } else {
            return {
                title: 'ROOKIE FIREFIGHTER!',
                description: 'Nice try! Every hero starts somewhere. Practice makes perfect - try again to improve your skills!'
            };
        }
    }
    
    /**
     * Format time as MM:SS
     */
    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    
    /**
     * Display the scoreboard
     */
    showScoreboard() {
        const scoreboardScreen = document.getElementById('firefighter-scoreboard');
        const heroMessage = this.getHeroMessage();
        
        // Update statistics
        document.getElementById('fires-count').textContent = this.stats.firesExtinguished;
        document.getElementById('water-used').textContent = `${this.stats.waterUsed} gallons`;
        document.getElementById('response-time').textContent = this.formatTime(this.stats.responseTime);
        document.getElementById('accuracy').textContent = `${this.stats.accuracy}%`;
        document.getElementById('efficiency-score').textContent = this.calculateEfficiencyScore();
        
        // Update hero message
        document.getElementById('hero-title').textContent = heroMessage.title;
        document.getElementById('hero-description').textContent = heroMessage.description;
        
        // Update achievements
        this.displayAchievements();
        
        // Unlock next level before showing scoreboard
        if (window.chosenLevel) {
            const currentLevelNumber = window.levelOrder.indexOf(window.chosenLevel) + 1;
            if (currentLevelNumber > 0) {
                window.unlockLevel(currentLevelNumber + 1);
            }
        }
        
        // Hide current screen and show scoreboard
        document.querySelectorAll('.game-screen').forEach(screen => {
            screen.classList.add('hidden');
        });
        scoreboardScreen.classList.remove('hidden');
        
        // Play scoreboard sound
        if (window.soundManager) {
            setTimeout(() => {
                window.soundManager.playCompletion();
            }, 500);
        }
        
        // Speak the results if voice guidance is enabled
        if (window.voiceGuide?.getEnabled()) {
            setTimeout(() => {
                const spokenResults = `${heroMessage.title} You extinguished ${this.stats.firesExtinguished} fires with ${this.stats.accuracy} percent accuracy in ${this.formatTime(this.stats.responseTime)}. Your efficiency score is ${this.calculateEfficiencyScore()}.`;
                window.voiceGuide.speakCompletion(spokenResults);
            }, 1000);
        }
    }
    
    /**
     * Display achievements in the grid
     */
    displayAchievements() {
        const achievementsContainer = document.getElementById('achievements-list');
        achievementsContainer.innerHTML = '';
        
        this.achievements.forEach(achievement => {
            const achievementElement = document.createElement('div');
            achievementElement.className = `achievement-item ${achievement.earned ? 'earned' : ''}`;
            achievementElement.title = achievement.description;
            
            achievementElement.innerHTML = `
                <span class="achievement-icon">${achievement.icon}</span>
                <div class="achievement-name">${achievement.name}</div>
            `;
            
            achievementsContainer.appendChild(achievementElement);
        });
    }
    
    /**
     * Save statistics to localStorage
     */
    saveStats() {
        try {
            const existingStats = JSON.parse(localStorage.getItem('firefighter-stats') || '{}');
            
            // Update cumulative stats
            existingStats.totalSessions = (existingStats.totalSessions || 0) + 1;
            existingStats.totalFires = (existingStats.totalFires || 0) + this.stats.firesExtinguished;
            existingStats.totalWater = (existingStats.totalWater || 0) + this.stats.waterUsed;
            existingStats.totalPlayTime = (existingStats.totalPlayTime || 0) + this.stats.totalPlayTime;
            existingStats.bestTime = Math.min(existingStats.bestTime || Infinity, this.stats.responseTime);
            existingStats.bestAccuracy = Math.max(existingStats.bestAccuracy || 0, this.stats.accuracy);
            
            // Save current session
            existingStats.lastSession = { ...this.stats };
            existingStats.lastPlayed = new Date().toISOString();
            
            localStorage.setItem('firefighter-stats', JSON.stringify(existingStats));
        } catch (error) {
            console.warn('Could not save firefighter stats:', error);
        }
    }
    
    /**
     * Get current statistics
     */
    getStats() {
        return { ...this.stats };
    }
    
    /**
     * Get earned achievements
     */
    getEarnedAchievements() {
        return this.achievements.filter(a => a.earned);
    }
}

// Global functions for HTML onclick handlers
function endFireRescue() {
    if (window.firefighterScoreboard && window.currentFireRescueGame) {
        window.firefighterScoreboard.endSession();
        window.firefighterScoreboard.showScoreboard();
        
        // Stop the current game
        if (window.currentFireRescueGame.gameLoop) {
            window.currentFireRescueGame.gameState = 'ENDED';
        }
    }
}

function restartFireRescue() {
    // Go back to fire rescue level
    showScreen('fire-game-screen');
    
    if (window.currentFireRescueGame) {
        window.currentFireRescueGame.start();
        window.firefighterScoreboard?.startSession();
    }
}

// Create global instance
window.firefighterScoreboard = new FirefighterScoreboard();