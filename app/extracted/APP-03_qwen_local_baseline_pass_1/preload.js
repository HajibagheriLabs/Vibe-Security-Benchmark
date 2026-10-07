const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  send: (channel, ...args) => ipcRenderer.send(channel, ...args),
  on: (channel, func) => {
    // Strip event as it can only accept arguments
    const subscription = (_event, ...args) => func(...args);
    ipcRenderer.on(channel, subscription);
    // Return an unsubscribe function
    return () => ipcRenderer.removeListener(channel, subscription);
  },
  receive: (channel, func) => {
    const subscription = (_event, ...args) => func(...args);
    ipcRenderer.on(channel, subscription);
    return () => ipcRenderer.removeListener(channel, subscription);
  }
});