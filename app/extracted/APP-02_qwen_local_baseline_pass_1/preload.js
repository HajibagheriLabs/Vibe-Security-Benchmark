const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  readTextFile: (filePath) => ipcRenderer.invoke('read-text-file', filePath),
});