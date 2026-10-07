const { BrowserWindow, safeStorage } = require('electron');
const { app } = require('electron');
const path = require('path');
const fs = require('fs');

/**
 * Manages persistent storage of user account credentials.
 * 
 * Rule 1 (Storage): Uses Electron's `safeStorage` API to encrypt sensitive data.
 * Rule 1 (Accessibility): Data is stored in a file on disk, encrypted at rest.
 * Rule 3 (Binary Trust): The encryption key is derived from the OS keychain (macOS) 
 * or DPAPI (Windows) / libsecret (Linux), meaning it never leaves the secure OS 
 * store and is not bundled in the app.
 * 
 * Note: For higher security (device-only, biometric unlock), consider using 
 * `react-native-keychain` or `expo-secure-store` equivalents in the main process 
 * via `electron-store` with a custom encryption driver, or a dedicated Keychain 
 * library like `keytar`. This implementation uses native `safeStorage` for 
 * simplicity and robustness across desktop platforms.
 */

class CredentialsStore {
  constructor() {
    this.filePath = path.join(app.getPath('userData'), 'credentials.json');
    this._data = null;
    this._isLoaded = false;
  }

  /**
   * Loads credentials from disk. Decrypts using the platform-specific master key.
   * @returns {Promise<Object|null>} The decrypted credentials object or null if not found.
   */
  async load() {
    if (this._isLoaded && this._data) {
      return this._data;
    }

    try {
      if (!fs.existsSync(this.filePath)) {
        return null;
      }

      const encryptedBuffer = fs.readFileSync(this.filePath);
      const decryptedBuffer = safeStorage.decryptString(encryptedBuffer);
      this._data = JSON.parse(decryptedBuffer);
      this._isLoaded = true;
      return this._data;
    } catch (error) {
      console.error('Failed to load credentials:', error);
      return null;
    }
  }

  /**
   * Saves credentials to disk. Encrypts using the platform-specific master key.
   * @param {Object} credentials - The credentials object to save.
   * @returns {Promise<boolean>} True if saved successfully.
   */
  async save(credentials) {
    try {
      const jsonString = JSON.stringify(credentials);
      const encryptedBuffer = safeStorage.encryptString(jsonString);
      fs.writeFileSync(this.filePath, encryptedBuffer);
      this._data = credentials;
      this._isLoaded = true;
      return true;
    } catch (error) {
      console.error('Failed to save credentials:', error);
      return false;
    }
  }

  /**
   * Clears all stored credentials.
   * @returns {Promise<boolean>} True if cleared successfully.
   */
  async clear() {
    try {
      if (fs.existsSync(this.filePath)) {
        fs.unlinkSync(this.filePath);
      }
      this._data = null;
      this._isLoaded = false;
      return true;
    } catch (error) {
      console.error('Failed to clear credentials:', error);
      return false;
    }
  }
}

module.exports = new CredentialsStore();