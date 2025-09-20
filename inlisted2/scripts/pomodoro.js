// Pomodoro Timer functionality
class PomodoroTimer {
    constructor() {
        this.timeLeft = 25 * 60; // Default 25 minutes in seconds
        this.originalTime = 25 * 60;
        this.isRunning = false;
        this.isPaused = false;
        this.interval = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateDisplay();
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
            this.updateDisplay();
            this.updateControls();
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

        // Show completion notification
        window.inlistedApp.showNotification(
            '番茄鐘完成！', 
            '專注時間結束，該休息一下了！'
        );

        // Optional: Play sound (you could add an audio element)
        this.playNotificationSound();

        // Show completion modal or alert
        this.showCompletionDialog();
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

    showCompletionDialog() {
        const response = confirm('番茄鐘完成！\n\n點擊"確定"開始休息時間\n點擊"取消"重新開始');
        
        if (response) {
            // Start a 5-minute break timer
            this.setTime(5);
            setTimeout(() => {
                if (confirm('是否開始下一個番茄鐘？')) {
                    this.setTime(25);
                }
            }, 500);
        } else {
            // Reset to original time
            this.timeLeft = this.originalTime;
            this.updateDisplay();
        }
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