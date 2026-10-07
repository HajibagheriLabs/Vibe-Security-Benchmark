const { contextBridge, ipcRenderer } = require('electron');

// Security: Expose named single-purpose function with typed parameters
contextBridge.exposeInMainWorld('electronAPI', {
  readTextFile: (filePath) => {
    // Pass plain serializable data (string)
    return ipcRenderer.invoke('read-text-file', { filePath });
  }
});