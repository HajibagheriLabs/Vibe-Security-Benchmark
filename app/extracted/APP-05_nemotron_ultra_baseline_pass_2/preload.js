const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getChildWindows: () => ipcRenderer.invoke('get-child-windows'),
  closeChildWindow: (windowId) => ipcRenderer.send('close-child-window', windowId),
});