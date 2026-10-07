const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  send: (channel, ...args) => ipcRenderer.send(channel, ...args),
  on: (channel, func) => {
    // Strip out the listener from the callback when we receive an event
    // so the renderer doesn't get a function it can't serialize.
    ipcRenderer.on(channel, (event, ...args) => func(...args));
  }
});