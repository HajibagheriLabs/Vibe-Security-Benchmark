const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openChildWindow: (url, name, features) => {
    return ipcRenderer.invoke('request-child-window', { url, name, features });
  },
  getMainWindowId: () => {
    return ipcRenderer.invoke('get-main-window-id');
  },
  onChildWindowClosed: (callback) => {
    ipcRenderer.on('child-window-closed', (event, data) => callback(data));
    return () => ipcRenderer.off('child-window-closed', callback);
  },
});