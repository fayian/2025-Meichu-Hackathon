// Health Reminder functionality
class HealthReminder {
    constructor() {
        this.postureTimer = null;
        this.waterTimer = null;
        this.waterCount = parseInt(localStorage.getItem('daily-water-count')) || 0;
        this.lastWaterDate = localStorage.getItem('last-water-date') || '';
        this.postureApiUrl = 'http://127.0.0.1:8000'; // posture API URL
        this.isPostureApiConnected = false;
        this.isDrinkingApiConnected = false;
        
        // 新增的狀態追蹤
        this.isPostureDetectionActive = false;
        this.isWaterReminderActive = false;
        this.badPostureCount = 0; // 連續不良姿勢計數
        this.postureHistory = []; // 姿勢歷史記錄
        this.waterReminderInterval = 60; // 預設60分鐘
        
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

        // Water reminder buttons  
        document.getElementById('startWaterReminderBtn')?.addEventListener('click', () => {
            this.startWaterReminder();
        });

        document.getElementById('stopWaterReminderBtn')?.addEventListener('click', () => {
            this.stopWaterReminder();
        });

        // Water reminder interval setting
        document.getElementById('waterInterval')?.addEventListener('change', (e) => {
            this.waterReminderInterval = parseInt(e.target.value);
            this.saveSettings();
            if (this.isWaterReminderActive) {
                this.stopWaterReminder();
                this.startWaterReminder(); // 重新啟動以套用新間隔
            }
        });
    }

    // 新的姿勢檢測邏輯：每5秒檢查一次，連續4次不良姿勢發出警告
    async startPostureDetection() {
        if (!this.isPostureApiConnected) {
            this.showNotification('錯誤', 'API 未連線，無法啟動姿勢檢測');
            return;
        }

        try {
            // 啟動後端姿勢檢測
            const response = await fetch(`${this.postureApiUrl}/start_posture_test`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (response.ok) {
                this.isPostureDetectionActive = true;
                this.badPostureCount = 0;
                this.postureHistory = [];
                
                // 每5秒檢查一次姿勢
                this.postureTimer = setInterval(() => {
                    this.checkPostureAndAlert();
                }, 5000);

                document.getElementById('postureDetectionStatus').textContent = '檢測中...';
                document.getElementById('postureDetectionStatus').className = 'detection-status active';
                this.showNotification('姿勢檢測啟動', '開始監控您的坐姿，連續不良坐姿10秒將警告');
            } else {
                throw new Error('Failed to start posture detection');
            }
        } catch (error) {
            console.error('Error starting posture detection:', error);
            this.showNotification('錯誤', '無法啟動姿勢檢測');
        }
    }

    async stopPostureDetection() {
        if (this.postureTimer) {
            clearInterval(this.postureTimer);
            this.postureTimer = null;
        }

        this.isPostureDetectionActive = false;
        this.badPostureCount = 0;
        this.postureHistory = [];

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
                document.getElementById('postureDetectionStatus').textContent = '未檢測';
                document.getElementById('postureDetectionStatus').className = 'detection-status inactive';
                this.showNotification('姿勢檢測停止', '已停止監控您的坐姿');
            } else {
                throw new Error('Failed to stop posture detection');
            }
        } catch (error) {
            console.error('Error stopping posture detection:', error);
            this.showNotification('錯誤', '無法停止姿勢檢測');
        }
    }

    // 新的喝水提醒邏輯：每分鐘檢查一次API，根據時間間隔發通知
    async startWaterReminder() {
        if (!this.isPostureApiConnected) {
            this.showNotification('錯誤', 'API 未連線，無法啟動喝水提醒');
            return;
        }

        try {
            // 啟動後端喝水檢測
            const response = await fetch(`${this.postureApiUrl}/start_drinking_test`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (response.ok) {
                this.isWaterReminderActive = true;
                
                // 每分鐘檢查一次上次喝水時間
                this.waterTimer = setInterval(() => {
                    this.checkWaterAndRemind();
                }, 60000); // 每分鐘檢查

                document.getElementById('waterReminderStatus').textContent = '提醒中...';
                document.getElementById('waterReminderStatus').className = 'detection-status active';
                this.showNotification('喝水提醒啟動', `每分鐘檢查一次，超過${this.waterReminderInterval}分鐘未喝水將提醒您`);
            } else {
                throw new Error('Failed to start water reminder');
            }
        } catch (error) {
            console.error('Error starting water reminder:', error);
            this.showNotification('錯誤', '無法啟動喝水提醒');
        }
    }

    async stopWaterReminder() {
        if (this.waterTimer) {
            clearInterval(this.waterTimer);
            this.waterTimer = null;
        }

        this.isWaterReminderActive = false;

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
                document.getElementById('waterReminderStatus').textContent = '未提醒';
                document.getElementById('waterReminderStatus').className = 'detection-status inactive';
                this.showNotification('喝水提醒停止', '已停止喝水提醒');
            } else {
                throw new Error('Failed to stop water reminder');
            }
        } catch (error) {
            console.error('Error stopping water reminder:', error);
            this.showNotification('錯誤', '無法停止喝水提醒');
        }
    }

    // 檢查姿勢並在連續不良時發出警告
    async checkPostureAndAlert() {
        if (!this.isPostureApiConnected || !this.isPostureDetectionActive) {
            return;
        }

        try {
            const response = await fetch(`${this.postureApiUrl}/get_posture`);
            
            if (response.ok) {
                const data = await response.json();
                const postureStatus = data.posture;
                
                // 記錄姿勢歷史（保持最近10次記錄）
                this.postureHistory.push(postureStatus);
                if (this.postureHistory.length > 10) {
                    this.postureHistory.shift();
                }

                // 檢查連續不良姿勢 (支援多種不良姿勢狀態)
                const isBadPosture = (
                    postureStatus === 'bad' || 
                    postureStatus === 'poor' || 
                    postureStatus === 'incorrect' ||
                    postureStatus === 'Poor Posture' ||
                    postureStatus === 'Bad Posture' ||
                    postureStatus.toLowerCase().includes('poor') ||
                    postureStatus.toLowerCase().includes('bad')
                );
                
                console.log(`姿勢檢測: "${postureStatus}", 是否不良: ${isBadPosture}, 計數: ${this.badPostureCount}`);
                
                if (isBadPosture) {
                    this.badPostureCount++;
                    
                    // 連續2次不良姿勢時發出警告 (10秒)
                    if (this.badPostureCount >= 2) {
                        console.log('🚨 觸發姿勢警告！');
                        
                        // 使用多種方式確保用戶看到提醒
                        alert('🚨 姿勢警告！\n\n您已經連續保持不良坐姿超過10秒，請立即調整您的坐姿！\n\n建議：\n• 挺直背部，放鬆肩膀\n• 調整螢幕高度至眼部水平\n• 雙腳平放地面');
                        
                        // 額外的視覺提醒
                        this.showNotification('🚨 姿勢警告', '連續不良坐姿超過10秒，請立即調整！');
                        this.showInAppReminder('posture', '🚨 請立即調整您的坐姿！');
                        
                        this.badPostureCount = 0; // 重置計數器，避免重複警告
                    }
                } else {
                    // 姿勢正常時重置計數器
                    this.badPostureCount = 0;
                }

                // 更新狀態顯示
                document.getElementById('currentPostureStatus').textContent = postureStatus;
                document.getElementById('currentPostureStatus').className = `posture-status ${postureStatus}`;
                
            } else {
                throw new Error('Failed to get posture status');
            }
        } catch (error) {
            console.error('Error checking posture:', error);
        }
    }

    // 檢查喝水時間並發送提醒
    async checkWaterAndRemind() {
        if (!this.isPostureApiConnected || !this.isWaterReminderActive) {
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
                
                // 更新顯示
                const timeStr = drinkTime.toLocaleString('zh-TW');
                document.getElementById('lastDrinkTime').textContent = timeStr;
                
                // 如果超過設定的間隔時間，發送提醒
                if (minutesAgo >= this.waterReminderInterval) {
                    const messages = [
                        `您已經 ${minutesAgo} 分鐘沒有喝水了！記得補充水分哦`,
                        `該喝水了！距離上次喝水已經過了 ${minutesAgo} 分鐘`,
                        `身體需要水分！您已經 ${minutesAgo} 分鐘沒喝水了`,
                        `健康提醒：請補充水分，已經 ${minutesAgo} 分鐘沒喝水了`
                    ];
                    
                    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
                    this.showNotification('💧 喝水提醒', randomMessage);
                    
                    // 也顯示應用內提醒
                    this.showInAppReminder('water', randomMessage);
                }
                
            } else {
                throw new Error('Failed to get last drink time');
            }
        } catch (error) {
            console.error('Error checking water time:', error);
        }
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

    // 移除此方法，因為不再需要

    saveWaterData() {
        localStorage.setItem('daily-water-count', this.waterCount.toString());
        localStorage.setItem('last-water-date', this.lastWaterDate);
    }

    saveSettings() {
        const settings = {
            waterInterval: this.waterReminderInterval
        };
        localStorage.setItem('health-reminder-settings', JSON.stringify(settings));
    }

    loadSettings() {
        const settings = JSON.parse(localStorage.getItem('health-reminder-settings')) || {};
        
        if (settings.waterInterval) {
            this.waterReminderInterval = settings.waterInterval;
            if (document.getElementById('waterInterval')) {
                document.getElementById('waterInterval').value = settings.waterInterval;
            }
        }
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