const { contextBridge, ipcRenderer } = require('electron');

// Security: Expose only named, typed functions
contextBridge.exposeInMainWorld('electronAPI', {
  createChildWindow: (url) => {
    // Security: Validate input type before sending to main process
    if (typeof url !== 'string') {
      return Promise.reject(new Error('URL must be a string'));
    }
    
    // Security: Wrap IPC call to prevent event object leakage
    return ipcRenderer.invoke('create-child-window', url);
  }
});