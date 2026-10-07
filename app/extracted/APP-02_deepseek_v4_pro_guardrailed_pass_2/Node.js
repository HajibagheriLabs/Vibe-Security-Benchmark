// preload.js
const { contextBridge, ipcRenderer } = require('electron');

// Expose a single, named, typed function for reading text files.
// The renderer never receives the raw IpcRendererEvent or any Node.js objects.
contextBridge.exposeInMainWorld('fileAPI', {
  readTextFile: (filePath) => {
    // Validate the argument is a string before sending over IPC.
    // This prevents prototype pollution and type confusion attacks.
    if (typeof filePath !== 'string' || filePath.length === 0) {
      return Promise.reject(new Error('Invalid file path'));
    }
    
    // Send a single-purpose IPC message with a plain serializable argument.
    return ipcRenderer.invoke('read-text-file', filePath);
  }
});