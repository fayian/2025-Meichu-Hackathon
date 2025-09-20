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
    this.resultModal.style.display = 'flex';
    setTimeout(() => this.resultModal.classList.add("show"), 10);
  }

  hideResultModal() {
    this.resultModal.classList.remove("show");
    setTimeout(() => {
        this.resultModal.style.display = 'none';
        this.resultContent.innerHTML = '';
    }, 300);
  }

  init() {
    this.setupEventListeners();
    this.renderTasks();
  }

  setupEventListeners() {
    // Add task button
    document.getElementById("addTaskBtn").addEventListener("click", () => {
      this.showTaskModal();
    });

    document.getElementById("scheduleTasksBtn").addEventListener("click", () => {
    this.scheduleTasks();
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
    const tasksToSchedule = this.tasks.filter(task => !task.completed);

    if (tasksToSchedule.length === 0) {
      window.inlistedApp.showNotification("沒有待辦任務", "目前沒有需要排程的任務。");
      return;
    }
    
    this.showLoader();

    try {
      // 1. 呼叫新的 API 端點
      const response = await fetch('http://localhost:8000/schedule-and-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tasksToSchedule),
      });

      // 2. 接收完整的、已排序的任務列表
      const syncedTasks = await response.json();

      if (!response.ok) {
        // .detail 是 FastAPI 錯誤的標準欄位
        throw new Error(syncedTasks.detail || '排程時發生未知錯誤');
      }
      
      // 3. 直接用後端回傳的列表覆蓋前端的任務列表
      // 注意：後端回傳的格式可能和前端稍有不同，我們在這裡進行對應
      this.tasks = syncedTasks.map(task => ({
          id: task.id, // 使用 Google Calendar Event ID
          name: task.name,
          deadline: task.deadline,
          priority: task.priority,
          duration: task.duration,
          completed: task.completed,
          createdAt: task.createdAt
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
      console.error('Error scheduling and syncing:', error);
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
    this.loader.style.display = 'flex';
    setTimeout(() => this.loader.classList.add("show"), 10);
  }

  hideLoader() {
    this.loader.classList.remove("show");
    setTimeout(() => {
        this.loader.style.display = 'none';
    }, 300); // 配合 CSS 的 transition 時間
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.taskManager = new TaskManager();
});

//handle new task from main process
window.ipcRenderer.onNewTask((taskData) => {
  window.inlistedApp.showNotification("new task");
});
