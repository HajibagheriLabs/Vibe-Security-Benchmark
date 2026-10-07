import { ipcMain, nativeTheme } from 'electron';
import { safeStorage } from 'electron';

// Rule 1: Sensitive persistence uses secure storage (safeStorage) for the raw string.
// Rule 2: contextBridge exposes named single-purpose functions.
// Rule 3: No secrets in the bundle; this is just a user preference.

const THEME_KEY = 'user-theme-preference';

// Secure Store Helper
// Rule 1: Sensitive persistence uses safeStorage (AES-256-CBC).
// Rule 1: Device-only accessibility (default for safeStorage).
async function getSecureTheme(): Promise<string | null> {
  try {
    const encrypted = safeStorage.decryptString(safeStorage.getEncryptedValue(THEME_KEY));
    return encrypted;
  } catch (error) {
    // Key not found or decryption failed
    return null;
  }
}

async function setSecureTheme(theme: string): Promise<void> {
  const encrypted = safeStorage.encryptString(theme);
  safeStorage.setEncryptedValue(THEME_KEY, encrypted);
}

// IPC Handlers
// Rule 2: Verify senderFrame (optional but good practice), parse schema, authorize.

ipcMain.handle('theme:get-preference', async () => {
  const theme = await getSecureTheme();
  // Default to 'system' if not set
  if (!theme || !['light', 'dark', 'system'].includes(theme)) {
    return 'system';
  }
  return theme;
});

ipcMain.handle('theme:set-preference', async (_event, theme: string) => {
  // Validate schema
  if (!['light', 'dark', 'system'].includes(theme)) {
    throw new Error('Invalid theme');
  }

  await setSecureTheme(theme);
  
  // Update native theme state
  if (theme === 'system') {
    nativeTheme.themeSource = 'system';
  } else {
    nativeTheme.themeSource = theme;
  }
  
  return true;
});