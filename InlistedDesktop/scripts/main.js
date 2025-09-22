class InlistedApp {
  constructor() {
    this.currentSection = "task-manager";
    this.websocketManager = null;
    this.init();
  }

  init() {
    this.setupNavigation();
    this.setupDateTime();
    this.setupModals();
  }

  setupNavigation() {
    const navItems = document.querySelectorAll(".nav-item");
    const sections = document.querySelectorAll(".content-section");

    navItems.forEach((item) => {
      item.addEventListener("click", () => {
        const targetSection = item.dataset.section;

        // Update active nav item
        navItems.forEach((nav) => nav.classList.remove("active"));
        item.classList.add("active");

        // Update active section
        sections.forEach((section) => section.classList.remove("active"));
        document.getElementById(targetSection).classList.add("active");

        this.currentSection = targetSection;
      });
    });
  }

  setupDateTime() {
    const updateDateTime = () => {
      const now = new Date();

      // Update date
      const dateOptions = {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "long",
      };
      document.getElementById("currentDate").textContent =
        now.toLocaleDateString("zh-TW", dateOptions);

      // Update time
      const timeOptions = {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      };
      document.getElementById("currentTime").textContent =
        now.toLocaleTimeString("zh-TW", timeOptions);
    };

    updateDateTime();
    setInterval(updateDateTime, 1000);
  }

  setupModals() {
    // Generic modal close functionality
    document.addEventListener("click", (e) => {
      if (
        e.target.classList.contains("modal") ||
        e.target.classList.contains("close")
      ) {
        const modal =
          e.target.closest(".modal") ||
          e.target.parentElement.parentElement.parentElement;
        if (modal) {
          modal.style.display = "none";
        }
      }
    });

    // Escape key to close modals
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        const openModal = document.querySelector('.modal[style*="block"]');
        if (openModal) {
          openModal.style.display = "none";
        }
      }
    });
  }

  showNotification(title, message, type = "info") {
    // Use Electron's notification API if available
    if (window.electronAPI && window.electronAPI.showNotification) {
      window.electronAPI.showNotification(title, message);
    } else {
      // Fallback to browser notification
      if (Notification.permission === "granted") {
        new Notification(title, { body: message });
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then((permission) => {
          if (permission === "granted") {
            new Notification(title, { body: message });
          }
        });
      }
    }
  }

  // Utility functions
  formatDateTime(date) {
    return new Intl.DateTimeFormat("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  formatDuration(hours) {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return h > 0 ? `${h}小時 ${m}分鐘` : `${m}分鐘`;
  }

  calculateUrgency(deadline, priority) {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const timeLeft = deadlineDate - now;
    const daysLeft = timeLeft / (1000 * 60 * 60 * 24);

    let urgencyScore = 0;

    // Priority weight
    const priorityWeights = { low: 1, medium: 2, high: 3 };
    urgencyScore += priorityWeights[priority] * 10;

    // Time pressure weight
    if (daysLeft < 0) urgencyScore += 100; // Overdue
    else if (daysLeft < 1) urgencyScore += 50; // Due today
    else if (daysLeft < 3) urgencyScore += 30; // Due in 3 days
    else if (daysLeft < 7) urgencyScore += 20; // Due in a week
    else urgencyScore += Math.max(0, 10 - daysLeft); // Further out

    return urgencyScore;
  }
}

// Render WebSocket status
window.ipcRenderer.onWebsocketServerActive((status) => {
  const websocketStatusElement = document.getElementById("websocket-status");
  if (!websocketStatusElement) return;

  const indicator = websocketStatusElement.querySelector(".status-indicator");
  const textContent =
    websocketStatusElement.childNodes[1] || websocketStatusElement;

  // Remove existing status classes
  indicator.className = "status-indicator";

  if (status) {
    indicator.classList.add("active");
    textContent.textContent = "WebSocket 運行";
  } else {
    indicator.classList.add("inactive");
    textContent.textContent = "WebSocket 離線";
  }
});

// Initialize the app when DOM is loaded
window.document.addEventListener("DOMContentLoaded", () => {
  window.inlistedApp = new InlistedApp();

  // Request notification permission
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
});
