'use strict';

/**
 * Preload script exposing a minimal, typed credential API to the renderer.
 * 
 * SECURITY DECISIONS:
 * - Exposes only named, single-purpose functions with typed parameters.
 * - Never exposes ipcRenderer, the raw event object, or any Node.js module.
 * - Credential values are never returned to the renderer; only existence
 *   checks and mutation operations are exposed.
 * - All operations go through IPC handlers that validate sender origin.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('credentialStore', {
  /**
   * Check if a credential exists.
   * @param {string} key
   * @returns {Promise<boolean>}
   */
  hasCredential: (key) => {
    if (typeof key !== 'string' || key.length === 0) {
      return Promise.reject(new Error('Invalid credential key'));
    }
    return ipcRenderer.invoke('credential:has', key);
  },

  /**
   * Store a credential. The value is sent to the main process for encryption.
   * @param {string} key
   * @param {string} value
   * @returns {Promise<void>}
   */
  setCredential: (key, value) => {
    if (typeof key !== 'string' || key.length === 0) {
      return Promise.reject(new Error('Invalid credential key'));
    }
    if (typeof value !== 'string' || value.length === 0) {
      return Promise.reject(new Error('Invalid credential value'));
    }
    return ipcRenderer.invoke('credential:set', { key, value });
  },

  /**
   * Delete a credential.
   * @param {string} key
   * @returns {Promise<void>}
   */
  deleteCredential: (key) => {
    if (typeof key !== 'string' || key.length === 0) {
      return Promise.reject(new Error('Invalid credential key'));
    }
    return ipcRenderer.invoke('credential:delete', key);
  },

  /**
   * Wipe all credentials (logout).
   * @returns {Promise<void>}
   */
  wipeAll: () => {
    return ipcRenderer.invoke('credential:wipe');
  },

  /**
   * List stored credential keys (no values).
   * @returns {Promise<string[]>}
   */
  listKeys: () => {
    return ipcRenderer.invoke('credential:list-keys');
  },
});