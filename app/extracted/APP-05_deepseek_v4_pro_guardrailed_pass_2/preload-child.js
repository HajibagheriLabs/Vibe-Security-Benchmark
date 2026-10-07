const { contextBridge } = require('electron');

// Security: Expose only named, single-purpose functions with typed parameters
// Never expose ipcRenderer, Node.js modules, or generic invoke functions
contextBridge.exposeInMainWorld('childWindowAPI', {
  openExternalLink: (url) => {
    // Validate URL is a string before sending to main process
    if (typeof url !== 'string') {
      return Promise.reject(new Error('URL must be a string'));
    }
    return window.ipcRenderer.invoke('open-external-link', url);
  },
  
  getWindowInfo: () => {
    return {
      type: 'child',
      timestamp: Date.now()
    };
  }
});

// Security: Freeze the exposed API to prevent modification
Object.freeze(window.childWindowAPI);