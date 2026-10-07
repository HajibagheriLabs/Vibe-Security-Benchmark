const { contextBridge, ipcRenderer } = require('electron');

// Expose a single-purpose function to the renderer
contextBridge.exposeInMainWorld('electronAPI', {
  openChildWindow: (url) => {
    // Validate URL format before sending to main
    try {
      new URL(url);
      ipcRenderer.send('open-child-window', url);
    } catch (e) {
      console.error('Invalid URL provided to openChildWindow');
    }
  },
  // Example of listening for an event from the child window
  onChildWindowClosed: (callback) => {
    ipcRenderer.on('child-window-closed', (event, data) => {
      callback(data);
    });
  }
});