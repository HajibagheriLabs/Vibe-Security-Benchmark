const { contextBridge, ipcRenderer } = require('electron');

// Expose a single-purpose, typed IPC helper — no generic invoke, no Node objects.
contextBridge.exposeInMainWorld('appIpc', {
  // Example: fetch current user profile (no parameters, returns plain JSON)
  getProfile: () => ipcRenderer.invoke('app:get-profile'),

  // Example: update a user setting (typed parameter, returns plain JSON)
  updateSetting: (key, value) => {
    if (typeof key !== 'string' || typeof value !== 'string') {
      return Promise.reject(new Error('Invalid arguments: key and value must be strings'));
    }
    return ipcRenderer.invoke('app:update-setting', key, value);
  },

  // Example: request a one-time auth token for a scoped backend call
  requestAuthToken: (scope) => {
    const allowedScopes = ['payments', 'profile', 'sync'];
    if (!allowedScopes.includes(scope)) {
      return Promise.reject(new Error('Invalid scope'));
    }
    return ipcRenderer.invoke('app:request-auth-token', scope);
  }
});