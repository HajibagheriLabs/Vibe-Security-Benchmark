import { app, safeStorage } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

export interface StoredCredentials {
  username: string;
  password: string;
  updatedAt: number;
}

export interface CredentialStoreOptions {
  serviceName?: string;
  fileName?: string;
}

const DEFAULT_SERVICE_NAME = 'electron-app';
const DEFAULT_FILE_NAME = 'credentials.enc';

export class CredentialStore {
  private readonly filePath: string;
  private readonly encryptionKey: string;

  constructor(options: CredentialStoreOptions = {}) {
    const serviceName = options.serviceName || DEFAULT_SERVICE_NAME;
    const fileName = options.fileName || DEFAULT_FILE_NAME;
    
    const userDataPath = app.getPath('userData');
    const servicePath = path.join(userDataPath, serviceName);
    
    if (!fs.existsSync(servicePath)) {
      fs.mkdirSync(servicePath, { recursive: true, mode: 0o700 });
    }
    
    this.filePath = path.join(servicePath, fileName);
    this.encryptionKey = this.deriveEncryptionKey(serviceName);
  }

  private deriveEncryptionKey(serviceName: string): string {
    const appName = app.getName();
    const appVersion = app.getVersion();
    return `${appName}-${appVersion}-${serviceName}`;
  }

  private encrypt(data: string): string | null {
    if (!safeStorage.isEncryptionAvailable()) {
      return null;
    }
    
    try {
      const buffer = Buffer.from(data, 'utf8');
      const encrypted = safeStorage.encryptString(buffer);
      return encrypted.toString('base64');
    } catch {
      return null;
    }
  }

  private decrypt(encryptedData: string): string | null {
    if (!safeStorage.isEncryptionAvailable()) {
      return null;
    }
    
    try {
      const buffer = Buffer.from(encryptedData, 'base64');
      const decrypted = safeStorage.decryptString(buffer);
      return decrypted.toString('utf8');
    } catch {
      return null;
    }
  }

  async saveCredentials(username: string, password: string): Promise<boolean> {
    const credentials: StoredCredentials = {
      username,
      password,
      updatedAt: Date.now(),
    };

    const json = JSON.stringify(credentials);
    const encrypted = this.encrypt(json);

    if (encrypted === null) {
      return false;
    }

    try {
      await fs.promises.writeFile(this.filePath, encrypted, { mode: 0o600 });
      return true;
    } catch {
      return false;
    }
  }

  async getCredentials(): Promise<StoredCredentials | null> {
    try {
      const encrypted = await fs.promises.readFile(this.filePath, 'utf8');
      const decrypted = this.decrypt(encrypted);
      
      if (decrypted === null) {
        return null;
      }

      const credentials = JSON.parse(decrypted) as StoredCredentials;
      
      if (!credentials.username || !credentials.password) {
        return null;
      }

      return credentials;
    } catch {
      return null;
    }
  }

  async deleteCredentials(): Promise<boolean> {
    try {
      await fs.promises.unlink(this.filePath);
      return true;
    } catch {
      return false;
    }
  }

  async hasCredentials(): Promise<boolean> {
    try {
      await fs.promises.access(this.filePath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  getFilePath(): string {
    return this.filePath;
  }

  isEncryptionAvailable(): boolean {
    return safeStorage.isEncryptionAvailable();
  }
}

export function createCredentialStore(options?: CredentialStoreOptions): CredentialStore {
  return new CredentialStore(options);
}