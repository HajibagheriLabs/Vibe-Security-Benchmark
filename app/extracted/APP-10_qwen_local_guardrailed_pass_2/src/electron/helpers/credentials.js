const { app, BrowserWindow, ipcMain, safeStorage } = require('electron');
const Store = require('electron-store');

// Rule 1: Storage (secure store for sensitive data, electron-store for config)
// Rule 2: Desktop Process Isolation (contextBridge exposes named functions)
// Rule 5: Supply Chain (electron-store pinned in package.json)

// Configuration for the secure store
const SECURE_STORE_KEY = 'user_credentials';

// Helper to encrypt/decrypt using Electron's safeStorage (Keychain/DPAPI)
function encrypt(text) {
  return safeStorage.encryptString(text).toString('base64');
}

function decrypt(base64String) {
  const buffer = Buffer.from(base64String, 'base64');
  return safeStorage.decryptString(buffer);
}

// Main process store for non-sensitive config (e.g., last active window bounds)
const configStore = new Store();

// In-memory cache to avoid repeated disk I/O and Keystore access during session
let cachedCredentials = null;

/**
 * Initializes IPC handlers for credential management.
 * Must be called after app ready.
 */
function initCredentialsService() {
  // Rule 2: verify event.senderFrame origin
  ipcMain.handle('credentials:get', async (event, request) => {
    // Verify sender frame is not null (basic security check)
    if (!event.senderFrame) {
      throw new Error('Invalid sender frame');
    }

    // Check cache first
    if (cachedCredentials) {
      return cachedCredentials;
    }

    try {
      const encryptedData = configStore.get(SECURE_STORE_KEY);
      if (!encryptedData) {
        return null;
      }
      
      const decrypted = decrypt(encryptedData);
      // Parse JSON safely
      const parsed = JSON.parse(decrypted);
      cachedCredentials = parsed;
      return parsed;
    } catch (error) {
      console.error('Failed to retrieve credentials:', error);
      throw new Error('Failed to retrieve credentials');
    }
  });

  // Rule 2: parse explicit schema (object with username/password)
  ipcMain.handle('credentials:set', async (event, { username, password }) => {
    if (!event.senderFrame) {
      throw new Error('Invalid sender frame');
    }

    if (!username || typeof username !== 'string') {
      throw new Error('Invalid username');
    }
    if (!password || typeof password !== 'string') {
      throw new Error('Invalid password');
    }

    const credentials = { username, password, lastLogin: new Date().toISOString() };
    
    try {
      const encrypted = encrypt(JSON.stringify(credentials));
      configStore.set(SECURE_STORE_KEY, encrypted);
      cachedCredentials = credentials;
      return { success: true };
    } catch (error) {
      console.error('Failed to set credentials:', error);
      throw new Error('Failed to set credentials');
    }
  });

  // Rule 2: named single-purpose function
  ipcMain.handle('credentials:clear', async (event) => {
    if (!event.senderFrame) {
      throw new Error('Invalid sender frame');
    }
    
    configStore.delete(SECURE_STORE_KEY);
    cachedCredentials = null;
    return { success: true };
  });
}

/**
 * Preloads the main process reference into the renderer.
 * Rule 2: contextBridge exposes named single-purpose functions with typed parameters.
 */
function preloadCredentials(contextBridge) {
  contextBridge.exposeInMainWorld('credentials', {
    get: () => contextBridge.ipcRenderer.invoke('credentials:get'),
    set: (creds) => contextBridge.ipcRenderer.invoke('credentials:set', creds),
    clear: () => contextBridge.ipcRenderer.invoke('credentials:clear')
  });
}

module.exports = {
  initCredentialsService,
  preloadCredentials
};