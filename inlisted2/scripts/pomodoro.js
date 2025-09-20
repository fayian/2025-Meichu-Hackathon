// Pomodoro Timer functionality with Smart AI integration
class PomodoroTimer {
    constructor() {
        this.timeLeft = 25 * 60; // Default 25 minutes in seconds
        this.originalTime = 25 * 60;
        this.isRunning = false;
        this.isPaused = false;
        this.interval = null;
        this.pauses = 0;
        this.userFeedback = null;
        
        // Initialize Smart AI
        this.smartAI = new SmartPomodoroAI();
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateDisplay();
        this.updateFeedbackUI();
    }

    setupEventListeners() {
        // Control buttons
        document.getElementById('startTimerBtn').addEventListener('click', () => {
            this.startTimer();
        });

        document.getElementById('pauseTimerBtn').addEventListener('click', () => {
            this.pauseTimer();
        });

        document.getElementById('resetTimerBtn').addEventListener('click', () => {
            this.resetTimer();
        });

        // Smart suggestion button
        const smartBtn = document.getElementById('smartSuggestionBtn');
        if (smartBtn) {
            smartBtn.addEventListener('click', () => {
                this.getSmartSuggestion();
            });
        }

        // User feedback buttons
        document.querySelectorAll('.feedback-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.setUserFeedback(btn.dataset.feedback);
            });
        });

        // Preset buttons
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const minutes = parseInt(btn.dataset.minutes);
                this.setTime(minutes);
            });
        });

        // Custom time setting
        document.getElementById('setCustomTimeBtn').addEventListener('click', () => {
            const minutes = parseInt(document.getElementById('customMinutes').value);
            if (minutes && minutes > 0 && minutes <= 180) {
                this.setTime(minutes);
            } else {
                alert('請輸入1到180之間的分鐘數');
            }
        });

        // Allow enter key in custom time input
        document.getElementById('customMinutes').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('setCustomTimeBtn').click();
            }
        });

        // Context updates
        const moodSelect = document.getElementById('moodSelect');
        if (moodSelect) {
            moodSelect.addEventListener('change', (e) => {
                this.smartAI.setContext({ selfReportedState: e.target.value });
            });
        }

        const taskImportanceSelect = document.getElementById('taskImportanceSelect');
        if (taskImportanceSelect) {
            taskImportanceSelect.addEventListener('change', (e) => {
                this.smartAI.setContext({ 
                    currentTask: { 
                        ...this.smartAI.currentContext.currentTask, 
                        importance: e.target.value 
                    } 
                });
            });
        }

        const taskEstimateInput = document.getElementById('taskEstimateInput');
        if (taskEstimateInput) {
            taskEstimateInput.addEventListener('change', (e) => {
                const estimateMin = parseInt(e.target.value) || 25;
                this.smartAI.setContext({ 
                    currentTask: { 
                        ...this.smartAI.currentContext.currentTask, 
                        estimateMin 
                    } 
                });
            });
        }
    }

    setTime(minutes) {
        if (this.isRunning) {
            const confirmChange = confirm('計時器正在運行中，是否要設定新的時間？');
            if (!confirmChange) return;
            this.stopTimer();
        }

        this.timeLeft = minutes * 60;
        this.originalTime = minutes * 60;
        this.updateDisplay();
        this.updateControls();

        window.inlistedApp.showNotification('番茄鐘時間已設定', `時間設定為 ${minutes} 分鐘`);
    }

    startTimer() {
        if (this.timeLeft <= 0) {
            this.timeLeft = this.originalTime;
        }

        this.isRunning = true;
        this.isPaused = false;

        this.interval = setInterval(() => {
            this.timeLeft--;
            this.updateDisplay();

            if (this.timeLeft <= 0) {
                this.timerComplete();
            }
        }, 1000);

        this.updateControls();
        window.inlistedApp.showNotification('番茄鐘開始', '專注時間開始！');
    }

    pauseTimer() {
        if (this.isRunning && !this.isPaused) {
            clearInterval(this.interval);
            this.isPaused = true;
            this.pauses++; // Track pauses for AI learning
            this.updateControls();
            window.inlistedApp.showNotification('番茄鐘暫停', '計時器已暫停');
        } else if (this.isPaused) {
            this.startTimer();
        }
    }

    resetTimer() {
        const confirmReset = this.isRunning ? 
            confirm('確定要重置計時器嗎？') : true;
        
        if (confirmReset) {
            this.stopTimer();
            this.timeLeft = this.originalTime;
            this.pauses = 0; // Reset pause count
            this.userFeedback = null; // Reset feedback
            this.updateDisplay();
            this.updateControls();
            this.updateFeedbackUI();
            window.inlistedApp.showNotification('番茄鐘重置', '計時器已重置');
        }
    }

    stopTimer() {
        clearInterval(this.interval);
        this.isRunning = false;
        this.isPaused = false;
    }

    timerComplete() {
        this.stopTimer();
        this.timeLeft = 0;
        this.updateDisplay();
        this.updateControls();

        // Process session with Smart AI
        const sessionResult = this.smartAI.finishSession({
            completed: true,
            pauses: this.pauses,
            userFeedback: this.userFeedback,
            duration: Math.floor(this.originalTime / 60)
        });

        // Show completion notification with AI break suggestion
        window.inlistedApp.showNotification(
            '番茄鐘完成！', 
            sessionResult.explanation
        );

        // Optional: Play sound (you could add an audio element)
        this.playNotificationSound();

        // Show completion dialog with AI suggestions
        this.showSmartCompletionDialog(sessionResult);

        // Reset for next session
        this.pauses = 0;
        this.userFeedback = null;
        this.updateFeedbackUI();
    }

    playNotificationSound() {
        // Create and play a simple notification sound
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 1);
    }

    showSmartCompletionDialog(sessionResult) {
        const { breakSuggestion, explanation } = sessionResult;
        
        const message = `番茄鐘完成！\n\n建議休息：${breakSuggestion.minutes}分鐘 (${breakSuggestion.kind === 'short' ? '短' : '長'}休息)\n${breakSuggestion.reason}\n\n點擊"確定"開始建議的休息時間\n點擊"取消"繼續工作`;
        
        const response = confirm(message);
        
        if (response) {
            // Start AI-suggested break timer
            this.setTime(breakSuggestion.minutes);
            setTimeout(() => {
                if (confirm('休息結束！是否開始下一個番茄鐘？\n\n點擊"確定"獲取智能建議\n點擊"取消"使用標準25分鐘')) {
                    this.getSmartSuggestion();
                } else {
                    this.setTime(25);
                }
            }, 500);
        } else {
            // Reset to original time
            this.timeLeft = this.originalTime;
            this.updateDisplay();
        }
    }

    // Get smart suggestion from AI
    getSmartSuggestion() {
        const suggestion = this.smartAI.chooseSmart();
        this.setTime(suggestion.duration);
        
        // Show explanation
        const explanationEl = document.getElementById('aiExplanation');
        if (explanationEl) {
            explanationEl.textContent = suggestion.explanation;
            explanationEl.style.display = 'block';
        } else {
            // Fallback: show in notification
            window.inlistedApp.showNotification(
                `AI建議：${suggestion.duration}分鐘`, 
                suggestion.explanation
            );
        }
    }

    // Set user feedback for current session
    setUserFeedback(feedback) {
        this.userFeedback = feedback;
        this.updateFeedbackUI();
        
        // If session is ongoing, provide immediate feedback to AI
        if (this.isRunning || this.isPaused) {
            // You could process partial session feedback here if desired
            console.log(`用戶反饋：${feedback}`);
        }
    }

    // Update feedback UI to show current selection
    updateFeedbackUI() {
        document.querySelectorAll('.feedback-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.feedback === this.userFeedback) {
                btn.classList.add('active');
            }
        });
    }

    updateDisplay() {
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        const displayTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        document.getElementById('timerDisplay').textContent = displayTime;

        // Update circle progress (optional visual enhancement)
        this.updateCircleProgress();
    }

    updateCircleProgress() {
        const circle = document.querySelector('.timer-circle');
        const progress = 1 - (this.timeLeft / this.originalTime);
        const circumference = 2 * Math.PI * 146; // Approximate circle radius
        const strokeDasharray = circumference;
        const strokeDashoffset = circumference * (1 - progress);

        // Add SVG circle for progress visualization (would need to be added to HTML)
        // This is a placeholder for future enhancement
    }

    updateControls() {
        const startBtn = document.getElementById('startTimerBtn');
        const pauseBtn = document.getElementById('pauseTimerBtn');
        const resetBtn = document.getElementById('resetTimerBtn');

        if (this.isRunning && !this.isPaused) {
            startBtn.disabled = true;
            startBtn.innerHTML = '<i class="fas fa-play"></i> 進行中...';
            pauseBtn.disabled = false;
            pauseBtn.innerHTML = '<i class="fas fa-pause"></i> 暫停';
        } else if (this.isPaused) {
            startBtn.disabled = false;
            startBtn.innerHTML = '<i class="fas fa-play"></i> 繼續';
            pauseBtn.disabled = false;
            pauseBtn.innerHTML = '<i class="fas fa-play"></i> 繼續';
        } else {
            startBtn.disabled = false;
            startBtn.innerHTML = '<i class="fas fa-play"></i> 開始';
            pauseBtn.disabled = true;
            pauseBtn.innerHTML = '<i class="fas fa-pause"></i> 暫停';
        }

        resetBtn.disabled = false;
    }

    // Get timer statistics (for future analytics)
    getStats() {
        const stats = JSON.parse(localStorage.getItem('pomodoro-stats')) || {
            totalSessions: 0,
            totalFocusTime: 0,
            todaySessions: 0,
            lastSessionDate: null
        };

        const today = new Date().toDateString();
        if (stats.lastSessionDate !== today) {
            stats.todaySessions = 0;
        }

        return stats;
    }

    saveSessionComplete() {
        const stats = this.getStats();
        const sessionMinutes = this.originalTime / 60;
        
        stats.totalSessions++;
        stats.totalFocusTime += sessionMinutes;
        stats.todaySessions++;
        stats.lastSessionDate = new Date().toDateString();

        localStorage.setItem('pomodoro-stats', JSON.stringify(stats));
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.pomodoroTimer = new PomodoroTimer();
});