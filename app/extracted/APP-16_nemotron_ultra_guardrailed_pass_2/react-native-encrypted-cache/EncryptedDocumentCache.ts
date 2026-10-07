import * as SecureStore from 'expo-secure-store';
import { Crypto } from 'expo-crypto';

const KEY_ALIAS = 'doc_cache_key_v1';
const ITERATIONS = 210_000;
const SALT_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32; // 256-bit

async function getOrCreateKey(): Promise<CryptoKey> {
  const existing = await SecureStore.getItemAsync(KEY_ALIAS, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    requireAuthentication: true,
    authenticationPrompt: 'Authenticate to access cached documents',
  });

  if (existing) {
    const raw = Uint8Array.from(atob(existing), c => c.charCodeAt(0));
    return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
  }

  const salt = Crypto.getRandomBytes(SALT_LENGTH);
  const passphrase = Crypto.getRandomBytes(32);
  const keyMaterial = await crypto.subtle.importKey('raw', passphrase, 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  const exported = await crypto.subtle.exportKey('raw', key);
  await SecureStore.setItemAsync(KEY_ALIAS, btoa(String.fromCharCode(...new Uint8Array(exported))), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    requireAuthentication: true,
    authenticationPrompt: 'Authenticate to access cached documents',
    setInvalidatedByBiometricEnrollment: true,
  });
  return key;
}

export async function encryptDocument(plaintext: string): Promise<string> {
  const key = await getOrCreateKey();
  const iv = Crypto.getRandomBytes(IV_LENGTH);
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  const combined = new Uint8Array(IV_LENGTH + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), IV_LENGTH);
  return btoa(String.fromCharCode(...combined));
}

export async function decryptDocument(payload: string): Promise<string> {
  const key = await getOrCreateKey();
  const combined = Uint8Array.from(atob(payload), c => c.charCodeAt(0));
  if (combined.length < IV_LENGTH + TAG_LENGTH) throw new Error('Invalid ciphertext');
  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return new TextDecoder().decode(plaintext);
}

export async function wipeCache(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY_ALIAS);
}