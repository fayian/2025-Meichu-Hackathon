const { contextBridge, ipcRenderer } = require('electron');

// 暴露受保護的方法給渲染程序
contextBridge.exposeInMainWorld('electronAPI', {
  // 應用程式基本功能
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // 資料存儲
  getUserData: () => ipcRenderer.invoke('get-user-data'),
  saveUserData: (data) => ipcRenderer.invoke('save-user-data', data),
  
  // MX Console 事件監聽
  onMXConsoleKnob: (callback) => {
    ipcRenderer.on('mx-console-knob', (event, data) => callback(data));
  },
  
  onMXConsoleButton: (callback) => {
    ipcRenderer.on('mx-console-button', (event, data) => callback(data));
  },
  
  // 應用程式事件監聽
  onQuickFocus: (callback) => {
    ipcRenderer.on('quick-focus', callback);
  },
  
  onBreakReminder: (callback) => {
    ipcRenderer.on('break-reminder', callback);
  },
  
  onNewTask: (callback) => {
    ipcRenderer.on('new-task', callback);
  },
  
  onOpenSettings: (callback) => {
    ipcRenderer.on('open-settings', callback);
  },
  
  onStartFocus: (callback) => {
    ipcRenderer.on('start-focus', callback);
  },
  
  onPauseFocus: (callback) => {
    ipcRenderer.on('pause-focus', callback);
  },
  
  onBreakTime: (callback) => {
    ipcRenderer.on('break-time', callback);
  },
  
  onShowAbout: (callback) => {
    ipcRenderer.on('show-about', callback);
  },
  
  onShowHelp: (callback) => {
    ipcRenderer.on('show-help', callback);
  },
  
  // 移除事件監聽器
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});

// 應用程式資訊
contextBridge.exposeInMainWorld('appInfo', {
  platform: process.platform,
  version: process.versions
});