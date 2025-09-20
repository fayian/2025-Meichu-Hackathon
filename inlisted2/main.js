const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const Websocket = require("ws");

let mainWindow;
let wsServer;

// Initialize WebSocket server
function initializeWebSocketServer() {
  mainWindow.webContents.send("websocket-server-status", true);
  wsServer = new Websocket.Server({ port: 7777 });
  wsServer.on("error", (err) => {
    console.error("Failed to start WebSocket server:", err);
    mainWindow.webContents.send("websocket-server-status", false);
  });

  wsServer.on("connection", (ws) => {
    ws.on("error", (err) => {
      console.error("WebSocket error:", err);
    });
    ws.on("message", (data) => {
      handleWebSocketMessage(data);
    });
  });
}
// Handle Websocket Messages
function handleWebSocketMessage(rawMessage) {
  try {
    const message = JSON.parse(rawMessage.toString());

    //validate message
    if (typeof message.command !== "string" || typeof message.data !== "object")
      return;

    // Handle different commands
    switch (message.command) {
      case "new-task":
        mainWindow.webContents.send("new-task", message.data);
        break;
      default:
        console.log("Received unknown command:", message.command);
        break;
    }
  } catch (SyntaxError) {
    console.error("Message in not JSON:", rawMessage);
    return;
  }
}

function createWindow() {
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
