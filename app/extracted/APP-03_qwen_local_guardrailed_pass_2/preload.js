const { contextBridge, ipcRenderer } = require('electron');

// Expose a single-purpose invoke function with a typed schema
contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (channel, args) => {
    // Sanitize channel to prevent arbitrary method calls
    const validChannels = ['get-version', 'open-file', 'save-file', 'get-config'];
    if (!validChannels.includes(channel)) {
      return Promise.reject(new Error(`Invalid channel: ${channel}`));
    }
    return ipcRenderer.invoke(channel, args);
  },
  // Expose a listener with a typed schema
  on: (channel, callback) => {
    const validChannels = ['theme-changed', 'notification'];
    if (!validChannels.includes(channel)) {
      return Promise.reject(new Error(`Invalid channel: ${channel}`));
    }
    // Wrap event listener so raw IpcRendererEvent never reaches renderer
    const subscription = (event, ...args) => callback(...args);
    ipcRenderer.on(channel, subscription);
    return () => ipcRenderer.removeListener(channel, subscription);
  }
});