const { contextBridge, ipcRenderer } = require('electron');

// Security: Expose only named, single-purpose, typed functions
contextBridge.exposeInMainWorld('electronAPI', {
  openExternalUrl: (url) => {
    // Security: Validate input type before sending over IPC
    if (typeof url !== 'string') {
      return Promise.reject(new Error('URL must be a string'));
    }
    return ipcRenderer.invoke('open-external-url', url);
  }
});