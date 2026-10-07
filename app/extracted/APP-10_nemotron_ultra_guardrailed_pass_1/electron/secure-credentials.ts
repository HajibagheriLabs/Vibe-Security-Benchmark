import { safeStorage, app } from 'electron';
import * as path from 'node:path';
import * as fs from 'node:fs';

interface StoredCredentials {
  username: string;
  password: string; // encrypted with safeStorage
}

const STORAGE_FILENAME = 'credentials.enc';
const STORAGE_DIR = app.getPath('userData');

function getStoragePath(): string {
  return path.join(STORAGE_DIR, STORAGE_FILENAME);
}

function ensureStorageDir(): void {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true, mode: 0o700 });
  }
}

export async function storeCredentials(username: string, password: string): Promise<void> {
  ensureStorageDir();
  const encryptedPassword = safeStorage.encryptString(password);
  const data: StoredCredentials = {
    username,
    password: encryptedPassword.toString('base64'),
  };
  await fs.promises.writeFile(getStoragePath(), JSON.stringify(data), { mode: 0o600 });
}

export async function getCredentials(): Promise<{ username: string; password: string } | null> {
  try {
    const filePath = getStoragePath();
    const raw = await fs.promises.readFile(filePath, 'utf8');
    const data: StoredCredentials = JSON.parse(raw);
    const encryptedPassword = Buffer.from(data.password, 'base64');
    const password = safeStorage.decryptString(encryptedPassword);
    return { username: data.username, password };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw err;
  }
}

export async function clearCredentials(): Promise<void> {
  try {
    await fs.promises.unlink(getStoragePath());
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw err;
    }
  }
}

export function isEncryptionAvailable(): boolean {
  return safeStorage.isEncryptionAvailable();
}