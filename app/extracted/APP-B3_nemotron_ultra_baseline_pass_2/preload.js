// Preload Script - Secure bridge between main and renderer
// Exposes theme-related IPC APIs to renderer process

const { contextBridge, ipcRenderer } = require('electron');

// Expose theme API to renderer
contextBridge.exposeInMainWorld('themeAPI', {
  // Get current theme from main process (if stored there)
  getTheme: () => ipcRenderer.invoke('theme:get'),
  
  // Set theme in main process (for window chrome, native menus, etc.)
  setTheme: (theme) => ipcRenderer.invoke('theme:set', theme),
  
  // Toggle theme
  toggleTheme: () => ipcRenderer.invoke('theme:toggle'),
  
  // Listen for theme changes from main process
  onThemeChange: (callback) => {
    const handler = (_event, theme) => callback(theme);
    ipcRenderer.on('theme:changed', handler);
    return () => ipcRenderer.off('theme:changed', handler);
  },
  
  // Get system theme
  getSystemTheme: () => ipcRenderer.invoke('theme:getSystem'),
});

// Expose storage API for main-process persistence (optional)
contextBridge.exposeInMainWorld('storageAPI', {
  get: (key) => ipcRenderer.invoke('storage:get', key),
  set: (key, value) => ipcRenderer.invoke('storage:set', key, value),
  delete: (key) => ipcRenderer.invoke('storage:delete', key),
});