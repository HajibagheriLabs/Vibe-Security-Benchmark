// preload.js
const { contextBridge, ipcRenderer } = require('electron');

// Security-relevant decision: Expose only a named, single-purpose function with typed parameters.
contextBridge.exposeInMainWorld('appAPI', {
  openExternalUrl: (url) => ipcRenderer.invoke('open-external-url', url),
});