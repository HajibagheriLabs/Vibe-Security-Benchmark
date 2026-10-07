const { contextBridge, ipcRenderer } = require('electron');

// Expose safe APIs to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  createChildWindow: (options) => ipcRenderer.invoke('create-child-window', options),
  closeChildWindow: (windowId) => ipcRenderer.invoke('close-child-window', windowId),
  getChildWindows: () => ipcRenderer.invoke('get-child-windows')
});