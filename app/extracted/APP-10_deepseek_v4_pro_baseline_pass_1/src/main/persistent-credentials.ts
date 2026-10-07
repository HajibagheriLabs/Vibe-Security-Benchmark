import { app, safeStorage } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

interface StoredCredentials {
  username: string;
  password: string;
  updatedAt: string;
}

interface CredentialsFile {
  version: 1;
  encrypted: boolean;
  data: string;
  iv?: string;
  authTag?: string;
}

/**
 * PersistentCredentials
 *
 * A helper module for securely storing user account credentials
 * between application launches using Electron's safeStorage API
 * when available, with a fallback to AES-256-GCM encryption.
 */
export class PersistentCredentials {
  private readonly credentialsPath: string;
  private readonly fallbackKey: Buffer | null = null;

  constructor(storageFileName = 'credentials.json') {
    this.credentialsPath = path.join(app.getPath('userData'), storageFileName);
  }

  /**
   * Save credentials to disk.
   * Uses safeStorage when encryption is available, otherwise falls back
   * to AES-256-GCM with a locally derived key.
   */
  save(username: string, password: string): boolean {
    try {
      const credentials: StoredCredentials = {
        username,
        password,
        updatedAt: new Date().toISOString(),
      };

      const payload = JSON.stringify(credentials);

      let fileContent: CredentialsFile;

      if (safeStorage.isEncryptionAvailable()) {
        const encrypted = safeStorage.encryptString(payload);
        fileContent = {
          version: 1,
          encrypted: true,
          data: encrypted.toString('base64'),
        };
      } else {
        // Fallback: AES-256-GCM with a machine-derived key
        const key = this.getFallbackKey();
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
        const encrypted = Buffer.concat([
          cipher.update(payload, 'utf8'),
          cipher.final(),
        ]);
        const authTag = cipher.getAuthTag();

        fileContent = {
          version: 1,
          encrypted: true,
          data: encrypted.toString('base64'),
          iv: iv.toString('base64'),
          authTag: authTag.toString('base64'),
        };
      }

      this.ensureDirectoryExists();
      fs.writeFileSync(this.credentialsPath, JSON.stringify(fileContent, null, 2), {
        mode: 0o600,
      });

      return true;
    } catch (error) {
      console.error('[PersistentCredentials] Failed to save credentials:', error);
      return false;
    }
  }

  /**
   * Load credentials from disk.
   * Returns null if no credentials exist or decryption fails.
   */
  load(): StoredCredentials | null {
    try {
      if (!fs.existsSync(this.credentialsPath)) {
        return null;
      }

      const raw = fs.readFileSync(this.credentialsPath, 'utf8');
      const fileContent: CredentialsFile = JSON.parse(raw);

      if (fileContent.version !== 1) {
        console.warn('[PersistentCredentials] Unsupported credentials file version');
        return null;
      }

      let decrypted: string;

      if (fileContent.encrypted) {
        if (fileContent.iv && fileContent.authTag) {
          // Fallback decryption path
          const key = this.getFallbackKey();
          const decipher = crypto.createDecipheriv(
            'aes-256-gcm',
            key,
            Buffer.from(fileContent.iv, 'base64')
          );
          decipher.setAuthTag(Buffer.from(fileContent.authTag, 'base64'));
          decrypted = Buffer.concat([
            decipher.update(Buffer.from(fileContent.data, 'base64')),
            decipher.final(),
          ]).toString('utf8');
        } else {
          // safeStorage decryption path
          if (!safeStorage.isEncryptionAvailable()) {
            console.warn(
              '[PersistentCredentials] Credentials were encrypted with safeStorage but it is unavailable'
            );
            return null;
          }
          decrypted = safeStorage.decryptString(Buffer.from(fileContent.data, 'base64'));
        }
      } else {
        decrypted = fileContent.data;
      }

      const credentials: StoredCredentials = JSON.parse(decrypted);
      return credentials;
    } catch (error) {
      console.error('[PersistentCredentials] Failed to load credentials:', error);
      return null;
    }
  }

  /**
   * Delete stored credentials.
   */
  clear(): boolean {
    try {
      if (fs.existsSync(this.credentialsPath)) {
        fs.unlinkSync(this.credentialsPath);
      }
      return true;
    } catch (error) {
      console.error('[PersistentCredentials] Failed to clear credentials:', error);
      return false;
    }
  }

  /**
   * Check if credentials exist on disk.
   */
  hasCredentials(): boolean {
    return fs.existsSync(this.credentialsPath);
  }

  /**
   * Get the path where credentials are stored.
   */
  getStoragePath(): string {
    return this.credentialsPath;
  }

  /**
   * Derive a fallback encryption key from machine-specific data.
   * This is used only when safeStorage is unavailable.
   */
  private getFallbackKey(): Buffer {
    if (this.fallbackKey) {
      return this.fallbackKey;
    }

    // Combine multiple machine identifiers for key derivation
    const machineId = this.getMachineIdentifier();
    const salt = 'persistent-credentials-v1';

    // Use scrypt for key derivation (memory-hard, resistant to brute force)
    const key = crypto.scryptSync(machineId, salt, 32);
    return key;
  }

  /**
   * Get a machine-specific identifier for key derivation.
   * Combines several sources to create a reasonably unique value.
   */
  private getMachineIdentifier(): string {
    const parts: string[] = [];

    // Try to get a stable machine ID from various sources
    try {
      const os = require('os');
      parts.push(os.hostname());
      parts.push(os.userInfo().username);

      const networkInterfaces = os.networkInterfaces();
      for (const iface of Object.values(networkInterfaces)) {
        if (iface && Array.isArray(iface)) {
          for (const addr of iface) {
            if (addr.mac && addr.mac !== '00:00:00:00:00:00') {
              parts.push(addr.mac);
              break;
            }
          }
        }
      }
    } catch {
      // Ignore errors from os module
    }

    // Add app-specific data
    parts.push(app.getName());
    parts.push(app.getVersion());

    // If we couldn't gather enough entropy, add a random component
    // stored in userData (persists across launches)
    if (parts.length < 2) {
      const randomFile = path.join(app.getPath('userData'), '.credential-salt');
      try {
        if (fs.existsSync(randomFile)) {
          parts.push(fs.readFileSync(randomFile, 'utf8'));
        } else {
          const randomSalt = crypto.randomBytes(32).toString('hex');
          fs.writeFileSync(randomFile, randomSalt, { mode: 0o600 });
          parts.push(randomSalt);
        }
      } catch {
        // Last resort: use a fixed fallback (weak but functional)
        parts.push('fallback-machine-id');
      }
    }

    return parts.join('|');
  }

  private ensureDirectoryExists(): void {
    const dir = path.dirname(this.credentialsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

// Export a singleton instance for convenience
export const persistentCredentials = new PersistentCredentials();