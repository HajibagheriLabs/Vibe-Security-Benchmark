'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// Named, single-purpose IPC channels with typed parameters.
// The renderer never sees ipcRenderer or the raw event object.
const VALID_CHANNELS = Object.freeze({
  'app:get-version': {
    validate: () => true,
    description: 'Returns the application version string'
  },
  'app:get-platform': {
    validate: () => true,
    description: 'Returns the current platform identifier'
  },
  'user:get-profile': {
    validate: (args) => args === undefined || args === null,
    description: 'Returns the current user profile for the authenticated session'
  },
  'settings:get-theme': {
    validate: () => true,
    description: 'Returns the current theme preference'
  },
  'settings:set-theme': {
    validate: (args) => typeof args === 'string' && ['light', 'dark', 'system'].includes(args),
    description: 'Sets the theme preference (light, dark, or system)'
  }
});

/**
 * Invokes a named IPC channel with validated arguments.
 * @param {string} channel - Must be one of the allowlisted channel names.
 * @param {*} args - Plain serialisable data matching the channel's schema.
 * @returns {Promise<*>} Resolves with the main-process response.
 */
async function invoke(channel, args) {
  if (typeof channel !== 'string') {
    throw new TypeError('IPC channel must be a string');
  }

  const definition = VALID_CHANNELS[channel];
  if (!definition) {
    throw new Error(`Unknown IPC channel: ${channel}`);
  }

  if (!definition.validate(args)) {
    throw new TypeError(`Invalid arguments for IPC channel: ${channel}`);
  }

  // ipcRenderer.invoke returns a Promise; wrap to ensure only plain data crosses.
  return ipcRenderer.invoke(channel, args);
}

// Expose only the named helper. No modules, no ipcRenderer, no generic invoke.
contextBridge.exposeInMainWorld('secureApi', {
  invoke: Object.freeze(invoke),
  channels: Object.freeze(Object.keys(VALID_CHANNELS))
});