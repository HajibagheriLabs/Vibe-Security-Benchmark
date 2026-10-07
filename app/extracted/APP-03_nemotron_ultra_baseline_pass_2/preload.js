const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ipc', {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
});