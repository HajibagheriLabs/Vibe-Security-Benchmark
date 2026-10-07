import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEY_ALIAS = 'aes256_cache_key_v1';
const IV_LENGTH = 16; // AES block size
const KEY_LENGTH = 32; // 256 bits
const TAG_LENGTH = 16; // GCM auth tag
const SALT_LENGTH = 16;
const ITERATIONS = 100_000;

/**
 * Derives a 256-bit AES key from the master key stored in SecureStore
 * using PBKDF2 with a per-encryption salt.
 */
async function deriveKey(salt: Uint8Array): Promise<CryptoKey> {
  const masterKeyB64 = await SecureStore.getItemAsync(KEY_ALIAS);
  let masterKey: Uint8Array;

  if (masterKeyB64) {
    masterKey = Uint8Array.from(atob(masterKeyB64), c => c.charCodeAt(0));
  } else {
    masterKey = new Uint8Array(KEY_LENGTH);
    Crypto.getRandomBytes(masterKey);
    await SecureStore.setItemAsync(KEY_ALIAS, btoa(String.fromCharCode(...masterKey)));
  }

  const baseKey = await Crypto.subtle.importKey(
    'raw',
    masterKey,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return Crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a UTF-8 string (JSON-serialized document) with AES-256-GCM.
 * Returns a base64 string: salt(16) || iv(16) || ciphertext || tag(16)
 */
export async function encryptDocument(plaintext: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);

  const salt = new Uint8Array(SALT_LENGTH);
  Crypto.getRandomBytes(salt);

  const iv = new Uint8Array(IV_LENGTH);
  Crypto.getRandomBytes(iv);

  const key = await deriveKey(salt);

  const ciphertext = await Crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, tagLength: TAG_LENGTH * 8 },
    key,
    data
  );

  const cipherBytes = new Uint8Array(ciphertext);
  const tag = cipherBytes.slice(-TAG_LENGTH);
  const encrypted = cipherBytes.slice(0, -TAG_LENGTH);

  const combined = new Uint8Array(SALT_LENGTH + IV_LENGTH + encrypted.length + TAG_LENGTH);
  combined.set(salt, 0);
  combined.set(iv, SALT_LENGTH);
  combined.set(encrypted, SALT_LENGTH + IV_LENGTH);
  combined.set(tag, SALT_LENGTH + IV_LENGTH + encrypted.length);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypts a base64 string produced by encryptDocument.
 * Throws if authentication fails (tampered/corrupt data).
 */
export async function decryptDocument(ciphertextB64: string): Promise<string> {
  const combined = Uint8Array.from(atob(ciphertextB64), c => c.charCodeAt(0));

  if (combined.length < SALT_LENGTH + IV_LENGTH + TAG_LENGTH) {
    throw new Error('Ciphertext too short');
  }

  const salt = combined.slice(0, SALT_LENGTH);
  const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const tag = combined.slice(-TAG_LENGTH);
  const encrypted = combined.slice(SALT_LENGTH + IV_LENGTH, -TAG_LENGTH);

  const key = await deriveKey(salt);

  const ciphertextWithTag = new Uint8Array(encrypted.length + TAG_LENGTH);
  ciphertextWithTag.set(encrypted, 0);
  ciphertextWithTag.set(tag, encrypted.length);

  try {
    const plaintext = await Crypto.subtle.decrypt(
      { name: 'AES-GCM', iv, tagLength: TAG_LENGTH * 8 },
      key,
      ciphertextWithTag
    );
    return new TextDecoder().decode(plaintext);
  } catch {
    throw new Error('Decryption failed: authentication tag mismatch');
  }
}

/**
 * High-level helpers for caching whole objects.
 */
export async function cacheObject<T>(key: string, obj: T): Promise<void> {
  const json = JSON.stringify(obj);
  const encrypted = await encryptDocument(json);
  // In a real app you'd persist `encrypted` to AsyncStorage / MMKV / SQLite
  // using `key` as the storage key. Omitted here to keep the module focused.
  if (Platform.OS !== 'web') {
    const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
    await AsyncStorage.setItem(key, encrypted);
  }
}

export async function getCachedObject<T>(key: string): Promise<T | null> {
  if (Platform.OS !== 'web') {
    const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
    const encrypted = await AsyncStorage.getItem(key);
    if (!encrypted) return null;
    const json = await decryptDocument(encrypted);
    return JSON.parse(json) as T;
  }
  return null;
}