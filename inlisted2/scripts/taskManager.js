// Task Manager functionality
class TaskManager {
  constructor() {
    this.tasks = JSON.parse(localStorage.getItem("inlisted-tasks")) || [];
    this.currentFilter = "all";
    this.init();
    this.initModalsAndLoader();
  }

  initModalsAndLoader() {
    this.resultModal = document.getElementById("scheduleResultModal");
    this.resultContent = document.getElementById("scheduleResultContent");
    const closeBtn = document.getElementById("closeScheduleResultBtn");

    closeBtn.addEventListener("click", () => this.hideResultModal());
    this.resultModal.addEventListener("click", (e) => {
      if (e.target === this.resultModal) this.hideResultModal();
    });

    this.loader = document.getElementById("loader");
  }

  showResultModal(content) {
    this.resultContent.innerHTML = content;
    this.resultModal.style.display = "flex";
    setTimeout(() => this.resultModal.classList.add("show"), 10);
  }

  hideResultModal() {
    this.resultModal.classList.remove("show");
    setTimeout(() => {
      this.resultModal.style.display = "none";
      this.resultContent.innerHTML = "";
    }, 300);
  }

  init() {
    this.setupEventListeners();
    this.renderTasks();
    this.setupIpcListeners();
  }

  setupIpcListeners() {
    // Listen for task submissions from popup window
    window.ipcRenderer.onTaskSubmitted((taskData) => {
      this.addTask(taskData);
    });

    // Listen for new task requests (from external sources like WebSocket)
    window.ipcRenderer.onNewTask((taskData) => {
      this.handleNewTaskRequest(taskData);
    });
  }

  async handleNewTaskRequest(taskData = {}) {
    try {
      // Create popup window for task editing
      await window.electronAPI.createNewTaskPopup(taskData);
    } catch (error) {
      console.error("Error creating new task popup:", error);
      // Fallback to notification
      window.inlistedApp.showNotification(
        "新任務請求",
        "收到新任務請求，但無法開啟編輯視窗"
      );
    }
  }

  addTask(taskData) {
    // Add the task to the list
    this.tasks.push(taskData);
    this.saveTasks();
    this.renderTasks();

    // Show success notification
    window.inlistedApp.showNotification(
      "任務已新增",
      `任務"${taskData.name}"已成功新增`
    );
  }

  setupEventListeners() {
    // Add task button - now opens popup instead of modal
    document
      .getElementById("addTaskBtn")
      .addEventListener("click", async () => {
        try {
          await window.electronAPI.createNewTaskPopup();
        } catch (error) {
          console.error("Error creating new task popup:", error);
          // Fallback to original modal
          this.showTaskModal();
        }
      });

    // Recommend best task button
    document
      .getElementById("recommendTaskBtn")
      .addEventListener("click", () => {
        this.recommendBestTask();
      });

    document
      .getElementById("scheduleTasksBtn")
      .addEventListener("click", () => {
        this.scheduleTasks();
      });

    // Clear all data button
    document
      .getElementById("clearAllDataBtn")
      .addEventListener("click", () => {
        this.clearAllData();
      });

    // Task form submission
    document.getElementById("taskForm").addEventListener("submit", (e) => {
      e.preventDefault();
      this.handleTaskSubmission();
    });

    // Cancel button
    document.getElementById("cancelTaskBtn").addEventListener("click", () => {
      this.hideTaskModal();
    });

    // Filter buttons
    document.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document
          .querySelectorAll(".filter-btn")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        this.currentFilter = btn.dataset.filter;
        this.renderTasks();
      });
    });
  }

  showTaskModal() {
    const modal = document.getElementById("taskModal");
    modal.style.display = "block";
    // Trigger animation
    setTimeout(() => modal.classList.add("show"), 10);

    // Set default deadline to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 0, 0);
    document.getElementById("taskDeadline").value = tomorrow
      .toISOString()
      .slice(0, 16);

    // Focus first input
    document.getElementById("taskName").focus();
  }

  hideTaskModal() {
    const modal = document.getElementById("taskModal");
    modal.classList.remove("show");
    setTimeout(() => {
      modal.style.display = "none";
      document.getElementById("taskForm").reset();
    }, 300);
  }

  handleTaskSubmission() {
    const formData = new FormData(document.getElementById("taskForm"));
    const task = {
      id: Date.now(),
      name: formData.get("taskName"),
      deadline: formData.get("taskDeadline"),
      priority: formData.get("taskPriority"),
      duration: parseFloat(formData.get("taskDuration")),
      completed: false,
      createdAt: new Date().toISOString(),
    };

    this.tasks.push(task);
    this.saveTasks();
    this.renderTasks();
    this.hideTaskModal();

    window.inlistedApp.showNotification(
      "任務已新增",
      `任務"${task.name}"已成功新增`
    );
  }

  deleteTask(taskId) {
    if (confirm("確定要刪除這個任務嗎？")) {
      this.tasks = this.tasks.filter((task) => task.id !== taskId);
      this.saveTasks();
      this.renderTasks();
      window.inlistedApp.showNotification("任務已刪除", "任務已成功刪除");
    }
  }

  toggleTaskComplete(taskId) {
    const task = this.tasks.find((t) => t.id === taskId);
    if (task) {
      task.completed = !task.completed;
      task.completedAt = task.completed ? new Date().toISOString() : null;
      this.saveTasks();
      this.renderTasks();

      const status = task.completed ? "完成" : "重新開啟";
      window.inlistedApp.showNotification(
        "任務狀態更新",
        `任務"${task.name}"已${status}`
      );
    }
  }

  getFilteredTasks() {
    let filtered = [...this.tasks];

    switch (this.currentFilter) {
      case "high":
        filtered = filtered.filter(
          (task) => task.priority === "high" && !task.completed
        );
        break;
      case "medium":
        filtered = filtered.filter(
          (task) => task.priority === "medium" && !task.completed
        );
        break;
      case "low":
        filtered = filtered.filter(
          (task) => task.priority === "low" && !task.completed
        );
        break;
      case "overdue":
        filtered = filtered.filter((task) => {
          const deadline = new Date(task.deadline);
          return deadline < new Date() && !task.completed;
        });
        break;
      case "all":
      default:
        // Show all tasks
        break;
    }

    // Sort by urgency (highest first)
    return filtered.sort((a, b) => {
      if (a.completed && !b.completed) return 1;
      if (!a.completed && b.completed) return -1;
      if (a.completed && b.completed)
        return new Date(b.completedAt) - new Date(a.completedAt);

      const urgencyA = window.inlistedApp.calculateUrgency(
        a.deadline,
        a.priority
      );
      const urgencyB = window.inlistedApp.calculateUrgency(
        b.deadline,
        b.priority
      );
      return urgencyB - urgencyA;
    });
  }

  renderTasks() {
    const taskList = document.getElementById("taskList");
    const tasks = this.getFilteredTasks();

    if (tasks.length === 0) {
      taskList.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #666;">
                    <i class="fas fa-clipboard-list" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;"></i>
                    <p>尚無任務</p>
                </div>
            `;
      return;
    }

    taskList.innerHTML = tasks
      .map((task) => this.createTaskElement(task))
      .join("");

    // Add event listeners to task buttons
    taskList.querySelectorAll(".complete-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.toggleTaskComplete(parseInt(btn.dataset.taskId));
      });
    });

    taskList.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.deleteTask(parseInt(btn.dataset.taskId));
      });
    });
  }

  createTaskElement(task) {
    const deadline = new Date(task.deadline);
    const now = new Date();
    const isOverdue = deadline < now && !task.completed;
    const timeLeft = deadline - now;
    const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));

    let timeLeftText = "";
    if (task.completed) {
      timeLeftText = "已完成";
    } else if (isOverdue) {
      timeLeftText = "已逾期";
    } else if (daysLeft === 0) {
      timeLeftText = "今天到期";
    } else if (daysLeft === 1) {
      timeLeftText = "明天到期";
    } else {
      timeLeftText = `${daysLeft}天後到期`;
    }

    const priorityColors = {
      high: "high-priority",
      medium: "medium-priority",
      low: "low-priority",
    };

    const priorityTexts = {
      high: "高",
      medium: "中",
      low: "低",
    };

    return `
            <div class="task-item ${priorityColors[task.priority]} ${
      task.completed ? "completed" : ""
    } ${isOverdue ? "overdue" : ""}">
                <div class="task-header">
                    <div class="task-name">${task.name}</div>
                    <div class="task-actions">
                        <button class="btn btn-secondary complete-btn" data-task-id="${
                          task.id
                        }">
                            <i class="fas fa-${
                              task.completed ? "undo" : "check"
                            }"></i>
                            ${task.completed ? "重開" : "完成"}
                        </button>
                        <button class="btn btn-danger delete-btn" data-task-id="${
                          task.id
                        }">
                            <i class="fas fa-trash"></i>
                            刪除
                        </button>
                    </div>
                </div>
                <div class="task-meta">
                    <div class="task-meta-item">
                        <i class="fas fa-calendar-alt"></i>
                        <span>${window.inlistedApp.formatDateTime(
                          deadline
                        )}</span>
                    </div>
                    <div class="task-meta-item">
                        <i class="fas fa-exclamation-circle"></i>
                        <span>優先級: ${priorityTexts[task.priority]}</span>
                    </div>
                    <div class="task-meta-item">
                        <i class="fas fa-clock"></i>
                        <span>預估: ${window.inlistedApp.formatDuration(
                          task.duration
                        )}</span>
                    </div>
                    <div class="task-meta-item ${
                      isOverdue ? "text-danger" : ""
                    }">
                        <i class="fas fa-hourglass-half"></i>
                        <span>${timeLeftText}</span>
                    </div>
                </div>
            </div>
        `;
  }

  saveTasks() {
    localStorage.setItem("inlisted-tasks", JSON.stringify(this.tasks));
  }

  // Clear all local data
  clearAllData() {
    if (confirm("確定要清除所有本地資料嗎？這個動作無法復原！\n\n包含：\n- 所有任務資料\n- 健康提醒設定\n- 番茄鐘統計\n- AI 學習資料")) {
      try {
        // Clear tasks
        this.tasks = [];
        localStorage.removeItem("inlisted-tasks");
        
        // Clear health reminder data
        localStorage.removeItem("health-reminder-settings");
        localStorage.removeItem("health-stats");
        
        // Clear pomodoro stats
        localStorage.removeItem("pomodoro-stats");
        
        // Clear AI state
        localStorage.removeItem("smart-pomodoro-ai-state");
        localStorage.removeItem("pomodoro-ai-state");
        
        // Clear electron AI state if available
        if (window.electronAPI?.clearAIState) {
          window.electronAPI.clearAIState();
        }
        
        // Re-render tasks (will show empty state)
        this.renderTasks();
        
        window.inlistedApp.showNotification(
          "資料清除完成",
          "所有本地資料已成功清除"
        );
        
        console.log("所有本地資料已清除完成！");
      } catch (error) {
        console.error("清除資料時發生錯誤:", error);
        window.inlistedApp.showNotification(
          "清除失敗",
          "清除資料時發生錯誤，請檢查控制台"
        );
      }
    }
  }

  // Recommend the best task to work on now
  recommendBestTask() {
    const incompleteTasks = this.tasks.filter(task => !task.completed);
    
    if (incompleteTasks.length === 0) {
      this.showRecommendationModal({
        type: 'no-tasks',
        message: '🎉 太棒了！你已經完成了所有任務！',
        subMessage: '現在是休息的好時機，或者你可以新增一些新任務。'
      });
      return;
    }

    // Calculate recommendation score for each task
    const scoredTasks = incompleteTasks.map(task => {
      const score = this.calculateTaskScore(task);
      return { ...task, score };
    });

    // Sort by score (highest first)
    scoredTasks.sort((a, b) => b.score - a.score);
    
    const recommendedTask = scoredTasks[0];
    const reasons = this.getRecommendationReasons(recommendedTask);

    this.showRecommendationModal({
      type: 'recommendation',
      task: recommendedTask,
      reasons: reasons,
      alternativeTasks: scoredTasks.slice(1, 4) // Show top 3 alternatives
    });
  }

  // Calculate task recommendation score
  calculateTaskScore(task) {
    const now = new Date();
    const deadline = new Date(task.deadline);
    const timeUntilDeadline = deadline - now;
    const daysUntilDeadline = timeUntilDeadline / (1000 * 60 * 60 * 24);

    // Priority score (high=3, medium=2, low=1)
    const priorityScore = {
      'high': 3,
      'medium': 2,
      'low': 1
    }[task.priority] || 1;

    // Urgency score (based on deadline)
    let urgencyScore = 1;
    if (daysUntilDeadline < 0) {
      urgencyScore = 5; // Overdue
    } else if (daysUntilDeadline < 1) {
      urgencyScore = 4; // Due today
    } else if (daysUntilDeadline < 3) {
      urgencyScore = 3; // Due within 3 days
    } else if (daysUntilDeadline < 7) {
      urgencyScore = 2; // Due within a week
    }

    // Duration score (prefer shorter tasks for quick wins)
    const durationScore = task.duration <= 1 ? 1.5 : 
                         task.duration <= 2 ? 1.2 : 
                         task.duration <= 4 ? 1.0 : 0.8;

    // Time of day factor
    const currentHour = now.getHours();
    let timeOfDayScore = 1;
    
    // Boost score for appropriate task types based on time
    if (currentHour >= 9 && currentHour <= 11) {
      // Morning - good for high priority tasks
      timeOfDayScore = task.priority === 'high' ? 1.3 : 1.1;
    } else if (currentHour >= 14 && currentHour <= 16) {
      // Afternoon - good for medium priority tasks
      timeOfDayScore = task.priority === 'medium' ? 1.2 : 1.0;
    } else if (currentHour >= 19 && currentHour <= 21) {
      // Evening - good for lighter tasks
      timeOfDayScore = task.duration <= 2 ? 1.2 : 0.9;
    }

    // Calculate final score
    const finalScore = (priorityScore * 0.3 + urgencyScore * 0.4 + durationScore * 0.2) * timeOfDayScore;
    
    return Math.round(finalScore * 100) / 100;
  }

  // Get human-readable reasons for recommendation
  getRecommendationReasons(task) {
    const reasons = [];
    const now = new Date();
    const deadline = new Date(task.deadline);
    const timeUntilDeadline = deadline - now;
    const daysUntilDeadline = timeUntilDeadline / (1000 * 60 * 60 * 24);
    const currentHour = now.getHours();

    // Priority reasons
    if (task.priority === 'high') {
      reasons.push('🔥 高優先級任務');
    }

    // Urgency reasons
    if (daysUntilDeadline < 0) {
      reasons.push('⚠️ 任務已過期');
    } else if (daysUntilDeadline < 1) {
      reasons.push('⏰ 今天就要截止');
    } else if (daysUntilDeadline < 3) {
      reasons.push('📅 三天內截止');
    }

    // Duration reasons
    if (task.duration <= 1) {
      reasons.push('⚡ 可快速完成（1小時內）');
    } else if (task.duration <= 2) {
      reasons.push('✨ 適中的工作量（2小時內）');
    }

    // Time of day reasons
    if (currentHour >= 9 && currentHour <= 11 && task.priority === 'high') {
      reasons.push('🌅 現在是處理重要任務的好時機');
    } else if (currentHour >= 14 && currentHour <= 16 && task.priority === 'medium') {
      reasons.push('☀️ 下午適合處理中等優先級任務');
    } else if (currentHour >= 19 && currentHour <= 21 && task.duration <= 2) {
      reasons.push('🌙 晚上適合處理較輕鬆的任務');
    }

    return reasons.length > 0 ? reasons : ['📋 根據綜合評估推薦'];
  }

  // Show recommendation modal
  showRecommendationModal({ type, task, reasons, alternativeTasks, message, subMessage }) {
    let content = '';

    if (type === 'no-tasks') {
      content = `
        <div class="recommendation-content no-tasks">
          <div class="icon success"><i class="fas fa-check-circle"></i></div>
          <h3>${message}</h3>
          <p>${subMessage}</p>
          <div class="actions">
            <button class="btn btn-primary" onclick="document.getElementById('addTaskBtn').click(); window.taskManager.hideResultModal();">
              <i class="fas fa-plus"></i> 新增任務
            </button>
          </div>
        </div>
      `;
    } else {
      const taskElement = this.createTaskElement(task);
      const reasonsHtml = reasons.map(reason => `<span class="reason-tag">${reason}</span>`).join('');
      
      let alternativesHtml = '';
      if (alternativeTasks && alternativeTasks.length > 0) {
        alternativesHtml = `
          <div class="alternatives-section">
            <h4>其他推薦任務：</h4>
            <div class="alternative-tasks">
              ${alternativeTasks.map(altTask => `
                <div class="alternative-task" onclick="window.taskManager.highlightTask(${altTask.id})">
                  <span class="task-name">${altTask.name}</span>
                  <span class="task-score">評分: ${altTask.score}</span>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }

      content = `
        <div class="recommendation-content">
          <div class="icon recommendation"><i class="fas fa-lightbulb"></i></div>
          <h3>💡 推薦任務</h3>
          <div class="recommended-task">
            ${taskElement}
          </div>
          <div class="reasons">
            <h4>推薦原因：</h4>
            <div class="reasons-list">
              ${reasonsHtml}
            </div>
          </div>
          ${alternativesHtml}
          <div class="actions">
            <button class="btn btn-success" onclick="window.taskManager.startWorkingOnTask(${task.id}); window.taskManager.hideResultModal();">
              <i class="fas fa-play"></i> 開始工作
            </button>
            <button class="btn btn-secondary" onclick="window.taskManager.hideResultModal();">
              <i class="fas fa-times"></i> 稍後再說
            </button>
          </div>
        </div>
      `;
    }

    this.showResultModal(content);
  }

  // Highlight a specific task in the task list
  highlightTask(taskId) {
    // Remove existing highlights
    document.querySelectorAll('.task-item').forEach(item => {
      item.classList.remove('highlighted');
    });

    // Add highlight to specific task
    const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
    if (taskElement) {
      taskElement.classList.add('highlighted');
      taskElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Remove highlight after 3 seconds
      setTimeout(() => {
        taskElement.classList.remove('highlighted');
      }, 3000);
    }
    
    this.hideResultModal();
  }

  // Start working on a task (placeholder for pomodoro integration)
  startWorkingOnTask(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (task) {
      // Highlight the task
      this.highlightTask(taskId);
      
      // Show notification
      window.inlistedApp.showNotification(
        "開始工作",
        `開始處理任務："${task.name}"`
      );

      // TODO: Integrate with Pomodoro timer
      // This could automatically start a pomodoro session for this task
      console.log(`Starting work on task: ${task.name} (${task.duration}h estimated)`);
    }
  }

  // Method to integrate with Google Calendar (placeholder for future implementation)
  syncWithGoogleCalendar() {
    console.log("Google Calendar integration placeholder");
    // TODO: Implement Google Calendar API integration
    window.inlistedApp.showNotification(
      "功能開發中",
      "Google日曆整合功能正在開發中"
    );
  }

  async scheduleTasks() {
    const tasksToSchedule = this.tasks.filter((task) => !task.completed);

    if (tasksToSchedule.length === 0) {
      window.inlistedApp.showNotification(
        "沒有待辦任務",
        "目前沒有需要排程的任務。"
      );
      return;
    }

    this.showLoader();

    try {
      // 1. 呼叫新的 API 端點
      const response = await fetch("http://localhost:8000/schedule-and-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tasksToSchedule),
      });

      // 2. 接收完整的、已排序的任務列表
      const syncedTasks = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || "排程時發生未知錯誤");
      }

      // 3. 直接用後端回傳的列表覆蓋前端的任務列表
      // 注意：後端回傳的格式可能和前端稍有不同，我們在這裡進行對應
      this.tasks = syncedTasks.map((task) => ({
        id: task.id, // 使用 Google Calendar Event ID
        name: task.name,
        deadline: task.deadline,
        priority: task.priority,
        duration: task.duration,
        completed: task.completed,
        createdAt: task.createdAt,
      }));

      // 4. 保存並重新渲染
      this.saveTasks();
      this.renderTasks();

      // 5. 顯示成功畫面
      const successContent = `
            <div class="icon success"><i class="fas fa-sync-alt"></i></div>
            <h2>同步成功！</h2>
            <p>您的待辦事項列表已和 Google Calendar 完全同步。</p>
        `;
      this.showResultModal(successContent);
    } catch (error) {
      console.error("Error scheduling tasks:", error);
      // 嚴重錯誤，例如 API 連線失敗
      const errorContent = `
            <div class="icon warning"><i class="fas fa-times-circle" style="color: #dc3545;"></i></div>
            <h2>同步失敗</h2>
            <p>無法完成排程與同步，請檢查後端伺-服器是否正在運行。</p>
            <p><small>${error.message}</small></p>
      `;
      this.showResultModal(errorContent);
    } finally {
      this.hideLoader();
    }
  }

  showLoader() {
    this.loader.style.display = "flex";
    setTimeout(() => this.loader.classList.add("show"), 10);
  }

  hideLoader() {
    this.loader.classList.remove("show");
    setTimeout(() => {
      this.loader.style.display = "none";
    }, 300); // 配合 CSS 的 transition 時間
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.taskManager = new TaskManager();
});
