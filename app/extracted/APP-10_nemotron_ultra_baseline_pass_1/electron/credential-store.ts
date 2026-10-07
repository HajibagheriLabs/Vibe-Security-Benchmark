import { app, safeStorage } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

export interface StoredCredentials {
  username: string;
  password: string;
  updatedAt: number;
}

interface EncryptedPayload {
  data: string;
  iv: string;
  version: number;
}

const STORAGE_FILENAME = 'credentials.enc';
const ENCRYPTION_VERSION = 1;

function getStoragePath(): string {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, STORAGE_FILENAME);
}

function isEncryptionAvailable(): boolean {
  return safeStorage.isEncryptionAvailable();
}

function encryptString(plaintext: string): EncryptedPayload {
  if (!isEncryptionAvailable()) {
    throw new Error('OS encryption is not available on this platform');
  }
  const buffer = Buffer.from(plaintext, 'utf8');
  const encrypted = safeStorage.encryptString(buffer.toString('utf8'));
  return {
    data: encrypted.toString('base64'),
    iv: '',
    version: ENCRYPTION_VERSION,
  };
}

function decryptString(payload: EncryptedPayload): string {
  if (!isEncryptionAvailable()) {
    throw new Error('OS encryption is not available on this platform');
  }
  if (payload.version !== ENCRYPTION_VERSION) {
    throw new Error(`Unsupported encryption version: ${payload.version}`);
  }
  const encryptedBuffer = Buffer.from(payload.data, 'base64');
  return safeStorage.decryptString(encryptedBuffer);
}

export class CredentialStore {
  private storagePath: string;
  private cache: StoredCredentials | null = null;

  constructor() {
    this.storagePath = getStoragePath();
  }

  async save(credentials: Omit<StoredCredentials, 'updatedAt'>): Promise<void> {
    if (!isEncryptionAvailable()) {
      throw new Error('Credential storage unavailable: OS encryption not supported');
    }

    const payload: StoredCredentials = {
      ...credentials,
      updatedAt: Date.now(),
    };

    const json = JSON.stringify(payload);
    const encrypted = encryptString(json);

    const dir = path.dirname(this.storagePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(this.storagePath, JSON.stringify(encrypted), { mode: 0o600 });
    this.cache = payload;
  }

  async load(): Promise<StoredCredentials | null> {
    if (this.cache) {
      return this.cache;
    }

    if (!fs.existsSync(this.storagePath)) {
      return null;
    }

    if (!isEncryptionAvailable()) {
      throw new Error('Credential storage unavailable: OS encryption not supported');
    }

    try {
      const fileContent = fs.readFileSync(this.storagePath, 'utf8');
      const encrypted: EncryptedPayload = JSON.parse(fileContent);
      const decrypted = decryptString(encrypted);
      const credentials: StoredCredentials = JSON.parse(decrypted);
      this.cache = credentials;
      return credentials;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw new Error(`Failed to load credentials: ${(error as Error).message}`);
    }
  }

  async clear(): Promise<void> {
    if (fs.existsSync(this.storagePath)) {
      fs.unlinkSync(this.storagePath);
    }
    this.cache = null;
  }

  async hasCredentials(): Promise<boolean> {
    const creds = await this.load();
    return creds !== null;
  }

  invalidateCache(): void {
    this.cache = null;
  }
}

export const credentialStore = new CredentialStore();