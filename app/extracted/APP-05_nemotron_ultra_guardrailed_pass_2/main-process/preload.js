// Preload script for child windows - exposes no Node APIs, no ipcRenderer
// Only safe, serialized data can pass through contextBridge

const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('childWindowAPI', {
  // Example: notify parent of child window ready state
  notifyReady: () => {
    // Implementation would use a dedicated IPC channel if needed
    // For now, this is a no-op placeholder showing the pattern
  }
});