// Enhanced features and utilities for MX Creative Console Assistant

// Performance monitoring
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      frameRate: 0,
      renderTime: 0,
      memoryUsage: 0
    };
    this.frameCount = 0;
    this.lastTime = performance.now();
  }

  startFrame() {
    this.frameStart = performance.now();
  }

  endFrame() {
    const now = performance.now();
    this.frameCount++;
    this.metrics.renderTime = now - this.frameStart;

    // Calculate FPS every second
    if (now - this.lastTime >= 1000) {
      this.metrics.frameRate = Math.round((this.frameCount * 1000) / (now - this.lastTime));
      this.frameCount = 0;
      this.lastTime = now;
    }

    // Memory usage (if available)
    if (performance.memory) {
      this.metrics.memoryUsage = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
    }
  }

  getMetrics() {
    return { ...this.metrics };
  }
}

// Global performance monitor instance
const performanceMonitor = new PerformanceMonitor();

// Enhanced notification system
class NotificationManager {
  constructor() {
    this.notifications = [];
    this.maxNotifications = 5;
  }

  show(message, type = 'info', duration = 5000, actions = []) {
    const notification = {
      id: Date.now() + Math.random(),
      message,
      type,
      duration,
      actions,
      timestamp: Date.now()
    };

    this.notifications.push(notification);
    this.render();

    // Auto remove
    if (duration > 0) {
      setTimeout(() => {
        this.remove(notification.id);
      }, duration);
    }

    return notification.id;
  }

  remove(id) {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.render();
  }

  clear() {
    this.notifications = [];
    this.render();
  }

  render() {
    const container = document.getElementById('notificationArea');
    if (!container) return;

    // Keep only the latest notifications
    if (this.notifications.length > this.maxNotifications) {
      this.notifications = this.notifications.slice(-this.maxNotifications);
    }

    container.innerHTML = '';

    this.notifications.forEach((notification, index) => {
      const element = this.createNotificationElement(notification, index);
      container.appendChild(element);
    });
  }

  createNotificationElement(notification, index) {
    const element = document.createElement('div');
    element.className = `notification ${notification.type} slide-in-right`;
    element.style.animationDelay = `${index * 0.1}s`;

    element.innerHTML = `
      <div class="notification-content">
        <i class="fas fa-${this.getIcon(notification.type)}"></i>
        <span>${notification.message}</span>
      </div>
      <div class="notification-actions">
        ${notification.actions.map(action => `
          <button class="notification-action" data-action="${action.id}">
            ${action.label}
          </button>
        `).join('')}
        <button class="notification-close">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;

    // Add event listeners
    const closeBtn = element.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
      this.remove(notification.id);
    });

    const actionBtns = element.querySelectorAll('.notification-action');
    actionBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const actionId = e.target.dataset.action;
        const action = notification.actions.find(a => a.id === actionId);
        if (action && action.callback) {
          action.callback();
        }
        this.remove(notification.id);
      });
    });

    return element;
  }

  getIcon(type) {
    const icons = {
      success: 'check-circle',
      warning: 'exclamation-triangle',
      error: 'times-circle',
      info: 'info-circle'
    };
    return icons[type] || 'info-circle';
  }
}

// Global notification manager
const notificationManager = new NotificationManager();

// Particle system for celebrations
class ParticleSystem {
  constructor() {
    this.particles = [];
    this.canvas = null;
    this.ctx = null;
    this.isRunning = false;
  }

  init() {
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.canvas.style.position = 'fixed';
      this.canvas.style.top = '0';
      this.canvas.style.left = '0';
      this.canvas.style.width = '100%';
      this.canvas.style.height = '100%';
      this.canvas.style.pointerEvents = 'none';
      this.canvas.style.zIndex = '9999';
      document.body.appendChild(this.canvas);

      this.ctx = this.canvas.getContext('2d');
      this.resize();

      window.addEventListener('resize', () => this.resize());
    }
  }

  resize() {
    if (this.canvas) {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    }
  }

  createParticle(x, y, color = '#4ecdc4') {
    return {
      x,
      y,
      vx: (Math.random() - 0.5) * 10,
      vy: (Math.random() - 0.5) * 10 - 5,
      life: 1.0,
      decay: Math.random() * 0.02 + 0.01,
      size: Math.random() * 6 + 2,
      color
    };
  }

  burst(x, y, count = 20, color = '#4ecdc4') {
    this.init();
    
    for (let i = 0; i < count; i++) {
      this.particles.push(this.createParticle(x, y, color));
    }

    if (!this.isRunning) {
      this.start();
    }
  }

  start() {
    this.isRunning = true;
    this.animate();
  }

  animate() {
    if (!this.isRunning || !this.ctx) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.particles = this.particles.filter(particle => {
      // Update particle
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += 0.3; // gravity
      particle.life -= particle.decay;

      // Draw particle
      this.ctx.save();
      this.ctx.globalAlpha = particle.life;
      this.ctx.fillStyle = particle.color;
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();

      return particle.life > 0;
    });

    if (this.particles.length > 0) {
      requestAnimationFrame(() => this.animate());
    } else {
      this.isRunning = false;
      if (this.canvas && this.canvas.parentNode) {
        this.canvas.parentNode.removeChild(this.canvas);
        this.canvas = null;
      }
    }
  }
}

// Global particle system
const particleSystem = new ParticleSystem();

// Enhanced task management
class TaskManager {
  constructor() {
    this.tasks = [];
    this.filters = {
      priority: 'all',
      status: 'all',
      search: ''
    };
    this.sortBy = 'created';
    this.sortOrder = 'desc';
  }

  addTask(taskData) {
    const task = {
      id: Date.now() + Math.random(),
      title: taskData.title,
      description: taskData.description || '',
      priority: taskData.priority || 'medium',
      deadline: taskData.deadline,
      estimate: taskData.estimate,
      tags: taskData.tags || [],
      completed: false,
      created: Date.now(),
      updated: Date.now()
    };

    this.tasks.push(task);
    this.saveTasks();
    this.renderTasks();
    
    // Celebration for first task
    if (this.tasks.length === 1) {
      this.celebrateFirstTask();
    }

    return task;
  }

  updateTask(id, updates) {
    const taskIndex = this.tasks.findIndex(t => t.id === id);
    if (taskIndex !== -1) {
      this.tasks[taskIndex] = {
        ...this.tasks[taskIndex],
        ...updates,
        updated: Date.now()
      };
      
      // Celebration for completion
      if (updates.completed && !this.tasks[taskIndex].completed) {
        this.celebrateTaskCompletion(this.tasks[taskIndex]);
      }
      
      this.saveTasks();
      this.renderTasks();
      return this.tasks[taskIndex];
    }
    return null;
  }

  deleteTask(id) {
    this.tasks = this.tasks.filter(t => t.id !== id);
    this.saveTasks();
    this.renderTasks();
  }

  getFilteredTasks() {
    let filtered = [...this.tasks];

    // Apply filters
    if (this.filters.priority !== 'all') {
      filtered = filtered.filter(t => t.priority === this.filters.priority);
    }

    if (this.filters.status !== 'all') {
      if (this.filters.status === 'completed') {
        filtered = filtered.filter(t => t.completed);
      } else if (this.filters.status === 'pending') {
        filtered = filtered.filter(t => !t.completed);
      }
    }

    if (this.filters.search) {
      const search = this.filters.search.toLowerCase();
      filtered = filtered.filter(t => 
        t.title.toLowerCase().includes(search) ||
        t.description.toLowerCase().includes(search) ||
        t.tags.some(tag => tag.toLowerCase().includes(search))
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal, bVal;

      switch (this.sortBy) {
        case 'title':
          aVal = a.title.toLowerCase();
          bVal = b.title.toLowerCase();
          break;
        case 'priority':
          const priorityOrder = { low: 1, medium: 2, high: 3 };
          aVal = priorityOrder[a.priority];
          bVal = priorityOrder[b.priority];
          break;
        case 'deadline':
          aVal = new Date(a.deadline || '9999-12-31');
          bVal = new Date(b.deadline || '9999-12-31');
          break;
        default:
          aVal = a[this.sortBy];
          bVal = b[this.sortBy];
      }

      if (aVal < bVal) return this.sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return this.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }

  celebrateFirstTask() {
    const rect = document.querySelector('.task-section').getBoundingClientRect();
    particleSystem.burst(rect.left + rect.width / 2, rect.top + rect.height / 2, 30, '#4ecdc4');
    
    notificationManager.show(
      '🎉 恭喜！你已經建立了第一個任務',
      'success',
      8000,
      [{
        id: 'tips',
        label: '查看使用技巧',
        callback: () => this.showTaskTips()
      }]
    );
  }

  celebrateTaskCompletion(task) {
    const taskElement = document.querySelector(`[data-task-id="${task.id}"]`);
    if (taskElement) {
      const rect = taskElement.getBoundingClientRect();
      particleSystem.burst(rect.left + rect.width / 2, rect.top + rect.height / 2, 15, '#4ecdc4');
    }

    notificationManager.show(
      `✅ 任務完成：${task.title}`,
      'success',
      5000
    );
  }

  showTaskTips() {
    const tips = [
      '💡 使用優先級標示重要任務',
      '⏰ 設定截止時間來保持進度',
      '🏷️ 使用標籤來組織任務',
      '📊 查看統計了解工作習慣'
    ];

    tips.forEach((tip, index) => {
      setTimeout(() => {
        notificationManager.show(tip, 'info', 4000);
      }, index * 1000);
    });
  }

  saveTasks() {
    // This would integrate with the electron store in a real app
    if (typeof window !== 'undefined' && window.electronAPI) {
      const userData = { tasks: this.tasks };
      window.electronAPI.saveUserData(userData);
    }
  }

  renderTasks() {
    const container = document.querySelector('.task-overview');
    if (!container) return;

    const tasks = this.getFilteredTasks();
    
    // Keep title
    const existingTitle = container.querySelector('h3');
    container.innerHTML = '';
    
    if (existingTitle) {
      container.appendChild(existingTitle);
    }

    if (tasks.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.className = 'empty-state';
      emptyState.innerHTML = `
        <i class="fas fa-tasks"></i>
        <p>沒有找到任務</p>
        <button class="btn primary" onclick="taskManager.showAddTaskDialog()">
          新增第一個任務
        </button>
      `;
      container.appendChild(emptyState);
      return;
    }

    tasks.forEach((task, index) => {
      const taskElement = this.createTaskElement(task, index);
      container.appendChild(taskElement);
    });

    // Update stats
    this.updateStats();
  }

  createTaskElement(task, index) {
    const element = document.createElement('div');
    element.className = `task-item fade-in ${task.completed ? 'completed' : ''}`;
    element.dataset.taskId = task.id;
    element.style.animationDelay = `${index * 0.1}s`;

    const deadlineText = task.deadline ? 
      `截止：${new Date(task.deadline).toLocaleDateString('zh-TW')}` : 
      `預計：${task.estimate || '未設定'}`;

    element.innerHTML = `
      <div class="task-priority priority-${task.priority}"></div>
      <div class="task-content">
        <div class="task-title">${task.title}</div>
        <div class="task-time">${deadlineText}</div>
        ${task.tags.length > 0 ? `
          <div class="task-tags">
            ${task.tags.map(tag => `<span class="task-tag">${tag}</span>`).join('')}
          </div>
        ` : ''}
      </div>
      <div class="task-actions">
        <button class="task-action" onclick="taskManager.toggleTask('${task.id}')" title="${task.completed ? '標記為未完成' : '標記為完成'}">
          <i class="fas fa-${task.completed ? 'undo' : 'check'}"></i>
        </button>
        <button class="task-action" onclick="taskManager.editTask('${task.id}')" title="編輯任務">
          <i class="fas fa-edit"></i>
        </button>
        <button class="task-action delete" onclick="taskManager.deleteTaskWithConfirm('${task.id}')" title="刪除任務">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `;

    return element;
  }

  toggleTask(id) {
    const task = this.tasks.find(t => t.id === id);
    if (task) {
      this.updateTask(id, { completed: !task.completed });
    }
  }

  editTask(id) {
    // This would open the edit modal with task data
    console.log('Edit task:', id);
  }

  deleteTaskWithConfirm(id) {
    const task = this.tasks.find(t => t.id === id);
    if (task) {
      notificationManager.show(
        `確定要刪除任務「${task.title}」嗎？`,
        'warning',
        0,
        [
          {
            id: 'delete',
            label: '刪除',
            callback: () => this.deleteTask(id)
          },
          {
            id: 'cancel',
            label: '取消',
            callback: () => {}
          }
        ]
      );
    }
  }

  updateStats() {
    const completed = this.tasks.filter(t => t.completed).length;
    const total = this.tasks.length;
    const productivity = total > 0 ? Math.round((completed / total) * 100) : 0;

    const completedElement = document.getElementById('completedTasks');
    const totalElement = document.getElementById('totalTasks');
    const productivityElement = document.getElementById('productivity');

    if (completedElement) completedElement.textContent = completed;
    if (totalElement) totalElement.textContent = total;
    if (productivityElement) productivityElement.textContent = `${productivity}%`;
  }
}

// Global task manager
const taskManager = new TaskManager();

// Enhanced focus timer with Pomodoro technique
class FocusTimer {
  constructor() {
    this.sessions = [];
    this.currentSession = null;
    this.pomodoroCount = 0;
    this.settings = {
      focusDuration: 25 * 60,
      shortBreakDuration: 5 * 60,
      longBreakDuration: 15 * 60,
      pomodorosUntilLongBreak: 4,
      autoStartBreaks: false,
      autoStartPomodoros: false
    };
  }

  startFocusSession() {
    this.currentSession = {
      type: 'focus',
      startTime: Date.now(),
      duration: this.settings.focusDuration,
      remaining: this.settings.focusDuration
    };

    this.addTimerAnimations();
    this.startAmbientSounds();
    
    notificationManager.show(
      '🎯 專注時間開始！保持專注，你可以的！',
      'success',
      3000
    );
  }

  completeSession() {
    if (this.currentSession) {
      this.sessions.push({
        ...this.currentSession,
        endTime: Date.now(),
        completed: true
      });

      if (this.currentSession.type === 'focus') {
        this.pomodoroCount++;
        this.celebrateSessionComplete();
        this.suggestBreak();
      }

      this.currentSession = null;
      this.removeTimerAnimations();
      this.stopAmbientSounds();
    }
  }

  celebrateSessionComplete() {
    const timerElement = document.querySelector('.timer-circle');
    if (timerElement) {
      const rect = timerElement.getBoundingClientRect();
      particleSystem.burst(
        rect.left + rect.width / 2, 
        rect.top + rect.height / 2, 
        25, 
        '#4ecdc4'
      );
    }

    // Achievement unlocked
    if (this.pomodoroCount === 1) {
      this.unlockAchievement('first-pomodoro', '🍅 第一次專注', '完成了你的第一次專注會話！');
    } else if (this.pomodoroCount === 10) {
      this.unlockAchievement('ten-pomodoros', '🔥 專注達人', '完成了10次專注會話！');
    }
  }

  unlockAchievement(id, title, description) {
    notificationManager.show(
      `🏆 成就解鎖：${title}`,
      'success',
      8000,
      [{
        id: 'view',
        label: '查看詳情',
        callback: () => this.showAchievementDetails(id, title, description)
      }]
    );
  }

  showAchievementDetails(id, title, description) {
    // This would show an achievement modal
    console.log('Achievement:', { id, title, description });
  }

  suggestBreak() {
    const isLongBreakTime = this.pomodoroCount % this.settings.pomodorosUntilLongBreak === 0;
    const breakType = isLongBreakTime ? 'long' : 'short';
    const breakDuration = isLongBreakTime ? 
      this.settings.longBreakDuration : 
      this.settings.shortBreakDuration;

    notificationManager.show(
      `⏰ 該休息了！建議${isLongBreakTime ? '長' : '短'}休息 ${Math.round(breakDuration / 60)} 分鐘`,
      'warning',
      0,
      [
        {
          id: 'start-break',
          label: '開始休息',
          callback: () => this.startBreakSession(breakType)
        },
        {
          id: 'continue',
          label: '繼續工作',
          callback: () => this.startFocusSession()
        }
      ]
    );
  }

  startBreakSession(type = 'short') {
    const duration = type === 'long' ? 
      this.settings.longBreakDuration : 
      this.settings.shortBreakDuration;

    this.currentSession = {
      type: 'break',
      breakType: type,
      startTime: Date.now(),
      duration,
      remaining: duration
    };

    this.showBreakActivities();
  }

  showBreakActivities() {
    const activities = [
      '👀 看向遠方，放鬆眼睛',
      '🚶 起身走動一下',
      '💧 喝杯水補充水分',
      '🧘 做幾次深呼吸',
      '💪 簡單的伸展運動'
    ];

    const randomActivity = activities[Math.floor(Math.random() * activities.length)];
    
    notificationManager.show(
      `休息時間建議：${randomActivity}`,
      'info',
      5000
    );
  }

  addTimerAnimations() {
    const timerCircle = document.querySelector('.timer-circle');
    if (timerCircle) {
      timerCircle.classList.add('focus-active');
    }
  }

  removeTimerAnimations() {
    const timerCircle = document.querySelector('.timer-circle');
    if (timerCircle) {
      timerCircle.classList.remove('focus-active');
    }
  }

  startAmbientSounds() {
    // This would start ambient sounds for focus
    console.log('Starting ambient sounds...');
  }

  stopAmbientSounds() {
    // This would stop ambient sounds
    console.log('Stopping ambient sounds...');
  }

  getSessionStats() {
    const today = new Date().toDateString();
    const todaySessions = this.sessions.filter(s => 
      new Date(s.startTime).toDateString() === today
    );

    return {
      totalSessions: this.sessions.length,
      todaySessions: todaySessions.length,
      totalFocusTime: this.sessions
        .filter(s => s.type === 'focus')
        .reduce((sum, s) => sum + s.duration, 0),
      pomodoroCount: this.pomodoroCount,
      averageSessionLength: this.sessions.length > 0 ? 
        this.sessions.reduce((sum, s) => sum + s.duration, 0) / this.sessions.length : 0
    };
  }
}

// Global focus timer
const focusTimer = new FocusTimer();

// Initialize enhanced features
function initializeEnhancedFeatures() {
  // Replace the old notification system
  window.showNotification = (message, type, duration) => {
    notificationManager.show(message, type, duration);
  };

  // Initialize task manager with existing tasks
  if (appState.tasks) {
    taskManager.tasks = appState.tasks;
    taskManager.renderTasks();
  }

  // Add performance monitoring
  const observer = new PerformanceObserver((list) => {
    const metrics = performanceMonitor.getMetrics();
    if (metrics.frameRate < 30) {
      console.warn('Low FPS detected:', metrics.frameRate);
    }
  });

  if (typeof PerformanceObserver !== 'undefined') {
    observer.observe({ entryTypes: ['measure'] });
  }

  // Add Easter eggs
  initializeEasterEggs();
}

// Easter eggs and fun features
function initializeEasterEggs() {
  let konami = [];
  const konamiCode = [38, 38, 40, 40, 37, 39, 37, 39, 66, 65]; // ↑↑↓↓←→←→BA

  document.addEventListener('keydown', (e) => {
    konami.push(e.keyCode);
    konami = konami.slice(-konamiCode.length);

    if (konami.join(',') === konamiCode.join(',')) {
      activateSecretMode();
    }
  });

  // Double-click on logo for debug info
  const logo = document.querySelector('.logo');
  if (logo) {
    let clickCount = 0;
    logo.addEventListener('click', () => {
      clickCount++;
      setTimeout(() => { clickCount = 0; }, 500);
      
      if (clickCount === 3) {
        showDebugInfo();
      }
    });
  }
}

function activateSecretMode() {
  document.body.classList.add('party-mode');
  
  // Add rainbow colors
  const style = document.createElement('style');
  style.textContent = `
    .party-mode * {
      animation: rainbow 2s linear infinite !important;
    }
    @keyframes rainbow {
      0% { filter: hue-rotate(0deg); }
      100% { filter: hue-rotate(360deg); }
    }
  `;
  document.head.appendChild(style);

  notificationManager.show(
    '🎉 恭喜！你發現了隱藏功能！',
    'success',
    10000,
    [{
      id: 'disable',
      label: '關閉特效',
      callback: () => {
        document.body.classList.remove('party-mode');
        document.head.removeChild(style);
      }
    }]
  );

  // Celebration
  for (let i = 0; i < 5; i++) {
    setTimeout(() => {
      particleSystem.burst(
        Math.random() * window.innerWidth,
        Math.random() * window.innerHeight,
        20,
        `hsl(${Math.random() * 360}, 100%, 50%)`
      );
    }, i * 500);
  }
}

function showDebugInfo() {
  const metrics = performanceMonitor.getMetrics();
  const sessionStats = focusTimer.getSessionStats();
  
  const debugInfo = `
    🔧 調試資訊
    ═══════════
    FPS: ${metrics.frameRate || 'N/A'}
    記憶體: ${metrics.memoryUsage || 'N/A'} MB
    任務數: ${taskManager.tasks.length}
    專注會話: ${sessionStats.totalSessions}
    番茄數: ${sessionStats.pomodoroCount}
  `;

  notificationManager.show(debugInfo, 'info', 10000);
}

// Audio Settings Manager
class AudioSettings {
  constructor() {
    this.settings = {
      enabled: true,
      volume: 0.5,
      completionSound: true,
      startSound: true,
      pauseSound: false
    };
    this.loadSettings();
  }

  loadSettings() {
    const saved = localStorage.getItem('audioSettings');
    if (saved) {
      this.settings = { ...this.settings, ...JSON.parse(saved) };
    }
  }

  saveSettings() {
    localStorage.setItem('audioSettings', JSON.stringify(this.settings));
  }

  updateSetting(key, value) {
    this.settings[key] = value;
    this.saveSettings();
    this.notifyChange();
  }

  getSetting(key) {
    return this.settings[key];
  }

  getAllSettings() {
    return { ...this.settings };
  }

  isEnabled(soundType = null) {
    if (!this.settings.enabled) return false;
    if (soundType) {
      const soundKey = `${soundType}Sound`;
      return this.settings[soundKey] !== false;
    }
    return true;
  }

  getVolume() {
    return this.settings.volume;
  }

  notifyChange() {
    const event = new CustomEvent('audioSettingsChanged', {
      detail: this.settings
    });
    window.dispatchEvent(event);
  }

  createSettingsUI() {
    const container = document.createElement('div');
    container.className = 'audio-settings-panel';
    container.innerHTML = `
      <div class="settings-section">
        <h3><i class="fas fa-volume-up"></i> 音效設定</h3>
        
        <div class="setting-item">
          <label class="setting-label">
            <input type="checkbox" id="audioEnabled" ${this.settings.enabled ? 'checked' : ''}>
            <span class="checkmark"></span>
            啟用音效
          </label>
        </div>

        <div class="setting-item">
          <label class="setting-label">音量</label>
          <div class="volume-control">
            <input type="range" id="volumeSlider" min="0" max="1" step="0.1" value="${this.settings.volume}">
            <span class="volume-value">${Math.round(this.settings.volume * 100)}%</span>
          </div>
        </div>

        <div class="setting-item">
          <label class="setting-label">
            <input type="checkbox" id="completionSound" ${this.settings.completionSound ? 'checked' : ''}>
            <span class="checkmark"></span>
            番茄鐘完成提醒音
          </label>
        </div>

        <div class="setting-item">
          <label class="setting-label">
            <input type="checkbox" id="startSound" ${this.settings.startSound ? 'checked' : ''}>
            <span class="checkmark"></span>
            開始計時音效
          </label>
        </div>

        <div class="setting-item">
          <label class="setting-label">
            <input type="checkbox" id="pauseSound" ${this.settings.pauseSound ? 'checked' : ''}>
            <span class="checkmark"></span>
            暫停音效
          </label>
        </div>

        <div class="setting-actions">
          <button class="btn primary" id="testAudio">測試音效</button>
          <button class="btn secondary" id="resetAudioSettings">重設</button>
        </div>
      </div>
    `;

    // 綁定事件
    this.bindSettingsEvents(container);
    return container;
  }

  bindSettingsEvents(container) {
    const audioEnabled = container.querySelector('#audioEnabled');
    const volumeSlider = container.querySelector('#volumeSlider');
    const volumeValue = container.querySelector('.volume-value');
    const completionSound = container.querySelector('#completionSound');
    const startSound = container.querySelector('#startSound');
    const pauseSound = container.querySelector('#pauseSound');
    const testAudio = container.querySelector('#testAudio');
    const resetSettings = container.querySelector('#resetAudioSettings');

    audioEnabled.addEventListener('change', (e) => {
      this.updateSetting('enabled', e.target.checked);
    });

    volumeSlider.addEventListener('input', (e) => {
      const volume = parseFloat(e.target.value);
      this.updateSetting('volume', volume);
      volumeValue.textContent = `${Math.round(volume * 100)}%`;
    });

    completionSound.addEventListener('change', (e) => {
      this.updateSetting('completionSound', e.target.checked);
    });

    startSound.addEventListener('change', (e) => {
      this.updateSetting('startSound', e.target.checked);
    });

    pauseSound.addEventListener('change', (e) => {
      this.updateSetting('pauseSound', e.target.checked);
    });

    testAudio.addEventListener('click', () => {
      if (window.playSound && this.isEnabled('completion')) {
        window.playSound('complete');
      }
    });

    resetSettings.addEventListener('click', () => {
      this.settings = {
        enabled: true,
        volume: 0.5,
        completionSound: true,
        startSound: true,
        pauseSound: false
      };
      this.saveSettings();
      location.reload(); // 簡單的重新載入以更新 UI
    });
  }
}

// Global audio settings instance
const audioSettings = new AudioSettings();

// Export enhanced features to global scope
window.notificationManager = notificationManager;
window.taskManager = taskManager;
window.focusTimer = focusTimer;
window.particleSystem = particleSystem;
window.performanceMonitor = performanceMonitor;
window.audioSettings = audioSettings;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeEnhancedFeatures);
} else {
  initializeEnhancedFeatures();
}