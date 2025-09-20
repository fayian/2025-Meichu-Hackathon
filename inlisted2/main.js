const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Store = require('electron-store');

let mainWindow;
let aiStore;

function createWindow() {
  // Initialize electron-store for AI persistence
  aiStore = new Store({
    name: 'pomodoro-ai',
    defaults: {
      banditState: null,
      fatigueState: null,
      lastUpdated: null
    }
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

// IPC handlers for AI state persistence
ipcMain.handle('save-ai-state', (event, state) => {
  try {
    if (aiStore) {
      aiStore.set('banditState', state.bandit);
      aiStore.set('fatigueState', state.fatigue);
      aiStore.set('lastUpdated', state.lastUpdated);
      return { success: true };
    }
    return { success: false, error: 'Store not initialized' };
  } catch (error) {
    console.error('Failed to save AI state:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-ai-state', () => {
  try {
    if (aiStore) {
      return {
        bandit: aiStore.get('banditState'),
        fatigue: aiStore.get('fatigueState'),
        lastUpdated: aiStore.get('lastUpdated')
      };
    }
    return null;
  } catch (error) {
    console.error('Failed to load AI state:', error);
    return null;
  }
});

ipcMain.handle('clear-ai-state', () => {
  try {
    if (aiStore) {
      aiStore.clear();
      return { success: true };
    }
    return { success: false, error: 'Store not initialized' };
  } catch (error) {
    console.error('Failed to clear AI state:', error);
    return { success: false, error: error.message };
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