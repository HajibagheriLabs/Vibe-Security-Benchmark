import { contextBridge, ipcRenderer } from 'electron';
import type { StoredCredentials } from '../main/credential-store';

/**
 * Preload bridge exposing credential operations to the renderer process.
 * Use this in your preload script to safely expose credential APIs.
 */
export interface CredentialBridge {
  saveCredentials(credentials: StoredCredentials): Promise<{ success: boolean; encrypted?: boolean; error?: string }>;
  loadCredentials(): Promise<{ success: boolean; credentials?: StoredCredentials | null; error?: string }>;
  clearCredentials(): Promise<{ success: boolean; error?: string }>;
  hasStoredCredentials(): Promise<boolean>;
  isEncryptionAvailable(): Promise<boolean>;
}

export function exposeCredentialBridge(): void {
  const bridge: CredentialBridge = {
    saveCredentials: (credentials: StoredCredentials) =>
      ipcRenderer.invoke('credentials:save', credentials),
    loadCredentials: () => ipcRenderer.invoke('credentials:load'),
    clearCredentials: () => ipcRenderer.invoke('credentials:clear'),
    hasStoredCredentials: () => ipcRenderer.invoke('credentials:hasStored'),
    isEncryptionAvailable: () => ipcRenderer.invoke('credentials:isEncryptionAvailable'),
  };

  contextBridge.exposeInMainWorld('credentialStore', bridge);
}