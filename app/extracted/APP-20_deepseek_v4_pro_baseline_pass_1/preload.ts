import { contextBridge, ipcRenderer } from 'electron';

// Expose protocol event listeners to the renderer
contextBridge.exposeInMainWorld('protocolAPI', {
  onOpen: (callback: (data: any) => void) => {
    ipcRenderer.on('protocol:open', (_event, data) => callback(data));
  },
  onSettings: (callback: (data: any) => void) => {
    ipcRenderer.on('protocol:settings', (_event, data) => callback(data));
  },
  onAuth: (callback: (data: any) => void) => {
    ipcRenderer.on('protocol:auth', (_event, data) => callback(data));
  },
  removeAllListeners: () => {
    ipcRenderer.removeAllListeners('protocol:open');
    ipcRenderer.removeAllListeners('protocol:settings');
    ipcRenderer.removeAllListeners('protocol:auth');
  }
});