// preload.js
const { contextBridge, ipcRenderer } = require('electron');

// Expose only a single, named, typed function for reading text files
contextBridge.exposeInMainWorld('fileSystem', {
  readTextFile: (filePath) => {
    // Validate input type before sending to main process
    if (typeof filePath !== 'string' || filePath.length === 0) {
      return Promise.reject(new Error('Invalid file path'));
    }
    
    // Send through IPC with explicit channel name
    return ipcRenderer.invoke('read-text-file', filePath);
  }
});