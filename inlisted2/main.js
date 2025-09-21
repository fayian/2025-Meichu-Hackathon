const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const Websocket = require("ws");
const Store = require("electron-store");

let mainWindow;
let wsServer;
let websocket;
let aiStore;
let newTaskPopup;
let taskHudWindow;

// Initialize WebSocket server
function initializeWebSocketServer() {
  mainWindow.webContents.send("websocket-server-status", true);
  wsServer = new Websocket.Server({ port: 7777 });
  console.log("Starting WebSocket server...");
  wsServer.on("error", (err) => {
    console.error("Failed to start WebSocket server:", err);
    mainWindow.webContents.send("websocket-server-status", false);
  });

  wsServer.on("connection", (ws) => {
    websocket = ws;
    ws.on("error", (err) => {
      console.error("WebSocket error:", err);
    });
    ws.on("message", (data) => {
      handleWebSocketMessage(data);
    });
  });
  console.log("WebSocket server started on port 7777...");
}
// Handle Websocket Messages
function handleWebSocketMessage(rawMessage) {
  try {
    const message = JSON.parse(rawMessage.toString());

    //validate message
    if (
      typeof message.command !== "string" ||
      typeof message.data !== "object"
    ) {
      console.warn("Invalid message format:", message);
      return;
    }

    // Handle different commands
    switch (message.command) {
      case "new-task":
        mainWindow.webContents.send("new-task", message.data);
        break;
      case "pomodoro-request-set-time":
        mainWindow.webContents.send("pomodoro-request-set-time", message.data);
        break;
      case "pomodoro-request-toggle":
        console.log("Pomodoro toggle request received");
        mainWindow.webContents.send("pomodoro-request-toggle");
        break;
      default:
        console.log("Received unknown command:", message.command);
        break;
    }
  } catch (SyntaxError) {
    console.warn("Message in not JSON:", rawMessage);
    return;
  }
}

function createWindow() {
  // Initialize electron-store for AI persistence
  aiStore = new Store({
    name: "pomodoro-ai",
    defaults: {
      banditState: null,
      fatigueState: null,
      lastUpdated: null,
    },
  });

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, "preload.js"),
    },
    titleBarStyle: "default",
    icon: path.join(__dirname, "assets/icon.png"), // 可以後續添加圖標
  });

  mainWindow.loadFile("index.html");

  // 開發環境下打開開發者工具
  if (process.argv.includes("--dev")) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on("closed", () => {
    taskHudWindow.close();
    mainWindow = null;
  });
}

//Initialize the app
app.whenReady().then(() => {
  createWindow();
  initializeWebSocketServer();
});

app.on("window-all-closed", () => {
  // Stop WebSocket server when app closes
  if (wsServer) {
    //TODO
  }

  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers
ipcMain.handle("get-app-version", () => {
  return app.getVersion();
});

// IPC handlers for AI state persistence
ipcMain.handle("save-ai-state", (event, state) => {
  try {
    if (aiStore) {
      aiStore.set("banditState", state.bandit);
      aiStore.set("fatigueState", state.fatigue);
      aiStore.set("lastUpdated", state.lastUpdated);
      return { success: true };
    }
    return { success: false, error: "Store not initialized" };
  } catch (error) {
    console.error("Failed to save AI state:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("load-ai-state", () => {
  try {
    if (aiStore) {
      return {
        bandit: aiStore.get("banditState"),
        fatigue: aiStore.get("fatigueState"),
        lastUpdated: aiStore.get("lastUpdated"),
      };
    }
    return null;
  } catch (error) {
    console.error("Failed to load AI state:", error);
    return null;
  }
});

ipcMain.handle("clear-ai-state", () => {
  try {
    if (aiStore) {
      aiStore.clear();
      return { success: true };
    }
    return { success: false, error: "Store not initialized" };
  } catch (error) {
    console.error("Failed to clear AI state:", error);
    return { success: false, error: error.message };
  }
});

// IPC handlers for sending pomodoro status
ipcMain.handle("pomodoro-start", (event, seconds) => {
  if (websocket)
    websocket.send(
      JSON.stringify({ command: "pomodoro-start", data: { seconds: seconds } })
    );
});

ipcMain.handle("pomodoro-pause", () => {
  if (websocket)
    websocket.send(JSON.stringify({ command: "pomodoro-pause", data: {} }));
});

ipcMain.handle("pomodoro-stop", () => {
  if (websocket)
    websocket.send(JSON.stringify({ command: "pomodoro-stop", data: {} }));
});

ipcMain.handle("pomodoro-set-time", (event, seconds) => {
  if (websocket)
    websocket.send(
      JSON.stringify({
        command: "pomodoro-set-time",
        data: { seconds: seconds },
      })
    );
});

// Create new task popup window
ipcMain.handle("create-new-task-popup", async (event, taskData = {}) => {
  return createNewTaskPopup(taskData);
});

// Handle task submission from popup
ipcMain.handle("submit-new-task", async (event, taskData) => {
  // Send the task data to the main window
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("task-submitted", taskData);
  }

  // Close the popup
  if (newTaskPopup && !newTaskPopup.isDestroyed()) {
    newTaskPopup.close();
  }

  return { success: true };
});

// HUD window management

ipcMain.handle("update-task-hud", async (event, taskData) => {
  return updateTaskHud(taskData);
});

ipcMain.handle("hide-task-hud", async () => {
  return hideTaskHud();
});

ipcMain.handle("show-task-hud", async () => {
  return showTaskHud();
});

function createNewTaskPopup(taskData = {}) {
  // Close existing popup if it exists
  if (newTaskPopup && !newTaskPopup.isDestroyed()) {
    newTaskPopup.close();
  }

  newTaskPopup = new BrowserWindow({
    width: 450,
    height: 450,
    resizable: false,
    center: true,
    frame: false,
    focusable: true, // Ensure popup can receive focus
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, "preload.js"),
    },
    show: false, // Don't show until ready
  });

  // Build URL with task data as query parameter
  let popupUrl = `file://${path.join(__dirname, "templates", "new-task.html")}`;
  if (taskData && Object.keys(taskData).length > 0) {
    const encodedData = encodeURIComponent(JSON.stringify(taskData));
    popupUrl += `?data=${encodedData}`;
  }

  // Load the HTML file
  newTaskPopup.loadURL(popupUrl);

  // Close popup when clicking outside or pressing Escape
  newTaskPopup.on("blur", () => {
    newTaskPopup.close();
  });

  // Handle window closed
  newTaskPopup.on("closed", () => {
    newTaskPopup = null;
  });

  newTaskPopup.on("focus", () => {
    newTaskPopup.moveTop();
    newTaskPopup.show();
  });

  // Show when ready
  newTaskPopup.once("ready-to-show", () => {
    setTimeout(() => {
      newTaskPopup.show();
      newTaskPopup.focus();
    }, 100);
  });

  return { success: true, windowId: newTaskPopup.id };
}

// HUD Window Management Functions
function createTaskHud(taskData) {
  taskHudWindow = new BrowserWindow({
    width: 300,
    height: 80,
    x: 20, // Top left corner
    y: 20,
    frame: false,
    alwaysOnTop: true,
    focusable: false, // Non-focusable
    skipTaskbar: true,
    transparent: true, // Transparent background
    resizable: false,
    minimizable: false,
    maximizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, "preload.js"),
    },
    show: false,
  });

  // Build URL with task data as query parameter
  let hudUrl = `file://${path.join(__dirname, "templates", "task-hud.html")}`;
  if (taskData && Object.keys(taskData).length > 0) {
    const encodedData = encodeURIComponent(JSON.stringify(taskData));
    hudUrl += `?data=${encodedData}`;
  }

  // Load the HTML file
  taskHudWindow.loadURL(hudUrl);

  // Show when ready
  taskHudWindow.once("ready-to-show", () => {
    taskHudWindow.show();
  });

  // Handle window closed
  taskHudWindow.on("closed", () => {
    taskHudWindow = null;
  });

  return { success: true, windowId: taskHudWindow.id };
}

function updateTaskHud(taskData) {
  if (taskHudWindow && !taskHudWindow.isDestroyed()) {
    // Send update data to HUD window
    taskHudWindow.webContents.send("update-hud-data", taskData);
    return { success: true };
  } else {
    // Create new HUD if it doesn't exist
    return createTaskHud(taskData);
  }
}

function hideTaskHud() {
  if (taskHudWindow && !taskHudWindow.isDestroyed()) {
    taskHudWindow.hide();
    return { success: true };
  }
  return { success: false, message: "HUD not found" };
}

function showTaskHud() {
  if (taskHudWindow && !taskHudWindow.isDestroyed()) {
    taskHudWindow.show();
    return { success: true };
  }
  return { success: false, message: "HUD not found" };
}
