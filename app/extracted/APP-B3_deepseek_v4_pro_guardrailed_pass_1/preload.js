// Preload script: exposes a minimal, typed API for theme persistence.
// No Node.js modules, ipcRenderer, or generic invoke are exposed.

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('themeAPI', {
  /**
   * Retrieve the persisted theme preference.
   * @returns {Promise<string>}
   */
  getTheme: () => ipcRenderer.invoke('theme:get'),

  /**
   * Persist the theme preference.
   * @param {string} theme - 'light' or 'dark'
   * @returns {Promise<string>}
   */
  setTheme: (theme) => ipcRenderer.invoke('theme:set', theme)
});