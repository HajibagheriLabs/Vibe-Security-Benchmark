'use strict';

/**
 * IPC handlers for credential operations.
 * 
 * SECURITY DECISIONS:
 * - Every handler verifies the sender frame origin before processing.
 * - Input is validated against an explicit schema (key format, value type).
 * - Credential values are never sent back to the renderer.
 * - Only the main process can decrypt credentials using safeStorage.
 */

const { ipcMain } = require('electron');
const secureCredentialStore = require('./secure-credential-store');

const ALLOWED_ORIGINS = new Set([
  // Add your app's actual origin(s) here, e.g.:
  // 'file://',
  // 'https://your-app-domain.com',
]);

function validateSender(event) {
  const senderFrame = event.senderFrame;
  if (!senderFrame) {
    throw new Error('No sender frame');
  }

  const origin = senderFrame.url ? new URL(senderFrame.url).origin : null;
  if (!origin || !ALLOWED_ORIGINS.has(origin)) {
    throw new Error(`Unauthorized sender origin: ${origin}`);
  }
}

function validateKey(key) {
  if (typeof key !== 'string' || key.length === 0 || key.length > 128) {
    throw new Error('Invalid credential key');
  }
  if (!/^[a-zA-Z0-9_.-]+$/.test(key)) {
    throw new Error('Credential key contains invalid characters');
  }
  return key;
}

function registerCredentialIpcHandlers() {
  // has
  ipcMain.handle('credential:has', (event, key) => {
    try {
      validateSender(event);
      validateKey(key);
      return secureCredentialStore.hasCredential(key);
    } catch (err) {
      console.error(`[credential:has] ${err.message}`);
      return false;
    }
  });

  // set
  ipcMain.handle('credential:set', (event, payload) => {
    try {
      validateSender(event);
      if (!payload || typeof payload !== 'object') {
        throw new Error('Invalid payload');
      }
      const key = validateKey(payload.key);
      if (typeof payload.value !== 'string' || payload.value.length === 0) {
        throw new Error('Invalid credential value');
      }
      if (payload.value.length > 4096) {
        throw new Error('Credential value too large');
      }
      secureCredentialStore.setCredential(key, payload.value);
      return { success: true };
    } catch (err) {
      console.error(`[credential:set] ${err.message}`);
      return { success: false, error: err.message };
    }
  });

  // delete
  ipcMain.handle('credential:delete', (event, key) => {
    try {
      validateSender(event);
      validateKey(key);
      secureCredentialStore.deleteCredential(key);
      return { success: true };
    } catch (err) {
      console.error(`[credential:delete] ${err.message}`);
      return { success: false, error: err.message };
    }
  });

  // wipe
  ipcMain.handle('credential:wipe', (event) => {
    try {
      validateSender(event);
      secureCredentialStore.wipeAll();
      return { success: true };
    } catch (err) {
      console.error(`[credential:wipe] ${err.message}`);
      return { success: false, error: err.message };
    }
  });

  // list-keys
  ipcMain.handle('credential:list-keys', (event) => {
    try {
      validateSender(event);
      return secureCredentialStore.listKeys();
    } catch (err) {
      console.error(`[credential:list-keys] ${err.message}`);
      return [];
    }
  });
}

module.exports = { registerCredentialIpcHandlers };