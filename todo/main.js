const { app, BrowserWindow, ipcMain, Menu, Tray } = require('electron');
const path = require('path');
const Store = require('electron-store');

// 初始化資料存儲
const store = new Store();

let mainWindow;
let tray = null;

function createWindow() {
  // 建立瀏覽器視窗
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false, // 先不顯示，等載入完成
    icon: path.join(__dirname, 'assets/icons/icon.png')
  });

  // 載入應用程式
  mainWindow.loadFile('src/index.html');

  // 視窗載入完成後顯示
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // 開發模式下開啟開發者工具
    if (process.argv.includes('--dev')) {
      mainWindow.webContents.openDevTools();
    }
  });

  // 視窗關閉事件
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 最小化到系統託盤
  mainWindow.on('minimize', (event) => {
    if (process.platform === 'darwin') {
      // macOS 不隱藏到託盤
      return;
    }
    
    event.preventDefault();
    mainWindow.hide();
    createTray();
  });
}

// 建立系統託盤
function createTray() {
  if (tray) return;
  
  tray = new Tray(path.join(__dirname, 'assets/icons/tray-icon.png'));
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '顯示應用程式',
      click: () => {
        mainWindow.show();
        tray.destroy();
        tray = null;
      }
    },
    { type: 'separator' },
    {
      label: '快速專注',
      click: () => {
        mainWindow.webContents.send('quick-focus');
        mainWindow.show();
      }
    },
    {
      label: '休息提醒',
      click: () => {
        mainWindow.webContents.send('break-reminder');
        mainWindow.show();
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.quit();
      }
    }
  ]);
  
  tray.setContextMenu(contextMenu);
  tray.setToolTip('MX Creative Console Assistant');
  
  // 雙擊託盤圖示顯示視窗
  tray.on('double-click', () => {
    mainWindow.show();
    tray.destroy();
    tray = null;
  });
}

// 建立應用程式選單
function createMenu() {
  const template = [
    {
      label: '檔案',
      submenu: [
        {
          label: '新增任務',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('new-task');
          }
        },
        { type: 'separator' },
        {
          label: '設定',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            mainWindow.webContents.send('open-settings');
          }
        },
        { type: 'separator' },
        {
          label: process.platform === 'darwin' ? '退出' : '結束',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: '專注',
      submenu: [
        {
          label: '開始專注',
          accelerator: 'CmdOrCtrl+F',
          click: () => {
            mainWindow.webContents.send('start-focus');
          }
        },
        {
          label: '暫停專注',
          accelerator: 'CmdOrCtrl+P',
          click: () => {
            mainWindow.webContents.send('pause-focus');
          }
        },
        {
          label: '休息時間',
          accelerator: 'CmdOrCtrl+B',
          click: () => {
            mainWindow.webContents.send('break-time');
          }
        }
      ]
    },
    {
      label: '檢視',
      submenu: [
        {
          label: '重新載入',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            mainWindow.reload();
          }
        },
        {
          label: '開發者工具',
          accelerator: process.platform === 'darwin' ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
          click: () => {
            mainWindow.webContents.toggleDevTools();
          }
        },
        { type: 'separator' },
        {
          label: '實際大小',
          accelerator: 'CmdOrCtrl+0',
          click: () => {
            mainWindow.webContents.setZoomLevel(0);
          }
        },
        {
          label: '放大',
          accelerator: 'CmdOrCtrl+Plus',
          click: () => {
            const currentZoom = mainWindow.webContents.getZoomLevel();
            mainWindow.webContents.setZoomLevel(currentZoom + 1);
          }
        },
        {
          label: '縮小',
          accelerator: 'CmdOrCtrl+-',
          click: () => {
            const currentZoom = mainWindow.webContents.getZoomLevel();
            mainWindow.webContents.setZoomLevel(currentZoom - 1);
          }
        }
      ]
    },
    {
      label: '幫助',
      submenu: [
        {
          label: '關於',
          click: () => {
            mainWindow.webContents.send('show-about');
          }
        },
        {
          label: '使用說明',
          click: () => {
            mainWindow.webContents.send('show-help');
          }
        }
      ]
    }
  ];

  // macOS 選單調整
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        {
          label: '關於 ' + app.getName(),
          role: 'about'
        },
        { type: 'separator' },
        {
          label: '服務',
          role: 'services',
          submenu: []
        },
        { type: 'separator' },
        {
          label: '隱藏 ' + app.getName(),
          accelerator: 'Command+H',
          role: 'hide'
        },
        {
          label: '隱藏其他',
          accelerator: 'Command+Shift+H',
          role: 'hideothers'
        },
        {
          label: '全部顯示',
          role: 'unhide'
        },
        { type: 'separator' },
        {
          label: '退出',
          accelerator: 'Command+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC 通信處理
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-user-data', () => {
  return store.get('userData', {});
});

ipcMain.handle('save-user-data', (event, data) => {
  store.set('userData', data);
  return true;
});

// MX Console 模擬事件（實際需要整合 Logitech SDK）
function simulateMXConsoleEvents() {
  if (!mainWindow) return;
  
  // 模擬旋鈕旋轉
  setInterval(() => {
    const knobData = {
      knob: Math.floor(Math.random() * 3) + 1,
      value: Math.floor(Math.random() * 100),
      direction: Math.random() > 0.5 ? 'clockwise' : 'counterclockwise'
    };
    mainWindow.webContents.send('mx-console-knob', knobData);
  }, 5000);
  
  // 模擬按鍵按下（僅開發模式）
  if (process.argv.includes('--dev')) {
    setInterval(() => {
      const buttonData = {
        button: Math.floor(Math.random() * 6) + 1,
        action: 'press'
      };
      mainWindow.webContents.send('mx-console-button', buttonData);
    }, 8000);
  }
}

// 應用程式事件處理
app.whenReady().then(() => {
  createWindow();
  createMenu();
  
  // 模擬 MX Console 事件（開發用）
  simulateMXConsoleEvents();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  // 清理系統託盤
  if (tray) {
    tray.destroy();
    tray = null;
  }
});

// 防止多個實例
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // 有人嘗試運行第二個實例，聚焦現有視窗
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}