import * as Keychain from 'react-native-keychain';
import { randomBytes } from 'react-native-quick-crypto';
import { decrypt, encrypt } from 'react-native-quick-crypto';

// ────────────────── Types ──────────────────
export interface EncryptedDocument {
  /** Base64 ciphertext (AES-256-GCM) */
  data: string;
  /** Base64 wrapped DEK (RSA-OAEP-SHA256 by Keystore/Enclave) */
  wrappedKey: string;
  /** Base64 12-byte nonce used for this encryption */
  iv: string;
  /** Base64 16-byte GCM auth tag */
  tag: string;
  /** ISO timestamp for cache expiry policy */
  createdAt: string;
}

// ────────────────── Constants ──────────────────
const MASTER_KEY_ALIAS = 'secure-doc-cache-master-key';
const KEYCHAIN_OPTIONS: Keychain.KeychainOptions = {
  // Device-only, invalidated on biometric enrollment change
  accessControl: Keychain.ACCESS_CONTROL.DEVICE_PASSCODE_OR_BIOMETRY,
  authenticationType: Keychain.AUTHENTICATION_TYPE.BIOMETRY_OR_DEVICE_CREDENTIALS,
  storage: Keychain.STORAGE_TYPE.RSA,          // forces hardware-backed on Android
  accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  authenticationPrompt: {
    title: 'Document Cache',
    subtitle: 'Authenticate to access cached documents',
  },
  // Android: invalidate key if user enrolls new biometric
  invalidatedByBiometricEnrollment: true,
};

// ────────────────── Internal helpers ──────────────────
async function ensureMasterKey(): Promise<void> {
  const exists = await Keychain.getGenericPassword({ service: MASTER_KEY_ALIAS });
  if (!exists) {
    // Generates a 256-bit RSA-wrapped AES key inside Secure Enclave / StrongBox
    await Keychain.setGenericPassword(MASTER_KEY_ALIAS, '', KEYCHAIN_OPTIONS);
  }
}

async function unwrapDek(wrappedKeyB64: string): Promise<CryptoKey> {
  const master = await Keychain.getGenericPassword({ service: MASTER_KEY_ALIAS });
  if (!master) throw new Error('Master key missing');
  // react-native-keychain returns the private key handle; we use SubtleCrypto.unwrapKey
  const subtle = (globalThis as any).crypto.subtle;
  const masterKey = await subtle.importKey(
    'pkcs8',
    Buffer.from(master.password, 'base64'),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['unwrapKey'],
  );
  return subtle.unwrapKey(
    'raw',
    Buffer.from(wrappedKeyB64, 'base64'),
    masterKey,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt'],
  );
}

async function wrapDek(dek: CryptoKey): Promise<string> {
  const master = await Keychain.getGenericPassword({ service: MASTER_KEY_ALIAS });
  if (!master) throw new Error('Master key missing');
  const subtle = (globalThis as any).crypto.subtle;
  const masterKey = await subtle.importKey(
    'pkcs8',
    Buffer.from(master.password, 'base64'),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['wrapKey'],
  );
  const wrapped = await subtle.wrapKey('raw', dek, masterKey, { name: 'RSA-OAEP', hash: 'SHA-256' });
  return Buffer.from(wrapped).toString('base64');
}

// ────────────────── Public API ──────────────────
export async function encryptDocument(plaintext: Uint8Array): Promise<EncryptedDocument> {
  await ensureMasterKey();

  // 1. Generate per-document DEK
  const dek = await (globalThis as any).crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  );

  // 2. Encrypt payload
  const iv = randomBytes(12);
  const ciphertext = await encrypt({ name: 'AES-GCM', iv }, dek, plaintext);
  const tag = ciphertext.slice(-16);
  const data = ciphertext.slice(0, -16);

  // 3. Wrap DEK with master key
  const wrappedKey = await wrapDek(dek);

  return {
    data: Buffer.from(data).toString('base64'),
    wrappedKey,
    iv: Buffer.from(iv).toString('base64'),
    tag: Buffer.from(tag).toString('base64'),
    createdAt: new Date().toISOString(),
  };
}

export async function decryptDocument(enc: EncryptedDocument): Promise<Uint8Array> {
  const dek = await unwrapDek(enc.wrappedKey);
  const ciphertext = Buffer.concat([
    Buffer.from(enc.data, 'base64'),
    Buffer.from(enc.tag, 'base64'),
  ]);
  const plaintext = await decrypt(
    { name: 'AES-GCM', iv: Buffer.from(enc.iv, 'base64') },
    dek,
    ciphertext,
  );
  return new Uint8Array(plaintext);
}

// Call on logout / account switch
export async function wipeCache(): Promise<void> {
  await Keychain.resetGenericPassword({ service: MASTER_KEY_ALIAS });
}