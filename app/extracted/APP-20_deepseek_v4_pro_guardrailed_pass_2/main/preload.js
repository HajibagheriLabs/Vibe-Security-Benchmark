// main/preload.js
'use strict';

const { contextBridge, ipcRenderer } = require('electron');

/**
 * Security: expose only named, single-purpose functions (§2).
 * No raw ipcRenderer, no generic invoke, no Node modules.
 */
contextBridge.exposeInMainWorld('appNavigation', {
  /**
   * Subscribe to navigation commands from the main process.
   * @param {function} callback - Receives a typed navigation command object.
   * @returns {function} Unsubscribe function.
   */
  onNavigate: (callback) => {
    if (typeof callback !== 'function') {
      throw new TypeError('Callback must be a function');
    }

    const handler = (_event, command) => {
      // Validate the command shape before passing to renderer.
      if (command && typeof command.type === 'string') {
        callback(command);
      }
    };

    ipcRenderer.on('navigate', handler);
    return () => ipcRenderer.removeListener('navigate', handler);
  }
});