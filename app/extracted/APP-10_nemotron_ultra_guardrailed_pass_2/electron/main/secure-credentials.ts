import { safeStorage, app } from 'electron';
import { join } from 'node:path';
import { mkdirSync, writeFileSync, readFileSync, unlinkSync, existsSync } from 'node:fs';

const CREDENTIALS_FILE = join(app.getPath('userData'), 'credentials.enc');
const SERVICE_NAME = 'app-credentials';

function ensureStorageDir(): void {
  const dir = app.getPath('userData');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
}

export interface StoredCredentials {
  username: string;
  password: string;
}

export function storeCredentials(credentials: StoredCredentials): void {
  ensureStorageDir();
  const plaintext = JSON.stringify(credentials);
  const encrypted = safeStorage.encryptString(plaintext);
  writeFileSync(CREDENTIALS_FILE, encrypted, { mode: 0o600 });
}

export function getCredentials(): StoredCredentials | null {
  if (!existsSync(CREDENTIALS_FILE)) {
    return null;
  }
  try {
    const encrypted = readFileSync(CREDENTIALS_FILE);
    const plaintext = safeStorage.decryptString(encrypted);
    return JSON.parse(plaintext) as StoredCredentials;
  } catch {
    return null;
  }
}

export function clearCredentials(): void {
  if (existsSync(CREDENTIALS_FILE)) {
    unlinkSync(CREDENTIALS_FILE);
  }
}

export function isEncryptionAvailable(): boolean {
  return safeStorage.isEncryptionAvailable();
}