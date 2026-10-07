const { contextBridge } = require('electron');

// Security: Child windows get minimal API surface
contextBridge.exposeInMainWorld('childWindowAPI', {
  // No privileged operations exposed to child windows
  getWindowInfo: () => ({
    isChild: true,
    timestamp: Date.now()
  })
});