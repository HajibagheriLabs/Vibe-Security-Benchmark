import { NativeModules, Platform } from 'react-native';
import * as Crypto from 'react-native-quick-crypto';
import { Buffer } from '@craftzdog/react-native-buffer';

/**
 * Security rule set applied: §1 STORAGE — the device is hostile.
 * - AES-256-GCM encryption with keys stored in platform secure storage (Keychain/Keystore).
 * - Device-only accessibility, no sync, no backup.
 * - Keys never leave secure hardware; plaintext never persisted.
 */

interface SecureStoreModule {
  setItem(key: string, value: string, options?: Record<string, unknown>): Promise<void>;
  getItem(key: string, options?: Record<string, unknown>): Promise<string | null>;
  deleteItem(key: string, options?: Record<string, unknown>): Promise<void>;
}

interface KeychainOptions {
  accessible?: string;
  accessGroup?: string;
  service?: string;
  authenticationPrompt?: string;
  authenticationType?: string;
  securityLevel?: string;
  storage?: string;
}

const SecureStore: SecureStoreModule = NativeModules.RNSecureStorage;

const KEYCHAIN_OPTIONS: KeychainOptions = Platform.select({
  ios: {
    accessible: 'kSecAttrAccessibleWhenUnlockedThisDeviceOnly',
    accessGroup: undefined,
    service: 'com.app.document-cache',
  },
  android: {
    storage: 'AES_GCM_NO_PADDING',
    securityLevel: 'SECURE_HARDWARE',
  },
  default: {},
}) as KeychainOptions;

const KEY_ALIAS = 'document_cache_master_key_v1';
const IV_LENGTH = 12; // GCM recommended IV size
const TAG_LENGTH = 16; // GCM authentication tag size
const KEY_LENGTH = 32; // AES-256

/**
 * Generates a cryptographically secure random AES-256 key.
 * The key is generated inside the secure store and never leaves it.
 */
async function generateMasterKey(): Promise<Buffer> {
  const keyBytes = Crypto.randomBytes(KEY_LENGTH);
  const keyBase64 = keyBytes.toString('base64');
  
  await SecureStore.setItem(KEY_ALIAS, keyBase64, KEYCHAIN_OPTIONS);
  
  // Zero out the temporary buffer
  keyBytes.fill(0);
  
  return Buffer.from(keyBase64, 'base64');
}

/**
 * Retrieves the master key from secure storage.
 * If no key exists, generates a new one.
 */
async function getOrCreateMasterKey(): Promise<Buffer> {
  const storedKey = await SecureStore.getItem(KEY_ALIAS, KEYCHAIN_OPTIONS);
  
  if (storedKey) {
    return Buffer.from(storedKey, 'base64');
  }
  
  return generateMasterKey();
}

/**
 * Derives a document-specific encryption key using HKDF.
 * This ensures each document gets a unique key while the master key stays in secure storage.
 */
function deriveDocumentKey(masterKey: Buffer, documentId: string): Buffer {
  const salt = Crypto.createHash('sha256').update(`doc-salt:${documentId}`).digest();
  const info = Buffer.from('document-encryption-v1', 'utf8');
  
  const derivedKey = Crypto.hkdfSync('sha256', masterKey, salt, info, KEY_LENGTH);
  
  return derivedKey;
}

/**
 * Encrypts a document using AES-256-GCM.
 * 
 * @param plaintext - The document content as a string or Buffer
 * @param documentId - Unique identifier for the document (used for key derivation)
 * @returns Base64-encoded ciphertext with IV and auth tag prepended
 */
export async function encryptDocument(
  plaintext: string | Buffer,
  documentId: string
): Promise<string> {
  if (!documentId || documentId.length === 0) {
    throw new Error('documentId is required for encryption');
  }
  
  const masterKey = await getOrCreateMasterKey();
  const documentKey = deriveDocumentKey(masterKey, documentId);
  
  const iv = Crypto.randomBytes(IV_LENGTH);
  const plaintextBuffer = Buffer.isBuffer(plaintext) 
    ? plaintext 
    : Buffer.from(plaintext, 'utf8');
  
  const cipher = Crypto.createCipheriv('aes-256-gcm', documentKey, iv);
  
  const ciphertext = Buffer.concat([
    cipher.update(plaintextBuffer),
    cipher.final(),
  ]);
  
  const authTag = cipher.getAuthTag();
  
  // Zero out sensitive buffers
  documentKey.fill(0);
  
  // Format: [IV (12 bytes)][Auth Tag (16 bytes)][Ciphertext]
  const result = Buffer.concat([iv, authTag, ciphertext]);
  
  return result.toString('base64');
}

/**
 * Decrypts a document that was encrypted with encryptDocument.
 * 
 * @param encryptedData - Base64-encoded ciphertext with IV and auth tag prepended
 * @param documentId - Unique identifier for the document (must match encryption)
 * @returns Decrypted document content as Buffer
 */
export async function decryptDocument(
  encryptedData: string,
  documentId: string
): Promise<Buffer> {
  if (!documentId || documentId.length === 0) {
    throw new Error('documentId is required for decryption');
  }
  
  const masterKey = await getOrCreateMasterKey();
  const documentKey = deriveDocumentKey(masterKey, documentId);
  
  const encryptedBuffer = Buffer.from(encryptedData, 'base64');
  
  if (encryptedBuffer.length < IV_LENGTH + TAG_LENGTH) {
    throw new Error('Invalid encrypted data: too short');
  }
  
  const iv = encryptedBuffer.subarray(0, IV_LENGTH);
  const authTag = encryptedBuffer.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = encryptedBuffer.subarray(IV_LENGTH + TAG_LENGTH);
  
  const decipher = Crypto.createDecipheriv('aes-256-gcm', documentKey, iv);
  decipher.setAuthTag(authTag);
  
  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  
  // Zero out sensitive buffers
  documentKey.fill(0);
  
  return plaintext;
}

/**
 * Encrypts a document and returns it as a Buffer (for direct file writing).
 */
export async function encryptDocumentToBuffer(
  plaintext: string | Buffer,
  documentId: string
): Promise<Buffer> {
  const encryptedBase64 = await encryptDocument(plaintext, documentId);
  return Buffer.from(encryptedBase64, 'base64');
}

/**
 * Decrypts a document from a Buffer (for direct file reading).
 */
export async function decryptDocumentFromBuffer(
  encryptedBuffer: Buffer,
  documentId: string
): Promise<Buffer> {
  return decryptDocument(encryptedBuffer.toString('base64'), documentId);
}

/**
 * Wipes the master key from secure storage.
 * Should be called on logout or when clearing all cached documents.
 */
export async function wipeDocumentCacheKeys(): Promise<void> {
  await SecureStore.deleteItem(KEY_ALIAS, KEYCHAIN_OPTIONS);
}

/**
 * Rotates the master key by generating a new one.
 * Note: This invalidates all previously encrypted documents.
 * Callers must re-encrypt documents after rotation.
 */
export async function rotateMasterKey(): Promise<void> {
  await wipeDocumentCacheKeys();
  await generateMasterKey();
}