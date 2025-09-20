// Health Reminder functionality
class HealthReminder {
    constructor() {
        this.postureTimer = null;
        this.waterTimer = null;
        this.waterCount = parseInt(localStorage.getItem('daily-water-count')) || 0;
        this.lastWaterDate = localStorage.getItem('last-water-date') || '';
        this.init();
    }

    init() {
        this.checkNewDay();
        this.setupEventListeners();
        this.updateWaterDisplay();
        this.loadSettings();
    }

    checkNewDay() {
        const today = new Date().toDateString();
        if (this.lastWaterDate !== today) {
            this.waterCount = 0;
            this.lastWaterDate = today;
            this.saveWaterData();
        }
    }

    setupEventListeners() {
        // Posture reminder toggle
        document.getElementById('postureToggle').addEventListener('change', (e) => {
            if (e.target.checked) {
                this.startPostureReminder();
            } else {
                this.stopPostureReminder();
            }
            this.updateFeatureStatus('posture', e.target.checked);
        });

        // Water reminder toggle
        document.getElementById('waterToggle').addEventListener('change', (e) => {
            if (e.target.checked) {
                this.startWaterReminder();
            } else {
                this.stopWaterReminder();
            }
            this.updateFeatureStatus('water', e.target.checked);
        });

        // Interval changes
        document.getElementById('postureInterval').addEventListener('change', () => {
            if (document.getElementById('postureToggle').checked) {
                this.startPostureReminder(); // Restart with new interval
            }
            this.saveSettings();
        });

        document.getElementById('waterInterval').addEventListener('change', () => {
            if (document.getElementById('waterToggle').checked) {
                this.startWaterReminder(); // Restart with new interval
            }
            this.saveSettings();
        });

        // Add water button
        document.getElementById('addWaterBtn').addEventListener('click', () => {
            this.addWater();
        });
    }

    startPostureReminder() {
        this.stopPostureReminder(); // Clear any existing timer
        
        const interval = parseInt(document.getElementById('postureInterval').value) * 60 * 1000; // Convert to milliseconds
        
        this.postureTimer = setInterval(() => {
            this.showPostureReminder();
        }, interval);

        window.inlistedApp.showNotification('坐姿提醒已啟用', `每 ${interval / 60000} 分鐘提醒一次`);
    }

    stopPostureReminder() {
        if (this.postureTimer) {
            clearInterval(this.postureTimer);
            this.postureTimer = null;
        }
    }

    startWaterReminder() {
        this.stopWaterReminder(); // Clear any existing timer
        
        const interval = parseInt(document.getElementById('waterInterval').value) * 60 * 1000; // Convert to milliseconds
        
        this.waterTimer = setInterval(() => {
            this.showWaterReminder();
        }, interval);

        window.inlistedApp.showNotification('喝水提醒已啟用', `每 ${interval / 60000} 分鐘提醒一次`);
    }

    stopWaterReminder() {
        if (this.waterTimer) {
            clearInterval(this.waterTimer);
            this.waterTimer = null;
        }
    }

    showPostureReminder() {
        const messages = [
            '記得保持正確坐姿！',
            '挺直背部，放鬆肩膀',
            '檢查一下你的坐姿是否正確',
            '調整螢幕高度，保護頸椎',
            '雙腳平放地面，膝蓋成90度'
        ];

        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        
        window.inlistedApp.showNotification('坐姿提醒', randomMessage);
        
        // Optional: Show visual reminder in the app
        this.showInAppReminder('posture', randomMessage);
    }

    showWaterReminder() {
        const messages = [
            '該喝水了！保持身體水分充足',
            '記得補充水分哦',
            '來一杯水吧，身體需要水分',
            '喝水時間到！健康很重要',
            '別忘了喝水，保持健康習慣'
        ];

        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        
        window.inlistedApp.showNotification('喝水提醒', randomMessage);
        
        // Optional: Show visual reminder in the app
        this.showInAppReminder('water', randomMessage);
    }

    showInAppReminder(type, message) {
        // Create a temporary in-app notification
        const reminder = document.createElement('div');
        reminder.className = 'in-app-reminder';
        reminder.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            z-index: 1000;
            max-width: 300px;
            animation: slideInRight 0.3s ease-out;
        `;

        const icon = type === 'posture' ? 'fa-user-check' : 'fa-tint';
        reminder.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas ${icon}"></i>
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: white; margin-left: auto; cursor: pointer;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        document.body.appendChild(reminder);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (reminder.parentElement) {
                reminder.remove();
            }
        }, 5000);
    }

    addWater() {
        this.waterCount++;
        this.saveWaterData();
        this.updateWaterDisplay();
        
        const congratsMessages = [
            '太棒了！又喝了一杯水',
            '保持良好習慣！',
            '身體會感謝你的',
            '繼續保持水分充足',
            '健康生活，從喝水開始'
        ];

        const message = congratsMessages[Math.floor(Math.random() * congratsMessages.length)];
        window.inlistedApp.showNotification('記錄成功', message);

        // Show encouraging message for milestones
        if (this.waterCount % 4 === 0) {
            window.inlistedApp.showNotification('太棒了！', `今天已經喝了 ${this.waterCount} 杯水！`);
        }
    }

    updateWaterDisplay() {
        document.getElementById('waterAmount').textContent = this.waterCount;
        
        // Update button text based on water count
        const btn = document.getElementById('addWaterBtn');
        if (this.waterCount >= 8) {
            btn.innerHTML = '<i class="fas fa-trophy"></i> 今日目標達成！';
            btn.style.background = 'linear-gradient(135deg, #27ae60, #16a085)';
        } else {
            btn.innerHTML = '<i class="fas fa-plus"></i> 記錄一杯水';
            btn.style.background = 'linear-gradient(135deg, #3498db, #2980b9)';
        }
    }

    updateFeatureStatus(feature, isEnabled) {
        const statusElement = document.getElementById(`${feature}Status`);
        if (isEnabled) {
            const interval = document.getElementById(`${feature}Interval`).value;
            statusElement.textContent = `已啟用 (每 ${interval} 分鐘)`;
            statusElement.style.background = 'linear-gradient(135deg, #27ae60, #16a085)';
            statusElement.style.color = 'white';
        } else {
            statusElement.textContent = '未啟用';
            statusElement.style.background = '#e9ecef';
            statusElement.style.color = '#666';
        }
    }

    saveWaterData() {
        localStorage.setItem('daily-water-count', this.waterCount.toString());
        localStorage.setItem('last-water-date', this.lastWaterDate);
    }

    saveSettings() {
        const settings = {
            postureEnabled: document.getElementById('postureToggle').checked,
            postureInterval: document.getElementById('postureInterval').value,
            waterEnabled: document.getElementById('waterToggle').checked,
            waterInterval: document.getElementById('waterInterval').value
        };
        localStorage.setItem('health-reminder-settings', JSON.stringify(settings));
    }

    loadSettings() {
        const settings = JSON.parse(localStorage.getItem('health-reminder-settings')) || {};
        
        if (settings.postureEnabled) {
            document.getElementById('postureToggle').checked = true;
            this.startPostureReminder();
        }
        
        if (settings.postureInterval) {
            document.getElementById('postureInterval').value = settings.postureInterval;
        }
        
        if (settings.waterEnabled) {
            document.getElementById('waterToggle').checked = true;
            this.startWaterReminder();
        }
        
        if (settings.waterInterval) {
            document.getElementById('waterInterval').value = settings.waterInterval;
        }

        // Update status displays
        this.updateFeatureStatus('posture', settings.postureEnabled || false);
        this.updateFeatureStatus('water', settings.waterEnabled || false);
    }

    // Get health statistics (for future analytics)
    getHealthStats() {
        const stats = JSON.parse(localStorage.getItem('health-stats')) || {
            totalWaterDays: 0,
            averageDailyWater: 0,
            postureReminders: 0,
            waterReminders: 0
        };
        return stats;
    }

    // Method for future integration with fitness trackers or health APIs
    integrateWithHealthApps() {
        console.log('Health apps integration placeholder');
        // TODO: Implement integration with fitness trackers, Apple Health, Google Fit, etc.
        window.inlistedApp.showNotification('功能開發中', '健康應用整合功能正在開發中');
    }
}

// Add CSS for in-app reminders
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .in-app-reminder {
        font-family: inherit;
    }
`;
document.head.appendChild(style);

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.healthReminder = new HealthReminder();
});