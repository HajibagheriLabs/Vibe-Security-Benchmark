'use strict';

/**
 * Secure credential persistence for Electron applications.
 * 
 * SECURITY DECISIONS:
 * - Uses Electron safeStorage (OS-backed encryption: Keychain on macOS,
 *   DPAPI on Windows, libsecret on Linux) for all persisted credentials.
 * - Never falls back to plaintext storage if safeStorage is unavailable.
 * - Stores only the refresh credential; access tokens remain in memory.
 * - Wipes all stored credentials on logout and on first launch after install.
 * - Never logs or exposes credential values through IPC or contextBridge.
 */

const { app, safeStorage } = require('electron');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const STORE_FILENAME = 'credentials.enc';
const INSTALL_MARKER_FILENAME = '.install-marker';

class SecureCredentialStore {
  constructor() {
    this._storePath = null;
    this._installMarkerPath = null;
    this._memoryCache = new Map();
    this._initialized = false;
  }

  /**
   * Initialize the store. Must be called after app 'ready' event.
   * @throws {Error} If safeStorage is unavailable or initialization fails.
   */
  initialize() {
    if (this._initialized) return;

    if (!app.isReady()) {
      throw new Error('SecureCredentialStore must be initialized after app is ready');
    }

    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error(
        'OS-level encryption is unavailable. Refusing to persist credentials insecurely.'
      );
    }

    const userDataPath = app.getPath('userData');
    this._storePath = path.join(userDataPath, STORE_FILENAME);
    this._installMarkerPath = path.join(userDataPath, INSTALL_MARKER_FILENAME);

    this._handleFirstLaunchAfterInstall();
    this._loadFromDisk();

    this._initialized = true;
  }

  /**
   * Store a credential value under a named key.
   * @param {string} key - Identifier for the credential (e.g., 'refresh_token').
   * @param {string} value - The credential value to persist.
   */
  setCredential(key, value) {
    this._assertInitialized();
    this._assertValidKey(key);

    if (typeof value !== 'string' || value.length === 0) {
      throw new Error('Credential value must be a non-empty string');
    }

    const encrypted = safeStorage.encryptString(value);
    this._memoryCache.set(key, encrypted);
    this._persistToDisk();
  }

  /**
   * Retrieve a credential value by key.
   * @param {string} key - Identifier for the credential.
   * @returns {string|null} The decrypted credential, or null if not found.
   */
  getCredential(key) {
    this._assertInitialized();
    this._assertValidKey(key);

    const encrypted = this._memoryCache.get(key);
    if (!encrypted) return null;

    return safeStorage.decryptString(encrypted);
  }

  /**
   * Remove a specific credential.
   * @param {string} key - Identifier for the credential to remove.
   */
  deleteCredential(key) {
    this._assertInitialized();
    this._assertValidKey(key);

    this._memoryCache.delete(key);
    this._persistToDisk();
  }

  /**
   * Wipe all stored credentials. Call on logout.
   */
  wipeAll() {
    this._assertInitialized();

    this._memoryCache.clear();
    this._persistToDisk();
  }

  /**
   * Check if a credential exists.
   * @param {string} key - Identifier for the credential.
   * @returns {boolean}
   */
  hasCredential(key) {
    this._assertInitialized();
    this._assertValidKey(key);
    return this._memoryCache.has(key);
  }

  /**
   * List all stored credential keys (without values).
   * @returns {string[]}
   */
  listKeys() {
    this._assertInitialized();
    return Array.from(this._memoryCache.keys());
  }

  // ---------------------------------------------------------------------------
  // Private methods
  // ---------------------------------------------------------------------------

  _assertInitialized() {
    if (!this._initialized) {
      throw new Error('SecureCredentialStore is not initialized. Call initialize() first.');
    }
  }

  _assertValidKey(key) {
    if (typeof key !== 'string' || key.length === 0 || key.length > 128) {
      throw new Error('Credential key must be a non-empty string (max 128 chars)');
    }
    if (!/^[a-zA-Z0-9_.-]+$/.test(key)) {
      throw new Error('Credential key contains invalid characters');
    }
  }

  /**
   * Detect first launch after install and wipe any stale credentials.
   * iOS Keychain persists across uninstall; this ensures we don't reuse
   * credentials from a previous installation on the same device.
   */
  _handleFirstLaunchAfterInstall() {
    try {
      if (!fs.existsSync(this._installMarkerPath)) {
        // First launch after install: wipe any existing store file
        if (fs.existsSync(this._storePath)) {
          fs.unlinkSync(this._storePath);
        }
        // Create the marker
        fs.writeFileSync(this._installMarkerPath, 'installed', { mode: 0o600 });
      }
    } catch (err) {
      // If we can't create the marker, fail closed — don't risk stale credentials
      throw new Error(`Failed to establish install marker: ${err.message}`);
    }
  }

  _loadFromDisk() {
    try {
      if (!fs.existsSync(this._storePath)) {
        return; // No stored credentials
      }

      const rawData = fs.readFileSync(this._storePath);
      const parsed = JSON.parse(rawData.toString('utf8'));

      if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.entries)) {
        throw new Error('Corrupted credential store format');
      }

      // Validate integrity with checksum
      const expectedChecksum = parsed.checksum;
      const actualChecksum = this._computeChecksum(parsed.entries);

      if (expectedChecksum !== actualChecksum) {
        throw new Error('Credential store integrity check failed');
      }

      for (const entry of parsed.entries) {
        if (
          !entry ||
          typeof entry.key !== 'string' ||
          !Buffer.isBuffer(entry.value) ||
          entry.value.length === 0
        ) {
          throw new Error('Invalid entry in credential store');
        }
        this._memoryCache.set(entry.key, Buffer.from(entry.value));
      }
    } catch (err) {
      // Fail closed: clear cache and don't load potentially corrupted data
      this._memoryCache.clear();
      if (err.code !== 'ENOENT') {
        // Log the error but don't expose credential data
        console.error(`[SecureCredentialStore] Failed to load credentials: ${err.message}`);
      }
    }
  }

  _persistToDisk() {
    const entries = [];
    for (const [key, encryptedBuffer] of this._memoryCache.entries()) {
      entries.push({
        key,
        value: encryptedBuffer.toString('base64'),
      });
    }

    const checksum = this._computeChecksum(entries);
    const payload = JSON.stringify({ entries, checksum });

    // Write atomically with restrictive permissions
    const tempPath = `${this._storePath}.tmp`;
    fs.writeFileSync(tempPath, payload, { mode: 0o600 });
    fs.renameSync(tempPath, this._storePath);
  }

  _computeChecksum(entries) {
    const hash = crypto.createHash('sha256');
    const serialized = JSON.stringify(entries);
    hash.update(serialized);
    return hash.digest('hex');
  }
}

// Export a singleton instance
const secureCredentialStore = new SecureCredentialStore();

module.exports = secureCredentialStore;