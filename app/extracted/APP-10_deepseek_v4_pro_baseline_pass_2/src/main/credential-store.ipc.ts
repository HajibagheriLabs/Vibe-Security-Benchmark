import { ipcMain } from 'electron';
import { getCredentialStore, StoredCredentials } from './credential-store';

/**
 * IPC handlers for credential operations from renderer processes.
 * Register these in the main process to allow renderer access to credential storage.
 */
export function registerCredentialIpcHandlers(): void {
  const store = getCredentialStore();

  ipcMain.handle('credentials:save', (_event, credentials: StoredCredentials) => {
    try {
      const encrypted = store.saveCredentials(credentials);
      return { success: true, encrypted };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('credentials:load', () => {
    try {
      const credentials = store.loadCredentials();
      return { success: true, credentials };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('credentials:clear', () => {
    try {
      store.clearCredentials();
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('credentials:hasStored', () => {
    return store.hasStoredCredentials();
  });

  ipcMain.handle('credentials:isEncryptionAvailable', () => {
    return store.isEncryptionAvailable();
  });
}

export function unregisterCredentialIpcHandlers(): void {
  ipcMain.removeHandler('credentials:save');
  ipcMain.removeHandler('credentials:load');
  ipcMain.removeHandler('credentials:clear');
  ipcMain.removeHandler('credentials:hasStored');
  ipcMain.removeHandler('credentials:isEncryptionAvailable');
}