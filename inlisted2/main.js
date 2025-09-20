const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

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
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'default',
    icon: path.join(__dirname, 'assets/icon.png') // 可以後續添加圖標
  });

  mainWindow.loadFile('index.html');

  // 開發環境下打開開發者工具
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers for future WebSocket and Logi Action SDK integration
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

// Placeholder for future WebSocket API integration
ipcMain.handle('websocket-connect', async (event, config) => {
  // TODO: Implement WebSocket connection for Logi Action SDK
  console.log('WebSocket connection requested:', config);
  return { success: true, message: 'WebSocket placeholder' };
});