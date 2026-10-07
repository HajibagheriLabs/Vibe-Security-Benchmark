import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainService: 'com.myapp.secure',
  keychainAccessible: Platform.OS === 'ios'
    ? SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
    : SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

function base64URLEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export async function generatePKCEPair(): Promise<{ codeVerifier: string; codeChallenge: string; state: string }> {
  const verifierBytes = new Uint8Array(32);
  crypto.getRandomValues(verifierBytes);
  const codeVerifier = base64URLEncode(verifierBytes.buffer);

  const challengeBytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier));
  const codeChallenge = base64URLEncode(challengeBytes);

  const stateBytes = new Uint8Array(16);
  crypto.getRandomValues(stateBytes);
  const state = base64URLEncode(stateBytes.buffer);

  await Promise.all([
    SecureStore.setItemAsync('pkce_verifier', codeVerifier, SECURE_STORE_OPTIONS),
    SecureStore.setItemAsync('pkce_state', state, SECURE_STORE_OPTIONS),
  ]);

  return { codeVerifier, codeChallenge, state };
}

export async function clearPKCE(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync('pkce_verifier', SECURE_STORE_OPTIONS),
    SecureStore.deleteItemAsync('pkce_state', SECURE_STORE_OPTIONS),
  ]);
}