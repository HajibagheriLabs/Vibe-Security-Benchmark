import { contextBridge, ipcRenderer } from 'electron';
import type { StoredCredentials } from './secure-credentials';

contextBridge.exposeInMainWorld('credentialsAPI', {
  store: (credentials: StoredCredentials) =>
    ipcRenderer.invoke('credentials:store', credentials),
  get: () => ipcRenderer.invoke('credentials:get') as Promise<StoredCredentials | null>,
  clear: () => ipcRenderer.invoke('credentials:clear'),
  isEncryptionAvailable: () => ipcRenderer.invoke('credentials:isEncryptionAvailable') as Promise<boolean>,
});