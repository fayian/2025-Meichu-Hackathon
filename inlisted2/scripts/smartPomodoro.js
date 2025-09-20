// Smart Pomodoro AI - Vanilla JavaScript Implementation
// Multi-armed bandit and fatigue tracking for adaptive focus recommendations

class SmartPomodoroAI {
    constructor() {
        this.config = {
            epsilon: 0.1, // 10% exploration rate
            arms: [15, 20, 25, 30, 40, 50], // Available durations in minutes
            contextWeights: {
                'morning': 0.03,
                'afternoon': 0.01,
                'evening': -0.02,
                'night': -0.05,
                'monday': 0.02,
                'friday': -0.01,
                'good_mood': 0.05,
                'poor_mood': -0.03,
                'high_importance': 0.02,
                'low_importance': -0.01
            }
        };

        // Initialize bandit state
        this.banditState = {
            counts: {},
            totalReward: {},
            config: this.config
        };

        // Initialize fatigue state
        this.fatigueState = {
            ewma: 0.5, // Start neutral
            alpha: 0.3 // EWMA smoothing factor
        };

        // Current context
        this.currentContext = {
            timeOfDay: this.getCurrentTimeOfDay(),
            dayOfWeek: new Date().getDay(),
            selfReportedState: 'neutral',
            currentTask: { estimateMin: 25, importance: 'medium' }
        };

        // Initialize all arms
        this.config.arms.forEach(arm => {
            this.banditState.counts[arm] = 0;
            this.banditState.totalReward[arm] = 0;
        });

        // Load saved state
        this.loadState();
    }

    getCurrentTimeOfDay() {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) return 'morning';
        if (hour >= 12 && hour < 17) return 'afternoon';
        if (hour >= 17 && hour < 21) return 'evening';
        return 'night';
    }

    // Update context
    setContext(updates) {
        this.currentContext = { 
            ...this.currentContext, 
            ...updates,
            timeOfDay: this.getCurrentTimeOfDay(),
            dayOfWeek: new Date().getDay()
        };
    }

    // Calculate contextual bias for an arm
    calculateContextBias(arm, ctx = this.currentContext) {
        let bias = 0;
        const weights = this.config.contextWeights;

        // Time of day bias
        bias += weights[ctx.timeOfDay] || 0;

        // Day of week bias
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        bias += weights[dayNames[ctx.dayOfWeek]] || 0;

        // Mood bias
        bias += weights[`${ctx.selfReportedState}_mood`] || 0;

        // Task importance bias
        if (ctx.currentTask?.importance) {
            bias += weights[`${ctx.currentTask.importance}_importance`] || 0;
        }

        // Duration-specific adjustments
        if (ctx.selfReportedState === 'poor' && arm > 30) {
            bias -= 0.02;
        }

        if (ctx.timeOfDay === 'morning' && arm >= 25) {
            bias += 0.01;
        }

        return bias;
    }

    // Choose optimal arm using ε-greedy strategy
    chooseSmart() {
        const arms = this.config.arms;
        const epsilon = this.config.epsilon;

        // Calculate values for each arm
        const armValues = {};
        let bestArm = arms[0];
        let bestValue = -Infinity;

        for (const arm of arms) {
            const count = this.banditState.counts[arm];
            const avgReward = count > 0 ? this.banditState.totalReward[arm] / count : 0.5;
            const ctxBias = this.calculateContextBias(arm);
            const adjustedValue = avgReward + ctxBias;

            armValues[arm] = adjustedValue;

            if (adjustedValue > bestValue) {
                bestValue = adjustedValue;
                bestArm = arm;
            }
        }

        // ε-greedy decision
        const shouldExplore = Math.random() < epsilon;
        const chosenArm = shouldExplore 
            ? arms[Math.floor(Math.random() * arms.length)]
            : bestArm;

        const explanation = this.explainSuggestion(chosenArm, armValues, shouldExplore);

        return {
            duration: chosenArm,
            explanation: explanation,
            debug: {
                armValues,
                exploration: shouldExplore,
                contextBias: this.calculateContextBias(chosenArm)
            }
        };
    }

    // Generate explanation for suggestion
    explainSuggestion(chosenArm, armValues, isExploration) {
        const count = this.banditState.counts[chosenArm];
        const avgReward = count > 0 ? this.banditState.totalReward[chosenArm] / count : 0.5;

        let explanation = `Recommended ${chosenArm} min: `;

        if (count > 0) {
            explanation += `avg score ${avgReward.toFixed(2)} over ${count} trial${count === 1 ? '' : 's'}`;

            // Find second best for comparison
            const sortedArms = Object.entries(armValues)
                .sort(([,a], [,b]) => b - a)
                .map(([arm]) => parseInt(arm));

            if (sortedArms.length > 1 && sortedArms[0] === chosenArm) {
                const secondBest = sortedArms[1];
                const secondBestCount = this.banditState.counts[secondBest];
                if (secondBestCount > 0) {
                    const secondBestReward = this.banditState.totalReward[secondBest] / secondBestCount;
                    if (Math.abs(avgReward - secondBestReward) > 0.05) {
                        explanation += `; better than ${secondBest} min (${secondBestReward.toFixed(2)})`;
                    }
                }
            }
        } else {
            explanation += `exploring new duration`;
        }

        // Context bias explanation
        const ctxBias = this.calculateContextBias(chosenArm);
        if (Math.abs(ctxBias) > 0.02) {
            const biasDirection = ctxBias > 0 ? 'adds' : 'reduces';
            const timeOfDay = this.currentContext.timeOfDay;
            explanation += `. ${timeOfDay.charAt(0).toUpperCase() + timeOfDay.slice(1)} context ${biasDirection} ${Math.abs(ctxBias).toFixed(2)}`;
        }

        if (isExploration) {
            explanation += ` (exploring)`;
        }

        return explanation + '.';
    }

    // Calculate reward based on session outcome
    calculateReward(completed, pauses, userFeedback) {
        let reward = 0;

        if (completed) {
            reward = 1.0 - Math.min(0.1 * pauses, 0.4);
        } else {
            reward = 0.0;
        }

        // Adjust based on user feedback
        if (userFeedback) {
            switch (userFeedback) {
                case 'too_short':
                    reward -= 0.15;
                    break;
                case 'just_right':
                    reward += 0.1;
                    break;
                case 'too_long':
                    reward -= 0.2;
                    break;
            }
        }

        return Math.max(0, Math.min(1, reward));
    }

    // Update bandit with session results
    updateBandit(arm, reward) {
        this.banditState.counts[arm] += 1;
        this.banditState.totalReward[arm] += reward;
    }

    // Calculate session quality for fatigue tracking
    calculateSessionQuality(completed, pauses, userFeedback, duration = 25) {
        let quality = 0.5;

        if (completed) {
            quality = 0.8 - Math.min(0.1 * pauses, 0.3);
            if (pauses === 0) {
                quality += 0.2;
            }
        } else {
            quality = 0.2;
            if (pauses > 0) {
                quality += 0.1;
            }
        }

        if (userFeedback) {
            switch (userFeedback) {
                case 'just_right':
                    quality += 0.2;
                    break;
                case 'too_short':
                    quality -= 0.1;
                    break;
                case 'too_long':
                    quality -= 0.3;
                    break;
            }
        }

        if (duration > 40) {
            quality -= 0.1;
        }

        return Math.max(0, Math.min(1, quality));
    }

    // Update fatigue using EWMA
    updateFatigue(sessionQuality) {
        let fatigueImpact;

        if (sessionQuality >= 0.8) {
            fatigueImpact = 0.2; // Excellent session reduces fatigue
        } else if (sessionQuality >= 0.6) {
            fatigueImpact = 0.4; // Good session
        } else if (sessionQuality >= 0.4) {
            fatigueImpact = 0.6; // Mediocre session
        } else {
            fatigueImpact = 0.8; // Poor session increases fatigue
        }

        // EWMA update
        this.fatigueState.ewma = this.fatigueState.alpha * fatigueImpact + 
                                 (1 - this.fatigueState.alpha) * this.fatigueState.ewma;
        
        this.fatigueState.ewma = Math.max(0, Math.min(1, this.fatigueState.ewma));
    }

    // Suggest break duration
    suggestBreak() {
        const fatigue = this.fatigueState.ewma;

        if (fatigue < 0.6) {
            const minutes = Math.floor(Math.random() * 3) + 5; // 5-7 minutes
            return {
                kind: 'short',
                minutes: minutes,
                reason: `Low fatigue level (${Math.round(fatigue * 100)}%) - a short ${minutes}-minute break should refresh you.`
            };
        } else {
            const minutes = Math.floor(Math.random() * 6) + 10; // 10-15 minutes
            return {
                kind: 'long',
                minutes: minutes,
                reason: `High fatigue level (${Math.round(fatigue * 100)}%) - take a longer ${minutes}-minute break to recover properly.`
            };
        }
    }

    // Process completed session
    finishSession(sessionResult) {
        const { completed, pauses, userFeedback, duration } = sessionResult;

        // Calculate reward and update bandit
        const reward = this.calculateReward(completed, pauses, userFeedback);
        this.updateBandit(duration, reward);

        // Calculate session quality and update fatigue
        const sessionQuality = this.calculateSessionQuality(completed, pauses, userFeedback, duration);
        this.updateFatigue(sessionQuality);

        // Get break suggestion
        const breakSuggestion = this.suggestBreak();

        // Save state
        this.saveState();

        return {
            breakSuggestion,
            explanation: this.getPersonalizedBreakAdvice(breakSuggestion),
            sessionQuality,
            reward
        };
    }

    getPersonalizedBreakAdvice(breakSuggestion) {
        const timeActivities = {
            morning: ['stretching', 'light walk', 'hydrate', 'look out the window'],
            afternoon: ['quick walk', 'healthy snack', 'deep breathing', 'stand and stretch'],
            evening: ['gentle stretching', 'herbal tea', 'dim the lights', 'light snack'],
            night: ['avoid screens', 'prepare for sleep', 'gentle breathing', 'dim lighting']
        };

        const activities = timeActivities[this.currentContext.timeOfDay];
        const randomActivity = activities[Math.floor(Math.random() * activities.length)];

        return `${breakSuggestion.reason} Consider ${randomActivity} during your break.`;
    }

    explainCurrentFatigue() {
        const fatigue = this.fatigueState.ewma;
        const percentage = Math.round(fatigue * 100);

        let description;
        if (fatigue < 0.3) {
            description = 'feeling fresh and energized';
        } else if (fatigue < 0.6) {
            description = 'moderately tired but still productive';
        } else if (fatigue < 0.8) {
            description = 'quite fatigued and may need longer breaks';
        } else {
            description = 'very tired and should consider stopping soon';
        }

        return `Current fatigue: ${percentage}% - you're ${description}.`;
    }

    // Reset all learning
    resetAI() {
        this.config.arms.forEach(arm => {
            this.banditState.counts[arm] = 0;
            this.banditState.totalReward[arm] = 0;
        });

        this.fatigueState.ewma = 0.5;

        // Clear storage
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('smart-pomodoro-ai-state');
        }

        if (window.electronAPI?.clearAIState) {
            window.electronAPI.clearAIState();
        }
    }

    // Save state to persistence
    saveState() {
        const state = {
            bandit: this.banditState,
            fatigue: this.fatigueState,
            lastUpdated: Date.now()
        };

        // Try electron-store first, fallback to localStorage
        if (window.electronAPI?.saveAIState) {
            window.electronAPI.saveAIState(state);
        } else if (typeof localStorage !== 'undefined') {
            try {
                localStorage.setItem('smart-pomodoro-ai-state', JSON.stringify(state));
            } catch (error) {
                console.warn('Failed to save AI state:', error);
            }
        }
    }

    // Load state from persistence
    loadState() {
        let savedState = null;

        // Try electron-store first, fallback to localStorage
        if (window.electronAPI?.loadAIState) {
            savedState = window.electronAPI.loadAIState();
        } else if (typeof localStorage !== 'undefined') {
            try {
                const saved = localStorage.getItem('smart-pomodoro-ai-state');
                if (saved) {
                    savedState = JSON.parse(saved);
                }
            } catch (error) {
                console.warn('Failed to load AI state:', error);
            }
        }

        if (savedState) {
            try {
                if (savedState.bandit) {
                    this.banditState = { ...this.banditState, ...savedState.bandit };
                }
                if (savedState.fatigue) {
                    this.fatigueState = { ...this.fatigueState, ...savedState.fatigue };
                }
                console.log('AI state loaded successfully');
            } catch (error) {
                console.warn('Failed to restore AI state:', error);
            }
        }
    }
}

// Export for use in other scripts
window.SmartPomodoroAI = SmartPomodoroAI;