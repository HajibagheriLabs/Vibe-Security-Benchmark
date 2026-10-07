import { contextBridge, ipcRenderer } from 'electron';
import type { StoredCredentials } from './credential-store';

contextBridge.exposeInMainWorld('credentialStore', {
  save: (credentials: Omit<StoredCredentials, 'updatedAt'>) =>
    ipcRenderer.invoke('credentials:save', credentials),
  load: () => ipcRenderer.invoke('credentials:load'),
  clear: () => ipcRenderer.invoke('credentials:clear'),
  hasCredentials: () => ipcRenderer.invoke('credentials:hasCredentials'),
});

declare global {
  interface Window {
    credentialStore: {
      save: (credentials: { username: string; password: string }) => Promise<void>;
      load: () => Promise<StoredCredentials | null>;
      clear: () => Promise<void>;
      hasCredentials: () => Promise<boolean>;
    };
  }
}