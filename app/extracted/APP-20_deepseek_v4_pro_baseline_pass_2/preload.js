// preload.js
const { contextBridge, ipcRenderer } = require('electron');

// Expose protocol event listeners to the renderer
contextBridge.exposeInMainWorld('protocolAPI', {
  onOpen: (callback) => ipcRenderer.on('protocol:open', (event, params) => callback(params)),
  onSettings: (callback) => ipcRenderer.on('protocol:settings', (event, params) => callback(params)),
  onAuth: (callback) => ipcRenderer.on('protocol:auth', (event, params) => callback(params)),
  onUnknownAction: (callback) => ipcRenderer.on('protocol:unknown-action', (event, data) => callback(data))
});