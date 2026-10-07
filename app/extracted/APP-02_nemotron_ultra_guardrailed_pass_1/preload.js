const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('fsApi', {
  readText: (relativePath) => ipcRenderer.invoke('fs:readText', relativePath),
  pickFile: () => ipcRenderer.invoke('fs:pickFile')
});