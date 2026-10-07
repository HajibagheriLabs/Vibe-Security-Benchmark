import { app, safeStorage } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface StoredCredentials {
  username: string;
  password: string;
  [key: string]: unknown;
}

/**
 * CredentialStore provides secure persistence for user account credentials
 * between application launches using Electron's safeStorage API.
 */
export class CredentialStore {
  private readonly storageDir: string;
  private readonly storageFile: string;
  private readonly legacyStorageFile: string;
  private readonly checksumFile: string;

  constructor(appName?: string) {
    const baseDir = app.getPath('userData');
    const dirName = appName ?? 'credentials';
    this.storageDir = path.join(baseDir, dirName);
    this.storageFile = path.join(this.storageDir, 'credentials.enc');
    this.legacyStorageFile = path.join(this.storageDir, 'credentials.json');
    this.checksumFile = path.join(this.storageDir, 'credentials.checksum');
    this.ensureStorageDirectory();
  }

  /**
   * Creates the storage directory if it doesn't exist.
   */
  private ensureStorageDirectory(): void {
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true, mode: 0o700 });
    }
  }

  /**
   * Checks if safeStorage encryption is available on this platform.
   */
  isEncryptionAvailable(): boolean {
    return safeStorage.isEncryptionAvailable();
  }

  /**
   * Saves credentials to disk, encrypted when possible.
   * Falls back to plaintext with a warning if encryption is unavailable.
   */
  saveCredentials(credentials: StoredCredentials): boolean {
    const serialized = JSON.stringify(credentials, null, 2);

    if (this.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(serialized);
      const checksum = this.computeChecksum(encrypted);

      fs.writeFileSync(this.storageFile, encrypted);
      fs.writeFileSync(this.checksumFile, checksum, 'utf8');

      // Clean up any legacy plaintext file
      if (fs.existsSync(this.legacyStorageFile)) {
        fs.unlinkSync(this.legacyStorageFile);
      }

      return true;
    }

    // Fallback: store as plaintext (with warning)
    console.warn(
      '[CredentialStore] Encryption unavailable. Storing credentials in plaintext. ' +
        'This is insecure and should only be used for development.'
    );
    fs.writeFileSync(this.legacyStorageFile, serialized, 'utf8');
    return false;
  }

  /**
   * Loads credentials from disk, decrypting if necessary.
   * Returns null if no credentials are stored or if decryption fails.
   */
  loadCredentials(): StoredCredentials | null {
    // Try encrypted storage first
    if (fs.existsSync(this.storageFile) && fs.existsSync(this.checksumFile)) {
      try {
        const encrypted = fs.readFileSync(this.storageFile);
        const storedChecksum = fs.readFileSync(this.checksumFile, 'utf8');
        const computedChecksum = this.computeChecksum(encrypted);

        if (storedChecksum !== computedChecksum) {
          console.error('[CredentialStore] Checksum mismatch. Data may be corrupted.');
          return null;
        }

        const decrypted = safeStorage.decryptString(encrypted);
        return JSON.parse(decrypted) as StoredCredentials;
      } catch (error) {
        console.error('[CredentialStore] Failed to decrypt credentials:', error);
        return null;
      }
    }

    // Try legacy plaintext storage
    if (fs.existsSync(this.legacyStorageFile)) {
      try {
        const plaintext = fs.readFileSync(this.legacyStorageFile, 'utf8');
        const credentials = JSON.parse(plaintext) as StoredCredentials;

        // Migrate to encrypted storage if now available
        if (this.isEncryptionAvailable()) {
          this.saveCredentials(credentials);
          fs.unlinkSync(this.legacyStorageFile);
        }

        return credentials;
      } catch (error) {
        console.error('[CredentialStore] Failed to read legacy credentials:', error);
        return null;
      }
    }

    return null;
  }

  /**
   * Deletes all stored credentials.
   */
  clearCredentials(): void {
    if (fs.existsSync(this.storageFile)) {
      fs.unlinkSync(this.storageFile);
    }
    if (fs.existsSync(this.checksumFile)) {
      fs.unlinkSync(this.checksumFile);
    }
    if (fs.existsSync(this.legacyStorageFile)) {
      fs.unlinkSync(this.legacyStorageFile);
    }
  }

  /**
   * Checks if any credentials are currently stored.
   */
  hasStoredCredentials(): boolean {
    return (
      (fs.existsSync(this.storageFile) && fs.existsSync(this.checksumFile)) ||
      fs.existsSync(this.legacyStorageFile)
    );
  }

  /**
   * Computes a SHA-256 checksum for integrity verification.
   */
  private computeChecksum(data: Buffer): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}

// Singleton instance for the main process
let storeInstance: CredentialStore | null = null;

export function getCredentialStore(): CredentialStore {
  if (!storeInstance) {
    storeInstance = new CredentialStore();
  }
  return storeInstance;
}

export default CredentialStore;