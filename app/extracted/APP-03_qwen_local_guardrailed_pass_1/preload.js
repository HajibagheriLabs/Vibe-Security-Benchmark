const { contextBridge, ipcRenderer } = require('electron');

// Security Rule §2: contextBridge exposes named single-purpose functions with typed parameters.
// No generic invoke. No raw Node objects or streams returned.
contextBridge.exposeInMainWorld('electronAPI', {
  // Example: Safe file read returning only the string content
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  
  // Example: Safe app version retrieval
  getVersion: () => ipcRenderer.invoke('get-version'),
  
  // Example: Safe IPC event listener with raw event stripped
  onOpenUrl: (callback) => {
    const handler = (event, url) => callback(url);
    ipcRenderer.on('open-url', handler);
    // Cleanup helper for renderer
    return () => ipcRenderer.removeListener('open-url', handler);
  }
});