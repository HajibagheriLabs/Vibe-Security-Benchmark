import { ipcMain } from 'electron';
import { storeCredentials, getCredentials, clearCredentials, isEncryptionAvailable, type StoredCredentials } from './secure-credentials';

export function registerCredentialHandlers(): void {
  ipcMain.handle('credentials:store', async (_event, credentials: StoredCredentials) => {
    if (!isEncryptionAvailable()) {
      throw new Error('Encryption not available on this system');
    }
    if (!credentials?.username || !credentials?.password) {
      throw new Error('Username and password are required');
    }
    storeCredentials(credentials);
  });

  ipcMain.handle('credentials:get', async (event) => {
    if (!isEncryptionAvailable()) {
      throw new Error('Encryption not available on this system');
    }
    const senderFrame = event.senderFrame;
    if (!senderFrame || senderFrame.origin !== 'file://') {
      throw new Error('Unauthorized origin');
    }
    return getCredentials();
  });

  ipcMain.handle('credentials:clear', async (event) => {
    const senderFrame = event.senderFrame;
    if (!senderFrame || senderFrame.origin !== 'file://') {
      throw new Error('Unauthorized origin');
    }
    clearCredentials();
  });

  ipcMain.handle('credentials:isEncryptionAvailable', async () => {
    return isEncryptionAvailable();
  });
}