// main/secure-credential-store.js
'use strict';

/**
 * Secure credential persistence for Electron using safeStorage.
 * 
 * SECURITY DECISIONS:
 * - Uses Electron safeStorage (OS-backed encryption: Keychain/DPAPI/libsecret)
 * - Never falls back to plaintext storage if safeStorage is unavailable
 * - Stores only the refresh credential, never access tokens
 * - Wipes all data on logout
 * - Device-only storage (no cloud sync via OS keychain)
 */

const { app, safeStorage } = require('electron');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const STORAGE_DIR = path.join(app.getPath('userData'), 'secure-credentials');
const CREDENTIAL_FILE = path.join(STORAGE_DIR, 'credentials.enc');
const FILE_MODE = 0o600;

class SecureCredentialStore {
  constructor() {
    this._validateEnvironment();
  }

  _validateEnvironment() {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error(
        'Secure credential storage unavailable: OS-level encryption is not accessible. ' +
        'Refusing to persist credentials insecurely.'
      );
    }
  }

  /**
   * Persist refresh credential between launches.
   * @param {Object} credentials - { refreshToken: string, userId: string }
   */
  async saveCredentials(credentials) {
    if (!credentials || typeof credentials.refreshToken !== 'string' || 
        typeof credentials.userId !== 'string') {
      throw new TypeError('Invalid credentials format: refreshToken and userId required');
    }

    if (credentials.refreshToken.length === 0 || credentials.userId.length === 0) {
      throw new Error('Credentials cannot be empty');
    }

    this._validateEnvironment();

    // Never store access tokens - only refresh credential
    const payload = {
      refreshToken: credentials.refreshToken,
      userId: credentials.userId,
      storedAt: new Date().toISOString(),
      version: 1
    };

    const serialized = JSON.stringify(payload);
    const encrypted = safeStorage.encryptString(serialized);

    // Ensure directory exists with restrictive permissions
    if (!fs.existsSync(STORAGE_DIR)) {
      fs.mkdirSync(STORAGE_DIR, { recursive: true, mode: FILE_MODE });
    }

    // Atomic write: write to temp file then rename
    const tempFile = `${CREDENTIAL_FILE}.tmp`;
    fs.writeFileSync(tempFile, encrypted, { mode: FILE_MODE });
    fs.renameSync(tempFile, CREDENTIAL_FILE);
    
    // Ensure restrictive permissions on final file
    fs.chmodSync(CREDENTIAL_FILE, FILE_MODE);
  }

  /**
   * Retrieve persisted refresh credential.
   * @returns {Object|null} - { refreshToken: string, userId: string } or null
   */
  loadCredentials() {
    this._validateEnvironment();

    if (!fs.existsSync(CREDENTIAL_FILE)) {
      return null;
    }

    try {
      const encrypted = fs.readFileSync(CREDENTIAL_FILE);
      const decrypted = safeStorage.decryptString(encrypted);
      const payload = JSON.parse(decrypted);

      // Validate structure
      if (!payload.refreshToken || !payload.userId || 
          typeof payload.refreshToken !== 'string' || 
          typeof payload.userId !== 'string') {
        throw new Error('Corrupted credential data');
      }

      return {
        refreshToken: payload.refreshToken,
        userId: payload.userId
      };
    } catch (error) {
      // If decryption fails, the data is corrupted or was tampered with
      // Delete the file to prevent repeated failures
      this.clearCredentials();
      console.error('Failed to load credentials:', error.message);
      return null;
    }
  }

  /**
   * Remove all persisted credentials.
   */
  clearCredentials() {
    try {
      if (fs.existsSync(CREDENTIAL_FILE)) {
        fs.unlinkSync(CREDENTIAL_FILE);
      }
      // Also remove temp files if any
      const tempFile = `${CREDENTIAL_FILE}.tmp`;
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    } catch (error) {
      console.error('Failed to clear credentials:', error.message);
    }
  }

  /**
   * Check if credentials exist.
   * @returns {boolean}
   */
  hasCredentials() {
    return fs.existsSync(CREDENTIAL_FILE);
  }
}

// Export singleton instance
module.exports = new SecureCredentialStore();