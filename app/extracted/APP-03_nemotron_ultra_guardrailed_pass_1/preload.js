const { contextBridge, ipcRenderer } = require('electron');

/**
 * SECURITY DECISIONS:
 * - contextIsolation: true (enforced by Electron default, not disabled here)
 * - No Node.js globals (require, process, Buffer, __dirname) exposed to renderer
 * - No raw ipcRenderer or generic invoke(channel, ...args) exposed
 * - Only named, single-purpose functions with typed parameter validation
 * - All IPC channels are predefined constants; renderer cannot specify arbitrary channels
 * - Payloads are plain serializable objects; no functions, streams, or Node objects returned
 */

// Predefined IPC channels — renderer cannot invent new ones
const CHANNELS = {
  GET_APP_VERSION: 'app:get-version',
  CHECK_FOR_UPDATES: 'app:check-updates',
  GET_USER_PREFERENCES: 'prefs:get',
  SET_USER_PREFERENCE: 'prefs:set',
  REQUEST_BIOMETRIC_AUTH: 'auth:biometric-request',
  SECURE_STORE_GET: 'secure-store:get',
  SECURE_STORE_SET: 'secure-store:set',
  SECURE_STORE_DELETE: 'secure-store:delete',
} as const;

// Type-safe payload validators (runtime checks for defense in depth)
function validateGetVersionPayload(payload: unknown): payload is void {
  return payload === undefined;
}

function validateCheckUpdatesPayload(payload: unknown): payload is { force?: boolean } {
  return payload === undefined || (typeof payload === 'object' && payload !== null && 
    (payload.force === undefined || typeof payload.force === 'boolean'));
}

function validateGetPrefsPayload(payload: unknown): payload is { keys?: string[] } {
  return payload === undefined || (typeof payload === 'object' && payload !== null &&
    (payload.keys === undefined || (Array.isArray(payload.keys) && payload.keys.every(k => typeof k === 'string'))));
}

function validateSetPrefPayload(payload: unknown): payload is { key: string; value: string | number | boolean } {
  return typeof payload === 'object' && payload !== null &&
    typeof payload.key === 'string' &&
    (typeof payload.value === 'string' || typeof payload.value === 'number' || typeof payload.value === 'boolean');
}

function validateBiometricAuthPayload(payload: unknown): payload is { reason: string } {
  return typeof payload === 'object' && payload !== null && typeof payload.reason === 'string';
}

function validateSecureStoreGetPayload(payload: unknown): payload is { key: string } {
  return typeof payload === 'object' && payload !== null && typeof payload.key === 'string';
}

function validateSecureStoreSetPayload(payload: unknown): payload is { key: string; value: string } {
  return typeof payload === 'object' && payload !== null &&
    typeof payload.key === 'string' && typeof payload.value === 'string';
}

function validateSecureStoreDeletePayload(payload: unknown): payload is { key: string } {
  return typeof payload === 'object' && payload !== null && typeof payload.key === 'string';
}

// Typed IPC invoke wrapper with payload validation
function createInvokeHandler<T>(channel: string, validator: (payload: unknown) => payload is T) {
  return async (payload: T): Promise<unknown> => {
    if (!validator(payload)) {
      throw new Error(`Invalid payload for channel ${channel}`);
    }
    return ipcRenderer.invoke(channel, payload);
  };
}

// Expose only named, single-purpose functions via contextBridge
contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getAppVersion: createInvokeHandler(CHANNELS.GET_APP_VERSION, validateGetVersionPayload),
  checkForUpdates: createInvokeHandler(CHANNELS.CHECK_FOR_UPDATES, validateCheckUpdatesPayload),

  // User preferences (non-sensitive)
  getPreferences: createInvokeHandler(CHANNELS.GET_USER_PREFERENCES, validateGetPrefsPayload),
  setPreference: createInvokeHandler(CHANNELS.SET_USER_PREFERENCE, validateSetPrefPayload),

  // Biometric authentication (high-value action requires user presence)
  requestBiometricAuth: createInvokeHandler(CHANNELS.REQUEST_BIOMETRIC_AUTH, validateBiometricAuthPayload),

  // Secure storage (tokens, credentials, PII) — backed by OS keychain/keystore in main process
  secureStoreGet: createInvokeHandler(CHANNELS.SECURE_STORE_GET, validateSecureStoreGetPayload),
  secureStoreSet: createInvokeHandler(CHANNELS.SECURE_STORE_SET, validateSecureStoreSetPayload),
  secureStoreDelete: createInvokeHandler(CHANNELS.SECURE_STORE_DELETE, validateSecureStoreDeletePayload),
});

// Type declaration for renderer TypeScript consumers
declare global {
  interface Window {
    electronAPI: {
      getAppVersion: () => Promise<string>;
      checkForUpdates: (options?: { force?: boolean }) => Promise<{ available: boolean; version?: string }>;
      getPreferences: (keys?: string[]) => Promise<Record<string, string | number | boolean>>;
      setPreference: (key: string, value: string | number | boolean) => Promise<void>;
      requestBiometricAuth: (reason: string) => Promise<{ success: boolean; error?: string }>;
      secureStoreGet: (key: string) => Promise<string | null>;
      secureStoreSet: (key: string, value: string) => Promise<void>;
      secureStoreDelete: (key: string) => Promise<void>;
    };
  }
}