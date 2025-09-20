// Health Reminder functionality
class HealthReminder {
    constructor() {
        this.postureTimer = null;
        this.waterTimer = null;
        this.waterCount = parseInt(localStorage.getItem('daily-water-count')) || 0;
        this.lastWaterDate = localStorage.getItem('last-water-date') || '';
        this.postureApiUrl = 'http://localhost:8002'; // posture API URL
        this.isPostureApiConnected = false;
        this.isDrinkingApiConnected = false;
        this.init();
    }

    init() {
        this.checkNewDay();
        this.setupEventListeners();
        this.updateWaterDisplay();
        this.loadSettings();
        this.checkApiConnection();
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

        // Posture detection buttons
        document.getElementById('startPostureDetectionBtn')?.addEventListener('click', () => {
            this.startPostureDetection();
        });

        document.getElementById('stopPostureDetectionBtn')?.addEventListener('click', () => {
            this.stopPostureDetection();
        });

        document.getElementById('checkPostureBtn')?.addEventListener('click', () => {
            this.checkCurrentPosture();
        });

        // Drinking detection buttons
        document.getElementById('startDrinkingDetectionBtn')?.addEventListener('click', () => {
            this.startDrinkingDetection();
        });

        document.getElementById('stopDrinkingDetectionBtn')?.addEventListener('click', () => {
            this.stopDrinkingDetection();
        });

        document.getElementById('checkLastDrinkBtn')?.addEventListener('click', () => {
            this.checkLastDrinkTime();
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

    // API connection and posture detection methods
    async checkApiConnection() {
        try {
            const response = await fetch(`${this.postureApiUrl}/`);
            if (response.ok) {
                this.isPostureApiConnected = true;
                this.updateApiStatus(true);
                console.log('Posture API connected successfully');
            } else {
                throw new Error('API connection failed');
            }
        } catch (error) {
            this.isPostureApiConnected = false;
            this.updateApiStatus(false);
            console.log('Posture API not available:', error);
        }
    }

    updateApiStatus(isConnected) {
        const statusElements = document.querySelectorAll('.api-status');
        statusElements.forEach(element => {
            if (isConnected) {
                element.textContent = 'API 已連線';
                element.className = 'api-status connected';
            } else {
                element.textContent = 'API 未連線';
                element.className = 'api-status disconnected';
            }
        });
    }

    async startPostureDetection() {
        if (!this.isPostureApiConnected) {
            this.showNotification('錯誤', 'API 未連線，無法啟動姿勢檢測');
            return;
        }

        try {
            const response = await fetch(`${this.postureApiUrl}/start_posture_test`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.showNotification('姿勢檢測啟動', data.message);
                document.getElementById('postureDetectionStatus').textContent = '檢測中...';
                document.getElementById('postureDetectionStatus').className = 'detection-status active';
            } else {
                throw new Error('Failed to start posture detection');
            }
        } catch (error) {
            console.error('Error starting posture detection:', error);
            this.showNotification('錯誤', '無法啟動姿勢檢測');
        }
    }

    async stopPostureDetection() {
        if (!this.isPostureApiConnected) {
            this.showNotification('錯誤', 'API 未連線');
            return;
        }

        try {
            const response = await fetch(`${this.postureApiUrl}/stop_posture_test`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.showNotification('姿勢檢測停止', data.message);
                document.getElementById('postureDetectionStatus').textContent = '未檢測';
                document.getElementById('postureDetectionStatus').className = 'detection-status inactive';
            } else {
                throw new Error('Failed to stop posture detection');
            }
        } catch (error) {
            console.error('Error stopping posture detection:', error);
            this.showNotification('錯誤', '無法停止姿勢檢測');
        }
    }

    async checkCurrentPosture() {
        if (!this.isPostureApiConnected) {
            this.showNotification('錯誤', 'API 未連線，無法檢查姿勢');
            return;
        }

        try {
            const response = await fetch(`${this.postureApiUrl}/get_posture`);
            
            if (response.ok) {
                const data = await response.json();
                const postureStatus = data.posture;
                
                document.getElementById('currentPostureStatus').textContent = postureStatus;
                
                let message = '';
                
                if (postureStatus === 'good') {
                    message = '您的坐姿很棒！請繼續保持';
                    document.getElementById('currentPostureStatus').className = 'posture-status good';
                } else if (postureStatus === 'bad') {
                    message = '請注意您的坐姿，建議調整一下';
                    document.getElementById('currentPostureStatus').className = 'posture-status bad';
                } else {
                    message = `目前姿勢狀態：${postureStatus}`;
                    document.getElementById('currentPostureStatus').className = 'posture-status unknown';
                }
                
                this.showNotification('姿勢檢查結果', message);
            } else {
                throw new Error('Failed to get posture status');
            }
        } catch (error) {
            console.error('Error checking posture:', error);
            this.showNotification('錯誤', '無法獲取姿勢狀態');
        }
    }

    async startDrinkingDetection() {
        if (!this.isPostureApiConnected) {
            this.showNotification('錯誤', 'API 未連線，無法啟動喝水檢測');
            return;
        }

        try {
            const response = await fetch(`${this.postureApiUrl}/start_drinking_test`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.showNotification('喝水檢測啟動', data.message);
                document.getElementById('drinkingDetectionStatus').textContent = '檢測中...';
                document.getElementById('drinkingDetectionStatus').className = 'detection-status active';
            } else {
                throw new Error('Failed to start drinking detection');
            }
        } catch (error) {
            console.error('Error starting drinking detection:', error);
            this.showNotification('錯誤', '無法啟動喝水檢測');
        }
    }

    async stopDrinkingDetection() {
        if (!this.isPostureApiConnected) {
            this.showNotification('錯誤', 'API 未連線');
            return;
        }

        try {
            const response = await fetch(`${this.postureApiUrl}/stop_drinking_test`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.showNotification('喝水檢測停止', data.message);
                document.getElementById('drinkingDetectionStatus').textContent = '未檢測';
                document.getElementById('drinkingDetectionStatus').className = 'detection-status inactive';
            } else {
                throw new Error('Failed to stop drinking detection');
            }
        } catch (error) {
            console.error('Error stopping drinking detection:', error);
            this.showNotification('錯誤', '無法停止喝水檢測');
        }
    }

    async checkLastDrinkTime() {
        if (!this.isPostureApiConnected) {
            this.showNotification('錯誤', 'API 未連線，無法檢查上次喝水時間');
            return;
        }

        try {
            const response = await fetch(`${this.postureApiUrl}/get_last_drink_time`);
            
            if (response.ok) {
                const data = await response.json();
                const drinkTime = new Date(data.year, data.month - 1, data.day, data.hour, data.minute, data.second);
                const now = new Date();
                const timeDiff = now - drinkTime;
                const minutesAgo = Math.floor(timeDiff / (1000 * 60));
                
                const timeStr = drinkTime.toLocaleString('zh-TW');
                document.getElementById('lastDrinkTime').textContent = timeStr;
                
                let message = '';
                if (minutesAgo < 60) {
                    message = `上次喝水是 ${minutesAgo} 分鐘前`;
                } else if (minutesAgo < 1440) {
                    const hoursAgo = Math.floor(minutesAgo / 60);
                    message = `上次喝水是 ${hoursAgo} 小時前`;
                } else {
                    const daysAgo = Math.floor(minutesAgo / 1440);
                    message = `上次喝水是 ${daysAgo} 天前`;
                }
                
                this.showNotification('上次喝水時間', message);
                
                // 如果超過2小時沒喝水，提醒使用者
                if (minutesAgo > 120) {
                    setTimeout(() => {
                        this.showNotification('喝水提醒', '您已經很久沒有喝水了，記得補充水分哦！');
                    }, 1000);
                }
            } else {
                throw new Error('Failed to get last drink time');
            }
        } catch (error) {
            console.error('Error checking last drink time:', error);
            this.showNotification('錯誤', '無法獲取上次喝水時間');
        }
    }

    // Helper method for notifications
    showNotification(title, message) {
        if (window.inlistedApp && window.inlistedApp.showNotification) {
            window.inlistedApp.showNotification(title, message);
        } else {
            // Fallback to console or alert
            console.log(`${title}: ${message}`);
            alert(`${title}: ${message}`);
        }
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