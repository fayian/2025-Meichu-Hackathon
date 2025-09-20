const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // AI state persistence
  saveAIState: (state) => ipcRenderer.invoke('save-ai-state', state),
  loadAIState: () => ipcRenderer.invoke('load-ai-state'),
  clearAIState: () => ipcRenderer.invoke('clear-ai-state'),
  
  // Placeholder for future WebSocket integration
  connectWebSocket: (config) => ipcRenderer.invoke('websocket-connect', config),
  
  // Notification API for health reminders and pomodoro
  showNotification: (title, body) => {
    new Notification(title, { body });
  },
  
  // Screenshot functionality placeholder (for future LLM integration)
  captureScreen: () => {
    // TODO: Implement screen capture for LLM Q&A feature
    console.log('Screen capture requested');
    return Promise.resolve({ success: true, message: 'Screenshot placeholder' });
  }
});