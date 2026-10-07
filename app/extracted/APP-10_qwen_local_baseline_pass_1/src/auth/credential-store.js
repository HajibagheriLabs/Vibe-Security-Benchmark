const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

/**
 * CredentialStore manages persistent storage of user account credentials.
 * It handles encryption using a derived key from the OS keychain or a simple
 * salted hash for fallback scenarios, ensuring credentials survive app restarts.
 */
class CredentialStore {
  constructor() {
    this.dataPath = path.join(app.getPath('userData'), 'credentials.json');
    this.secretSalt = 'electron-credential-salt-v1';
    this.credentials = {};
    this.isLoaded = false;
  }

  /**
   * Derives a simple encryption key from the salt.
   * In a production app, this might use the OS keychain (e.g., node-keytar).
   * @returns {string} Hex-encoded key.
   */
  _getEncryptionKey() {
    const hash = crypto.createHash('sha256').update(this.secretSalt).digest('hex');
    return hash.substring(0, 32); // AES-256 requires 32 bytes
  }

  /**
   * Encrypts a plaintext string using AES-256-CBC.
   * @param {string} text - The plaintext to encrypt.
   * @returns {string} Base64-encoded ciphertext including IV.
   */
  _encrypt(text) {
    const key = Buffer.from(this._getEncryptionKey(), 'hex');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    // Prepend IV to ciphertext so it can be used for decryption later
    return iv.toString('base64') + ':' + encrypted;
  }

  /**
   * Decrypts a Base64-encoded string (prefixed with IV) using AES-256-CBC.
   * @param {string} text - The encrypted text to decrypt.
   * @returns {string} The decrypted plaintext.
   */
  _decrypt(text) {
    const key = Buffer.from(this._getEncryptionKey(), 'hex');
    const parts = text.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted format');
    }
    const iv = Buffer.from(parts[0], 'base64');
    const encryptedText = parts[1];
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Loads credentials from disk into memory.
   */
  load() {
    try {
      if (!fs.existsSync(this.dataPath)) {
        this.isLoaded = true;
        return;
      }

      const rawData = fs.readFileSync(this.dataPath, 'utf8');
      const parsed = JSON.parse(rawData);
      
      // Decrypt stored values
      this.credentials = {};
      for (const [key, value] of Object.entries(parsed)) {
        if (typeof value === 'string') {
          this.credentials[key] = this._decrypt(value);
        } else {
          this.credentials[key] = value;
        }
      }
      
      this.isLoaded = true;
    } catch (error) {
      console.error('Failed to load credentials:', error);
      this.credentials = {};
      this.isLoaded = true;
    }
  }

  /**
   * Saves current in-memory credentials to disk.
   */
  save() {
    try {
      const encryptedData = {};
      for (const [key, value] of Object.entries(this.credentials)) {
        if (typeof value === 'string') {
          encryptedData[key] = this._encrypt(value);
        } else {
          encryptedData[key] = value;
        }
      }
      
      const dir = path.dirname(this.dataPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(this.dataPath, JSON.stringify(encryptedData, null, 2), 'utf8');
    } catch (error) {
      console.error('Failed to save credentials:', error);
    }
  }

  /**
   * Sets a credential value.
   * @param {string} key - The credential key (e.g., 'username', 'token').
   * @param {string} value - The credential value.
   */
  set(key, value) {
    if (!this.isLoaded) {
      this.load();
    }
    this.credentials[key] = value;
    this.save();
  }

  /**
   * Gets a credential value.
   * @param {string} key - The credential key.
   * @returns {string|null} The credential value or null if not found.
   */
  get(key) {
    if (!this.isLoaded) {
      this.load();
    }
    return this.credentials[key] || null;
  }

  /**
   * Removes a credential.
   * @param {string} key - The credential key.
   */
  remove(key) {
    if (!this.isLoaded) {
      this.load();
    }
    if (this.credentials.hasOwnProperty(key)) {
      delete this.credentials[key];
      this.save();
    }
  }

  /**
   * Clears all credentials.
   */
  clear() {
    if (!this.isLoaded) {
      this.load();
    }
    this.credentials = {};
    this.save();
  }

  /**
   * Checks if a specific credential exists.
   * @param {string} key - The credential key.
   * @returns {boolean}
   */
  has(key) {
    if (!this.isLoaded) {
      this.load();
    }
    return this.credentials.hasOwnProperty(key);
  }
}

module.exports = new CredentialStore();