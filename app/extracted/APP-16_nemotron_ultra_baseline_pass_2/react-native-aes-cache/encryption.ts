import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEY_STORAGE_KEY = 'aes_cache_encryption_key_v1';
const IV_LENGTH = 16;
const KEY_LENGTH = 32;
const ALGORITHM = 'AES-256-GCM';
const TAG_LENGTH = 16;

interface EncryptedPayload {
  iv: string;
  ciphertext: string;
  tag: string;
}

async function getOrCreateKey(): Promise<Uint8Array> {
  let keyBase64 = await SecureStore.getItemAsync(KEY_STORAGE_KEY);
  
  if (!keyBase64) {
    const randomBytes = await Crypto.getRandomBytesAsync(KEY_LENGTH);
    keyBase64 = Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      Buffer.from(randomBytes).toString('base64')
    );
    await SecureStore.setItemAsync(KEY_STORAGE_KEY, keyBase64);
  }
  
  return Uint8Array.from(atob(keyBase64), c => c.charCodeAt(0));
}

async function deriveKey(masterKey: Uint8Array, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    masterKey,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ALGORITHM, length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptDocument(document: string): Promise<string> {
  const masterKey = await getOrCreateKey();
  const salt = new Uint8Array(await Crypto.getRandomBytesAsync(16));
  const iv = new Uint8Array(await Crypto.getRandomBytesAsync(IV_LENGTH));
  
  const key = await deriveKey(masterKey, salt);
  
  const encoder = new TextEncoder();
  const data = encoder.encode(document);
  
  const encrypted = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv, tagLength: TAG_LENGTH * 8 },
    key,
    data
  );
  
  const encryptedArray = new Uint8Array(encrypted);
  const ciphertext = encryptedArray.slice(0, -TAG_LENGTH);
  const tag = encryptedArray.slice(-TAG_LENGTH);
  
  const payload: EncryptedPayload = {
    iv: Buffer.from(iv).toString('base64'),
    ciphertext: Buffer.from(ciphertext).toString('base64'),
    tag: Buffer.from(tag).toString('base64'),
  };
  
  const payloadWithSalt = {
    ...payload,
    salt: Buffer.from(salt).toString('base64'),
  };
  
  return Buffer.from(JSON.stringify(payloadWithSalt)).toString('base64');
}

export async function decryptDocument(encryptedBase64: string): Promise<string> {
  const masterKey = await getOrCreateKey();
  
  const payloadJson = Buffer.from(encryptedBase64, 'base64').toString('utf-8');
  const payload = JSON.parse(payloadJson) as EncryptedPayload & { salt: string };
  
  const salt = Uint8Array.from(atob(payload.salt), c => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(payload.iv), c => c.charCodeAt(0));
  const ciphertext = Uint8Array.from(atob(payload.ciphertext), c => c.charCodeAt(0));
  const tag = Uint8Array.from(atob(payload.tag), c => c.charCodeAt(0));
  
  const key = await deriveKey(masterKey, salt);
  
  const combined = new Uint8Array(ciphertext.length + tag.length);
  combined.set(ciphertext);
  combined.set(tag, ciphertext.length);
  
  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv, tagLength: TAG_LENGTH * 8 },
    key,
    combined
  );
  
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

export async function clearEncryptionKey(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY_STORAGE_KEY);
}

export async function rotateEncryptionKey(): Promise<void> {
  await clearEncryptionKey();
  await getOrCreateKey();
}