const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Usage statistics
  getUsageStats: (period) => ipcRenderer.invoke('get-usage-stats', period),
  
  // Tracking controls
  startTracking: () => ipcRenderer.invoke('start-tracking'),
  stopTracking: () => ipcRenderer.invoke('stop-tracking'),
  isTracking: () => ipcRenderer.invoke('is-tracking'),
  
  // Data management
  clearData: () => ipcRenderer.invoke('clear-data'),
  
  // Listen for updates
  onUsageUpdated: (callback) => {
    ipcRenderer.on('usage-updated', callback);
  },
  
  // Remove listeners
  removeUsageUpdatedListener: (callback) => {
    ipcRenderer.removeListener('usage-updated', callback);
  }
});