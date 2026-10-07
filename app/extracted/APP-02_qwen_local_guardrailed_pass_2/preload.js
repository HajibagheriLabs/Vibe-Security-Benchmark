// preload.js
const { contextBridge, ipcRenderer } = require('electron');

// §2. DESKTOP PROCESS ISOLATION: Expose named single-purpose functions
// Only expose what the renderer needs: read a file by relative path
contextBridge.exposeInMainWorld('electronAPI', {
  readLocalFile: (relativePath) => {
    // Type check: ensure relativePath is a string
    if (typeof relativePath !== 'string') {
      throw new TypeError('filePath must be a string');
    }
    return ipcRenderer.invoke('read-local-file', relativePath);
  }
});