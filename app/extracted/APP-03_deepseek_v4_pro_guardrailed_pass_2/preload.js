// preload.js
const { contextBridge, ipcRenderer } = require('electron');

// Named, single-purpose IPC functions with typed parameters.
// No generic invoke(channel, ...args) is exposed.
contextBridge.exposeInMainWorld('api', {
  // Example: fetch user profile by ID (uuid validated in main process)
  getUserProfile: (userId) => {
    if (typeof userId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      return Promise.reject(new Error('Invalid user ID format'));
    }
    return ipcRenderer.invoke('user:getProfile', { userId });
  },

  // Example: save a setting with a bounded string value
  saveSetting: (key, value) => {
    if (typeof key !== 'string' || key.length > 64) {
      return Promise.reject(new Error('Invalid setting key'));
    }
    if (typeof value !== 'string' || value.length > 1024) {
      return Promise.reject(new Error('Invalid setting value'));
    }
    return ipcRenderer.invoke('settings:save', { key, value });
  },

  // Example: subscribe to a typed event stream
  onUserStatusChanged: (callback) => {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }
    const handler = (_event, status) => {
      // Wrap the raw IpcRendererEvent so it never reaches renderer code
      callback(status);
    };
    ipcRenderer.on('user:statusChanged', handler);
    // Return an unsubscribe function
    return () => ipcRenderer.removeListener('user:statusChanged', handler);
  }
});