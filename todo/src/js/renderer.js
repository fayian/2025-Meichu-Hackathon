// 應用程式狀態管理
class AppState {
  constructor() {
    this.focusTimer = {
      duration: 25 * 60, // 25分鐘
      remaining: 25 * 60,
      isRunning: false,
      mode: 'focus' // 'focus' | 'break'
    };
    
    this.tasks = [
      {
        id: 1,
        title: '完成黑客松 Demo 準備',
        priority: 'high',
        deadline: 'today 18:00',
        completed: false
      },
      {
        id: 2,
        title: 'UI/UX 設計優化',
        priority: 'medium',
        estimate: '2小時',
        completed: false
      },
      {
        id: 3,
        title: '功能測試與除錯',
        priority: 'low',
        deadline: '明天 10:00',
        completed: false
      }
    ];
    
    this.health = {
      workingTime: 4.5,
      breakCount: 3,
      efficiency: 87,
      weeklyAverage: 6.2,
      healthScore: 82
    };
    
    this.console = {
      knobs: {
        1: { name: '時間軸控制', value: '今日視圖' },
        2: { name: '專注強度', value: '深度專注' },
        3: { name: '健康設定', value: '標準提醒' }
      },
      status: 'focus',
      connected: true
    };
  }
}

// 全域應用程式狀態
const appState = new AppState();

// 初始化應用程式
async function initializeApp() {
  try {
    // 載入用戶資料
    const userData = await window.electronAPI.getUserData();
    if (userData.tasks) {
      appState.tasks = userData.tasks;
    }
    if (userData.health) {
      appState.health = { ...appState.health, ...userData.health };
    }
    
    console.log('應用程式初始化完成');
    updateUI();
    setupEventListeners();
    startTimers();
    
  } catch (error) {
    console.error('初始化錯誤:', error);
  }
}

// 更新 UI
function updateUI() {
  updateTimeDisplay();
  updateFocusTimer();
  updateTaskList();
  updateHealthMetrics();
  updateConsoleStatus();
  updateAIAssistant();
}

// 更新時間顯示
function updateTimeDisplay() {
  const now = new Date();
  const timeString = now.toLocaleTimeString('zh-TW', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  const dateString = now.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });
  
  const timeElement = document.getElementById('currentTime');
  if (timeElement) {
    timeElement.innerHTML = `${dateString}<br>${timeString}`;
  }
}

// 更新專注計時器
function updateFocusTimer() {
  const minutes = Math.floor(appState.focusTimer.remaining / 60);
  const seconds = appState.focusTimer.remaining % 60;
  
  const timerElement = document.querySelector('.timer-time');
  if (timerElement) {
    timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  
  // 更新圓形進度條
  const totalTime = appState.focusTimer.duration;
  const elapsed = totalTime - appState.focusTimer.remaining;
  const progress = (elapsed / totalTime) * 360;
  
  const timerCircle = document.querySelector('.timer-circle');
  if (timerCircle) {
    timerCircle.style.background = 
      `conic-gradient(#4ecdc4 0deg ${progress}deg, rgba(255,255,255,0.1) ${progress}deg)`;
  }
  
  // 更新計時器標籤
  const timerLabel = document.querySelector('.timer-label');
  if (timerLabel) {
    timerLabel.textContent = appState.focusTimer.mode === 'focus' ? '專注時間' : '休息時間';
  }
}

// 更新任務列表
function updateTaskList() {
  const taskContainer = document.querySelector('.task-overview');
  if (!taskContainer) return;
  
  // 保留標題，清空任務項目
  const title = taskContainer.querySelector('h3');
  taskContainer.innerHTML = '';
  if (title) {
    taskContainer.appendChild(title);
  } else {
    const newTitle = document.createElement('h3');
    newTitle.textContent = '📋 今日任務';
    newTitle.style.marginBottom = '15px';
    taskContainer.appendChild(newTitle);
  }
  
  appState.tasks.forEach(task => {
    const taskElement = createTaskElement(task);
    taskContainer.appendChild(taskElement);
  });
}

// 創建任務元素
function createTaskElement(task) {
  const taskElement = document.createElement('div');
  taskElement.className = 'task-item';
  taskElement.innerHTML = `
    <div class="task-priority priority-${task.priority}"></div>
    <div class="task-content">
      <div class="task-title">${task.title}</div>
      <div class="task-time">${task.deadline ? `截止：${task.deadline}` : `預計：${task.estimate || '未設定'}`}</div>
    </div>
  `;
  
  taskElement.addEventListener('click', () => {
    selectTask(task);
  });
  
  return taskElement;
}

// 更新健康指標
function updateHealthMetrics() {
  const updateMetric = (selector, value) => {
    const element = document.querySelector(selector);
    if (element) {
      element.textContent = value;
    }
  };
  
  updateMetric('.health-metric:nth-child(1) .metric-value', `${appState.health.workingTime} 小時`);
  updateMetric('.health-metric:nth-child(2) .metric-value', `${appState.health.breakCount} 次`);
  updateMetric('.health-metric:nth-child(3) .metric-value', `${appState.health.efficiency}%`);
  updateMetric('.health-section:last-child .health-metric:nth-child(1) .metric-value', `${appState.health.weeklyAverage} 小時`);
  updateMetric('.health-section:last-child .health-metric:nth-child(2) .metric-value', `${appState.health.healthScore} 分`);
}

// 更新控制台狀態
function updateConsoleStatus() {
  Object.keys(appState.console.knobs).forEach(knobId => {
    const knob = appState.console.knobs[knobId];
    const knobElement = document.querySelector(`.knob-control:nth-child(${parseInt(knobId) + 1}) .knob-value`);
    if (knobElement) {
      knobElement.textContent = knob.value;
    }
  });
  
  // 更新 LED 指示狀態
  const ledElement = document.querySelector('.led-indicator');
  if (ledElement) {
    ledElement.className = `led-indicator led-${appState.console.status}`;
  }
  
  const statusText = document.querySelector('.status-indicator span');
  if (statusText) {
    const statusTexts = {
      focus: '專注模式啟動中',
      break: '休息時間',
      idle: '待機中'
    };
    statusText.textContent = statusTexts[appState.console.status] || '待機中';
  }
}

// 更新 AI 助手
function updateAIAssistant() {
  const aiMessages = [
    '根據你的工作習慣分析，建議在接下來的25分鐘專注於「UI設計優化」任務。這是你創造力最佳的時段！',
    '檢測到你已經工作了2小時，建議休息10分鐘，做一些眼部運動。',
    '你的專注效率很棒！建議繼續保持這個工作節奏。',
    '根據當前時間分析，這是處理創意性任務的最佳時段。'
  ];
  
  const messageElement = document.querySelector('.ai-message');
  if (messageElement && Math.random() < 0.1) { // 10% 機率更新訊息
    const randomMessage = aiMessages[Math.floor(Math.random() * aiMessages.length)];
    messageElement.textContent = randomMessage;
  }
}

// 設置事件監聽器
function setupEventListeners() {
  // MX Console 事件監聽
  window.electronAPI.onMXConsoleKnob((data) => {
    handleKnobRotation(data);
  });
  
  window.electronAPI.onMXConsoleButton((data) => {
    handleButtonPress(data);
  });
  
  // 應用程式快捷鍵事件
  window.electronAPI.onQuickFocus(() => {
    toggleFocusMode();
  });
  
  window.electronAPI.onBreakReminder(() => {
    takeBreak();
  });
  
  window.electronAPI.onNewTask(() => {
    addQuickTask();
  });
  
  window.electronAPI.onStartFocus(() => {
    startFocusTimer();
  });
  
  window.electronAPI.onPauseFocus(() => {
    pauseFocusTimer();
  });
  
  window.electronAPI.onBreakTime(() => {
    takeBreak();
  });
  
  // UI 按鈕事件
  document.querySelectorAll('.action-btn').forEach(btn => {
    btn.addEventListener('click', handleActionButtonClick);
  });
  
  document.querySelectorAll('.suggestion-chip').forEach(chip => {
    chip.addEventListener('click', handleSuggestionChipClick);
  });
}

// 處理旋鈕旋轉
function handleKnobRotation(data) {
  console.log('旋鈕旋轉:', data);
  
  switch (data.knob) {
    case 1:
      // 時間軸控制
      const timeViews = ['今日視圖', '本週視圖', '本月視圖'];
      const currentIndex = timeViews.indexOf(appState.console.knobs[1].value);
      const newIndex = data.direction === 'clockwise' ? 
        Math.min(currentIndex + 1, timeViews.length - 1) : 
        Math.max(currentIndex - 1, 0);
      appState.console.knobs[1].value = timeViews[newIndex];
      break;
      
    case 2:
      // 專注強度
      const focusLevels = ['輕度專注', '中度專注', '深度專注'];
      const focusIndex = focusLevels.indexOf(appState.console.knobs[2].value);
      const newFocusIndex = data.direction === 'clockwise' ? 
        Math.min(focusIndex + 1, focusLevels.length - 1) : 
        Math.max(focusIndex - 1, 0);
      appState.console.knobs[2].value = focusLevels[newFocusIndex];
      break;
      
    case 3:
      // 健康設定
      const healthSettings = ['低頻提醒', '標準提醒', '高頻提醒'];
      const healthIndex = healthSettings.indexOf(appState.console.knobs[3].value);
      const newHealthIndex = data.direction === 'clockwise' ? 
        Math.min(healthIndex + 1, healthSettings.length - 1) : 
        Math.max(healthIndex - 1, 0);
      appState.console.knobs[3].value = healthSettings[newHealthIndex];
      break;
  }
  
  updateConsoleStatus();
  showNotification(`旋鈕 ${data.knob}: ${appState.console.knobs[data.knob].value}`, 'info');
}

// 處理按鈕按下
function handleButtonPress(data) {
  console.log('按鈕按下:', data);
  
  switch (data.button) {
    case 1:
      startFocusTimer();
      break;
    case 2:
      pauseFocusTimer();
      break;
    case 3:
      takeBreak();
      break;
    case 4:
      showAddTaskModal();
      break;
    case 5:
      showStatistics();
      break;
    case 6:
      showSettings();
      break;
  }
}

// 處理動作按鈕點擊
function handleActionButtonClick(event) {
  const btn = event.currentTarget;
  const btnId = btn.id;
  
  switch (btnId) {
    case 'startFocusBtn':
      startFocusTimer();
      break;
    case 'pauseFocusBtn':
      pauseFocusTimer();
      break;
    case 'resetFocusBtn':
      resetFocusTimer();
      break;
    case 'addTaskBtn':
      showAddTaskModal();
      break;
  }
}

// 處理建議晶片點擊
function handleSuggestionChipClick(event) {
  const chip = event.currentTarget;
  const suggestion = chip.querySelector('span').textContent;
  
  switch (suggestion) {
    case '優化工作節奏':
      showWorkRhythmTips();
      break;
    case '眼部休息提醒':
      startEyeRestReminder();
      break;
    case '水分補充':
      showHydrationReminder();
      break;
  }
}

// 專注計時器控制
function startFocusTimer() {
  if (!appState.focusTimer.isRunning) {
    appState.focusTimer.isRunning = true;
    appState.console.status = 'focus';
    
    const startBtn = document.getElementById('startFocusBtn');
    if (startBtn) {
      startBtn.innerHTML = '<i class="fas fa-pause"></i>';
    }
    
    updateConsoleStatus();
    showNotification('專注模式已開始！', 'success');
    
    // 播放開始音效（如果有的話）
    playSound('start');
  } else {
    pauseFocusTimer();
  }
}

function pauseFocusTimer() {
  appState.focusTimer.isRunning = false;
  appState.console.status = 'idle';
  
  const startBtn = document.getElementById('startFocusBtn');
  if (startBtn) {
    startBtn.innerHTML = '<i class="fas fa-play"></i>';
  }
  
  updateConsoleStatus();
  showNotification('專注模式已暫停', 'warning');
  
  // 播放暫停音效
  playSound('pause');
}

function resetFocusTimer() {
  appState.focusTimer.isRunning = false;
  appState.focusTimer.remaining = appState.focusTimer.duration;
  appState.console.status = 'idle';
  
  const startBtn = document.getElementById('startFocusBtn');
  if (startBtn) {
    startBtn.innerHTML = '<i class="fas fa-play"></i>';
  }
  
  updateFocusTimer();
  updateConsoleStatus();
  showNotification('計時器已重設', 'info');
}

function takeBreak() {
  appState.focusTimer.mode = 'break';
  appState.focusTimer.duration = 5 * 60; // 5分鐘休息
  appState.focusTimer.remaining = 5 * 60;
  appState.focusTimer.isRunning = true;
  appState.console.status = 'break';
  
  updateFocusTimer();
  updateConsoleStatus();
  showNotification('休息時間開始！記得放鬆眼睛', 'success');
}

// 任務管理
function selectTask(task) {
  // 高亮選中的任務
  document.querySelectorAll('.task-item').forEach(item => {
    item.classList.remove('selected');
  });
  
  event.currentTarget.classList.add('selected');
  showNotification(`已選擇任務：${task.title}`, 'info');
}

function showAddTaskModal() {
  const modalOverlay = document.getElementById('modalOverlay');
  if (modalOverlay) {
    modalOverlay.classList.add('active');
    
    // 清空表單
    document.getElementById('taskTitle').value = '';
    document.getElementById('taskPriority').value = 'medium';
    document.getElementById('taskDeadline').value = '';
    document.getElementById('taskEstimate').value = '';
    
    // 聚焦標題輸入框
    setTimeout(() => {
      document.getElementById('taskTitle').focus();
    }, 300);
  }
}

function hideAddTaskModal() {
  const modalOverlay = document.getElementById('modalOverlay');
  if (modalOverlay) {
    modalOverlay.classList.remove('active');
  }
}

// Audio Settings Modal Functions
function showAudioSettingsModal() {
  const modalOverlay = document.getElementById('modalOverlay');
  const audioModal = document.getElementById('audioSettingsModal');
  const audioModalBody = document.getElementById('audioModalBody');
  
  if (modalOverlay && audioModal && audioModalBody) {
    // Hide other modals
    document.querySelectorAll('.modal').forEach(modal => {
      modal.style.display = 'none';
    });
    
    // Show audio settings modal
    audioModal.style.display = 'block';
    modalOverlay.classList.add('active');
    
    // Initialize audio settings if available
    if (window.audioSettings) {
      const settingsPanel = window.audioSettings.createSettingsUI();
      audioModalBody.innerHTML = '';
      audioModalBody.appendChild(settingsPanel);
      
      // Add test buttons
      const testSection = document.createElement('div');
      testSection.className = 'test-section';
      testSection.innerHTML = `
        <div class="settings-section">
          <h3><i class="fas fa-play-circle"></i> 音效測試</h3>
          <div class="test-buttons">
            <button class="btn primary test-btn" onclick="testAudioInModal('complete')">
              <i class="fas fa-bell"></i> 測試完成音效
            </button>
            <button class="btn secondary test-btn" onclick="testAudioInModal('start')">
              <i class="fas fa-play"></i> 測試開始音效
            </button>
            <button class="btn secondary test-btn" onclick="testAudioInModal('pause')">
              <i class="fas fa-pause"></i> 測試暫停音效
            </button>
          </div>
        </div>
      `;
      audioModalBody.appendChild(testSection);
    } else {
      audioModalBody.innerHTML = `
        <div class="loading-message">
          <i class="fas fa-spinner fa-spin"></i>
          <p>載入音效設定中...</p>
        </div>
      `;
    }
  }
}

function hideAudioSettingsModal() {
  const modalOverlay = document.getElementById('modalOverlay');
  const audioModal = document.getElementById('audioSettingsModal');
  
  if (modalOverlay && audioModal) {
    audioModal.style.display = 'none';
    modalOverlay.classList.remove('active');
  }
}

// Help Modal Functions
function showHelpModal() {
  const modalOverlay = document.getElementById('modalOverlay');
  const helpModal = document.getElementById('helpModal');
  
  if (modalOverlay && helpModal) {
    // Hide other modals
    document.querySelectorAll('.modal').forEach(modal => {
      modal.style.display = 'none';
    });
    
    // Show help modal
    helpModal.style.display = 'block';
    modalOverlay.classList.add('active');
  }
}

function hideHelpModal() {
  const modalOverlay = document.getElementById('modalOverlay');
  const helpModal = document.getElementById('helpModal');
  
  if (modalOverlay && helpModal) {
    helpModal.style.display = 'none';
    modalOverlay.classList.remove('active');
  }
}

// Test audio function for modal
function testAudioInModal(type) {
  if (window.playSound) {
    playSound(type);
    showNotification(`測試 ${type} 音效`, 'info');
  }
}

// Make it globally accessible
window.testAudioInModal = testAudioInModal;

function addQuickTask() {
  const newTask = {
    id: Date.now(),
    title: '快速新增的任務',
    priority: 'medium',
    deadline: 'today',
    completed: false
  };
  
  appState.tasks.push(newTask);
  updateTaskList();
  saveUserData();
  showNotification('已新增快速任務', 'success');
}

function saveTask() {
  const title = document.getElementById('taskTitle').value.trim();
  const priority = document.getElementById('taskPriority').value;
  const deadline = document.getElementById('taskDeadline').value;
  const estimate = document.getElementById('taskEstimate').value.trim();
  
  if (!title) {
    showNotification('請輸入任務標題', 'error');
    return;
  }
  
  const newTask = {
    id: Date.now(),
    title,
    priority,
    deadline: deadline || '未設定',
    estimate: estimate || '未設定',
    completed: false
  };
  
  appState.tasks.push(newTask);
  updateTaskList();
  updateTaskStats();
  saveUserData();
  hideAddTaskModal();
  showNotification('任務已新增', 'success');
}

function updateTaskStats() {
  const completed = appState.tasks.filter(task => task.completed).length;
  const total = appState.tasks.length;
  const productivity = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  const completedElement = document.getElementById('completedTasks');
  const totalElement = document.getElementById('totalTasks');
  const productivityElement = document.getElementById('productivity');
  
  if (completedElement) completedElement.textContent = completed;
  if (totalElement) totalElement.textContent = total;
  if (productivityElement) productivityElement.textContent = `${productivity}%`;
}

// 通知系統
function showNotification(message, type = 'info') {
  const notificationArea = document.getElementById('notificationArea');
  if (!notificationArea) return;
  
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <i class="fas fa-${getNotificationIcon(type)}"></i>
      <span>${message}</span>
    </div>
    <button class="notification-close">
      <i class="fas fa-times"></i>
    </button>
  `;
  
  notificationArea.appendChild(notification);
  
  // 自動關閉
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-in';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 5000);
  
  // 手動關閉
  const closeBtn = notification.querySelector('.notification-close');
  closeBtn.addEventListener('click', () => {
    notification.style.animation = 'slideOut 0.3s ease-in';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  });
}

function getNotificationIcon(type) {
  const icons = {
    success: 'check-circle',
    warning: 'exclamation-triangle',
    error: 'times-circle',
    info: 'info-circle'
  };
  return icons[type] || 'info-circle';
}

// 資料持久化
async function saveUserData() {
  try {
    const userData = {
      tasks: appState.tasks,
      health: appState.health,
      focusTimer: {
        duration: appState.focusTimer.duration,
        mode: appState.focusTimer.mode
      }
    };
    
    await window.electronAPI.saveUserData(userData);
  } catch (error) {
    console.error('儲存資料失敗:', error);
    showNotification('資料儲存失敗', 'error');
  }
}

// AI 助手功能
function showWorkRhythmTips() {
  const tips = [
    '建議採用25分鐘專注 + 5分鐘休息的番茄工作法',
    '每2小時進行一次較長的15分鐘休息',
    '在上午9-11點處理最重要的創意性工作',
    '下午1-3點適合處理例行性任務'
  ];
  
  const randomTip = tips[Math.floor(Math.random() * tips.length)];
  showNotification(randomTip, 'info');
}

function startEyeRestReminder() {
  showNotification('眼部休息提醒已啟動，每20分鐘提醒一次', 'success');
  
  // 設置提醒間隔
  setInterval(() => {
    if (appState.focusTimer.isRunning) {
      showNotification('該休息眼睛了！看看20呎外的物體20秒', 'warning');
    }
  }, 20 * 60 * 1000); // 20分鐘
}

function showHydrationReminder() {
  showNotification('記得多喝水！建議每小時喝200ml水', 'info');
  
  // 設置提醒間隔
  setInterval(() => {
    showNotification('💧 該喝水了！', 'info');
  }, 60 * 60 * 1000); // 1小時
}

function showStatistics() {
  // 這裡可以展開更詳細的統計視圖
  showNotification('統計功能開發中...', 'info');
}

function showSettings() {
  // 這裡可以展開設定面板
  showNotification('設定功能開發中...', 'info');
}

// 音效播放
function playSound(type) {
  // 檢查音效設定
  if (window.audioSettings && !window.audioSettings.isEnabled(type)) {
    console.log(`音效已停用: ${type}`);
    return;
  }
  
  try {
    // 使用 Web Audio API 生成音效
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // 獲取音量設定
    const volume = window.audioSettings ? window.audioSettings.getVolume() : 0.1;
    
    // 根據音效類型設置不同的頻率和音調
    let frequency, duration, pattern;
    
    switch(type) {
      case 'complete':
        // 番茄鐘完成 - 三聲長音
        frequency = 800;
        duration = 0.5;
        pattern = [0, 0.6, 1.2]; // 三聲音效的時間間隔
        break;
      case 'start':
        // 開始音效 - 短促的上升音
        frequency = 600;
        duration = 0.3;
        pattern = [0];
        break;
      case 'pause':
        // 暫停音效 - 下降音
        frequency = 400;
        duration = 0.2;
        pattern = [0];
        break;
      default:
        frequency = 500;
        duration = 0.2;
        pattern = [0];
    }
    
    // 播放音效模式
    pattern.forEach((delay, index) => {
      setTimeout(() => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        
        osc.connect(gain);
        gain.connect(audioContext.destination);
        
        osc.frequency.setValueAtTime(frequency, audioContext.currentTime);
        gain.gain.setValueAtTime(0, audioContext.currentTime);
        gain.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.01);
        gain.gain.linearRampToValueAtTime(0, audioContext.currentTime + duration);
        
        osc.start(audioContext.currentTime);
        osc.stop(audioContext.currentTime + duration);
      }, delay * 1000);
    });
    
    console.log(`播放音效: ${type} (音量: ${Math.round(volume * 100)}%)`);
  } catch (error) {
    console.error('播放音效失敗:', error);
    // 降級到系統提示音
    if (type === 'complete') {
      // 對於完成提醒，嘗試使用瀏覽器原生提示
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('🍅 番茄鐘完成！', {
          body: '恭喜完成一個專注時段！',
          icon: '/favicon.ico'
        });
      }
    }
  }
}

// 健康指標圖表
function initHealthChart() {
  const canvas = document.getElementById('healthChart');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  
  // 清空畫布
  ctx.clearRect(0, 0, width, height);
  
  // 模擬一週的健康數據
  const data = [75, 80, 85, 82, 88, 84, 82];
  const days = ['週一', '週二', '週三', '週四', '週五', '週六', '週日'];
  
  // 設置樣式
  ctx.strokeStyle = '#4ecdc4';
  ctx.fillStyle = 'rgba(78, 205, 196, 0.1)';
  ctx.lineWidth = 2;
  
  // 繪製折線圖
  ctx.beginPath();
  data.forEach((value, index) => {
    const x = (index / (data.length - 1)) * (width - 40) + 20;
    const y = height - 20 - ((value - 70) / 30) * (height - 40);
    
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.stroke();
  
  // 填充區域
  ctx.lineTo(width - 20, height - 20);
  ctx.lineTo(20, height - 20);
  ctx.closePath();
  ctx.fill();
}

// 定時器
function startTimers() {
  // 更新時間顯示
  setInterval(updateTimeDisplay, 1000);
  
  // 專注計時器
  setInterval(() => {
    if (appState.focusTimer.isRunning && appState.focusTimer.remaining > 0) {
      appState.focusTimer.remaining--;
      updateFocusTimer();
      
      // 計時結束
      if (appState.focusTimer.remaining === 0) {
        handleTimerComplete();
      }
    }
  }, 1000);
  
  // AI 訊息更新
  setInterval(updateAIAssistant, 30000); // 30秒更新一次
  
  // 健康指標更新
  setInterval(() => {
    // 模擬健康數據變化
    if (appState.focusTimer.isRunning) {
      appState.health.workingTime += 1/3600; // 每秒增加
    }
    updateHealthMetrics();
    initHealthChart();
  }, 60000); // 1分鐘更新一次
}

function handleTimerComplete() {
  appState.focusTimer.isRunning = false;
  
  // 播放提醒音效
  playSound('complete');
  
  // 顯示完成通知模態框
  showTimerCompleteModal();
  
  if (appState.focusTimer.mode === 'focus') {
    // 專注時間結束
    appState.health.efficiency = Math.min(appState.health.efficiency + 1, 100);
  }
  
  updateFocusTimer();
  updateConsoleStatus();
  saveUserData();
}

// 顯示計時器完成的通知模態框
function showTimerCompleteModal() {
  const mode = appState.focusTimer.mode;
  const isBreakTime = mode === 'focus';
  
  const title = isBreakTime ? '🍅 專注時間完成！' : '☕ 休息時間結束！';
  const message = isBreakTime ? 
    '恭喜完成一個番茄鐘！現在該休息一下了。' : 
    '休息時間結束，準備開始新的專注時段！';
  
  const modalHTML = `
    <div class="timer-complete-modal">
      <div class="modal-content">
        <div class="timer-complete-header">
          <h2>${title}</h2>
          <div class="completion-animation">
            <i class="fas fa-check-circle"></i>
          </div>
        </div>
        <div class="timer-complete-body">
          <p>${message}</p>
          <div class="timer-stats">
            <div class="stat">
              <span class="stat-label">本次專注時長</span>
              <span class="stat-value">${Math.floor(appState.focusTimer.duration / 60)} 分鐘</span>
            </div>
            <div class="stat">
              <span class="stat-label">今日完成番茄鐘</span>
              <span class="stat-value">${getCompletedPomodorosToday()} 個</span>
            </div>
          </div>
        </div>
        <div class="timer-complete-actions">
          <button class="btn secondary" id="dismissTimer">關閉計時器</button>
          ${isBreakTime ? 
            '<button class="btn primary" id="startBreak">開始休息</button>' : 
            '<button class="btn primary" id="startNextFocus">開始專注</button>'
          }
        </div>
      </div>
    </div>
  `;
  
  // 創建並顯示模態框
  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'timer-complete-overlay';
  modalOverlay.innerHTML = modalHTML;
  document.body.appendChild(modalOverlay);
  
  // 添加動畫類
  setTimeout(() => {
    modalOverlay.classList.add('show');
  }, 10);
  
  // 綁定事件
  const dismissBtn = modalOverlay.querySelector('#dismissTimer');
  const actionBtn = modalOverlay.querySelector(isBreakTime ? '#startBreak' : '#startNextFocus');
  
  dismissBtn.addEventListener('click', () => {
    closeTimerCompleteModal(modalOverlay);
    resetFocusTimer();
  });
  
  actionBtn.addEventListener('click', () => {
    closeTimerCompleteModal(modalOverlay);
    if (isBreakTime) {
      takeBreak();
    } else {
      // 開始新的專注時段
      appState.focusTimer.mode = 'focus';
      appState.focusTimer.duration = 25 * 60;
      appState.focusTimer.remaining = 25 * 60;
      appState.console.status = 'idle';
      updateFocusTimer();
      startFocusTimer();
    }
  });
  
  // 點擊背景關閉
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      closeTimerCompleteModal(modalOverlay);
      resetFocusTimer();
    }
  });
}

// 關閉計時器完成模態框
function closeTimerCompleteModal(modalOverlay) {
  modalOverlay.classList.remove('show');
  setTimeout(() => {
    document.body.removeChild(modalOverlay);
  }, 300);
}

// 獲取今日完成的番茄鐘數量
function getCompletedPomodorosToday() {
  // 這裡可以從本地存儲或應用狀態中獲取實際數據
  return Math.floor(appState.health.workingTime / 0.42) || 1; // 假設每個番茄鐘25分鐘
}

// 快捷鍵功能
function toggleFocusMode() {
  if (appState.focusTimer.isRunning) {
    pauseFocusTimer();
  } else {
    startFocusTimer();
  }
}

// 初始化模態框事件
function initModalEvents() {
  const modalOverlay = document.getElementById('modalOverlay');
  const closeModal = document.getElementById('closeModal');
  const cancelTask = document.getElementById('cancelTask');
  const saveTaskBtn = document.getElementById('saveTask');
  
  if (closeModal) {
    closeModal.addEventListener('click', hideAddTaskModal);
  }
  
  if (cancelTask) {
    cancelTask.addEventListener('click', hideAddTaskModal);
  }
  
  if (saveTaskBtn) {
    saveTaskBtn.addEventListener('click', saveTask);
  }
  
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        hideAddTaskModal();
      }
    });
  }
  
  // 表單提交事件
  const taskForm = document.getElementById('taskForm');
  if (taskForm) {
    taskForm.addEventListener('submit', (e) => {
      e.preventDefault();
      saveTask();
    });
  }

  // Audio Settings Modal Events
  const audioSettingsBtn = document.getElementById('audioSettingsBtn');
  const closeAudioModal = document.getElementById('closeAudioModal');
  
  if (audioSettingsBtn) {
    audioSettingsBtn.addEventListener('click', showAudioSettingsModal);
  }
  
  if (closeAudioModal) {
    closeAudioModal.addEventListener('click', hideAudioSettingsModal);
  }

  // Help Modal Events
  const helpBtn = document.getElementById('helpBtn');
  const closeHelpModal = document.getElementById('closeHelpModal');
  
  if (helpBtn) {
    helpBtn.addEventListener('click', showHelpModal);
  }
  
  if (closeHelpModal) {
    closeHelpModal.addEventListener('click', hideHelpModal);
  }
}

// 預設時間按鈕事件
function initTimerPresets() {
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const duration = parseInt(e.target.dataset.duration);
      
      // 更新按鈕狀態
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      
      // 更新計時器
      appState.focusTimer.duration = duration * 60;
      appState.focusTimer.remaining = duration * 60;
      
      if (!appState.focusTimer.isRunning) {
        updateFocusTimer();
      }
      
      showNotification(`計時器設定為 ${duration} 分鐘`, 'info');
    });
  });
}

// 控制台按鈕事件
function initConsoleButtons() {
  document.querySelectorAll('.console-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const buttonNum = parseInt(e.currentTarget.dataset.button);
      handleButtonPress({ button: buttonNum, action: 'press' });
    });
  });
}

// 請求瀏覽器通知權限
function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        console.log('瀏覽器通知權限已獲得');
        showNotification('瀏覽器通知已啟用，計時完成時會收到提醒', 'success');
      } else {
        console.log('瀏覽器通知權限被拒絕');
      }
    });
  }
}

// 鍵盤快捷鍵支援
function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // 檢查是否在輸入框中，如果是則不處理快捷鍵
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.contentEditable === 'true') {
      return;
    }

    // 處理快捷鍵
    switch(e.key.toLowerCase()) {
      case ' ': // 空白鍵 - 開始/暫停計時器
        e.preventDefault();
        toggleFocusMode();
        showNotification('使用空白鍵切換計時器狀態', 'info');
        break;
      
      case 'r': // R 鍵 - 重設計時器
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          resetFocusTimer();
          showNotification('使用 Ctrl+R 重設計時器', 'info');
        }
        break;
      
      case 'b': // B 鍵 - 開始休息
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          takeBreak();
          showNotification('使用 Ctrl+B 開始休息', 'info');
        }
        break;
      
      case 'n': // N 鍵 - 新增任務
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          const addTaskBtn = document.getElementById('addTaskBtn');
          if (addTaskBtn) {
            addTaskBtn.click();
            showNotification('使用 Ctrl+N 新增任務', 'info');
          }
        }
        break;
      
      case 'escape': // ESC 鍵 - 關閉模態框
        const modals = document.querySelectorAll('.timer-complete-overlay, .modal-overlay');
        modals.forEach(modal => {
          if (modal.classList.contains('show') || modal.style.display !== 'none') {
            modal.style.display = 'none';
            if (modal.classList.contains('timer-complete-overlay')) {
              resetFocusTimer();
            }
          }
        });
        break;
      
      case '?': // ? 鍵 - 顯示快捷鍵說明
        if (e.shiftKey) {
          e.preventDefault();
          showHelpModal();
        }
        break;
    }
  });
}

// 顯示快捷鍵說明
function showKeyboardShortcutsHelp() {
  const helpMessage = `
    🚀 快捷鍵說明：
    
    空白鍵 - 開始/暫停計時器
    Ctrl+R - 重設計時器  
    Ctrl+B - 開始休息
    Ctrl+N - 新增任務
    ESC - 關閉對話框
    Shift+? - 顯示此說明
  `;
  
  alert(helpMessage.trim());
}

// DOM 載入完成後初始化
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM 載入完成，開始初始化應用程式...');
  
  // 初始化各種事件監聽器
  initModalEvents();
  initTimerPresets();
  initConsoleButtons();
  initKeyboardShortcuts();
  
  // 初始化應用程式
  initializeApp();
  
  // 請求通知權限
  setTimeout(requestNotificationPermission, 3000);
});

// 視窗載入完成後的額外初始化
window.addEventListener('load', () => {
  console.log('視窗載入完成');
  
  // 初始化圖表
  setTimeout(() => {
    initHealthChart();
  }, 1000);
  
  // 顯示歡迎訊息
  setTimeout(() => {
    showNotification('歡迎使用 MX Creative Console Assistant！', 'success');
  }, 2000);
});        