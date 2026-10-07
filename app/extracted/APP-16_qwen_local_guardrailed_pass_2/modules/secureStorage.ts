import { getEncryptedStorage } from 'react-native-encrypted-storage';
import * as Crypto from 'expo-crypto';
import { Buffer } from 'buffer';

// Rule 0: Storage rules apply.
// Rule 1: EncryptedStorage uses iOS Keychain / Android Keystore (device-only).
// Rule 3: No vendor secrets in bundle; keys generated locally.

const KEY_PREFIX = 'doc_key_';

/**
 * Generates a deterministic AES-256 key based on a user identifier.
 * Uses HKDF-like derivation from a master secret (stored in secure storage) 
 * to ensure the same user always gets the same key for the same document ID.
 */
export async function deriveKey(userSecret: string, documentId: string): Promise<string> {
  // In production, userSecret is fetched from SecureStorage on first login.
  // For this utility, we assume it's passed in.
  const salt = 'react-native-doc-encrypt-salt-v1';
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${userSecret}:${documentId}:${salt}`
  );
  return hash;
}

/**
 * Encrypts a document string and stores it in encrypted storage.
 * 
 * @param userSecret - The user's master secret (e.g., from SecureStorage).
 * @param documentId - A unique identifier for the document.
 * @param plaintext - The document content to encrypt.
 * @returns Promise<void>
 */
export async function encryptDocument(
  userSecret: string,
  documentId: string,
  plaintext: string
): Promise<void> {
  const key = await deriveKey(userSecret, documentId);
  
  // Encrypt using AES-256-CBC (via expo-crypto which wraps OpenSSL)
  // Note: expo-crypto's encryptString uses AES-256-CBC by default with a random IV
  // prepended to the ciphertext.
  const encrypted = await Crypto.encryptString(plaintext, key);
  
  // Rule 1: Store in encrypted storage (Keychain/Keystore)
  await getEncryptedStorage().setItem(documentId, encrypted);
}

/**
 * Decrypts a document from encrypted storage.
 * 
 * @param userSecret - The user's master secret.
 * @param documentId - The unique identifier of the document.
 * @returns Promise<string> The decrypted plaintext.
 */
export async function decryptDocument(
  userSecret: string,
  documentId: string
): Promise<string> {
  const key = await deriveKey(userSecret, documentId);
  
  // Retrieve from encrypted storage
  const encrypted = await getEncryptedStorage().getItem(documentId);
  
  if (!encrypted) {
    throw new Error(`Document ${documentId} not found.`);
  }
  
  // Decrypt using AES-256-CBC
  const plaintext = await Crypto.decryptString(encrypted, key);
  
  return plaintext;
}

/**
 * Deletes a document from encrypted storage.
 */
export async function deleteDocument(documentId: string): Promise<void> {
  await getEncryptedStorage().removeItem(documentId);
}