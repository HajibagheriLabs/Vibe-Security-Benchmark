import type { StoredCredentials } from '../main/credential-store';

/**
 * Type declaration for the credential store exposed via preload bridge.
 * Add this to your renderer's TypeScript configuration.
 */
export interface CredentialBridge {
  saveCredentials(credentials: StoredCredentials): Promise<{ success: boolean; encrypted?: boolean; error?: string }>;
  loadCredentials(): Promise<{ success: boolean; credentials?: StoredCredentials | null; error?: string }>;
  clearCredentials(): Promise<{ success: boolean; error?: string }>;
  hasStoredCredentials(): Promise<boolean>;
  isEncryptionAvailable(): Promise<boolean>;
}

declare global {
  interface Window {
    credentialStore: CredentialBridge;
  }
}

export {};