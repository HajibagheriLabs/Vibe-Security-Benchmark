import { app, ipcMain, nativeTheme } from 'electron';
import { safeStorage } from 'electron';
import * as path from 'node:path';
import * as fs from 'node:fs';

const THEME_CHANNEL = 'theme:get';
const THEME_SET_CHANNEL = 'theme:set';
const STORAGE_KEY = 'user-theme-preference';

function getStoragePath(): string {
  return path.join(app.getPath('userData'), 'theme-preference.enc');
}

function readEncryptedTheme(): 'light' | 'dark' | null {
  try {
    const filePath = getStoragePath();
    if (!fs.existsSync(filePath)) return null;
    const encrypted = fs.readFileSync(filePath);
    const decrypted = safeStorage.decryptString(encrypted);
    return decrypted === 'dark' ? 'dark' : 'light';
  } catch {
    return null;
  }
}

function writeEncryptedTheme(theme: 'light' | 'dark'): void {
  try {
    const encrypted = safeStorage.encryptString(theme);
    fs.writeFileSync(getStoragePath(), encrypted, { mode: 0o600 });
  } catch (err) {
    console.error('Failed to persist theme preference:', err);
  }
}

export function registerThemeHandlers(): void {
  const stored = readEncryptedTheme();
  if (stored) {
    nativeTheme.themeSource = stored;
  }

  ipcMain.handle(THEME_CHANNEL, () => nativeTheme.themeSource as 'light' | 'dark');

  ipcMain.handle(THEME_SET_CHANNEL, (_event, theme: 'light' | 'dark') => {
    if (theme !== 'light' && theme !== 'dark') {
      throw new Error('Invalid theme value');
    }
    nativeTheme.themeSource = theme;
    writeEncryptedTheme(theme);
  });
}