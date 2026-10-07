// src/utils/documentEncryption.ts

import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

/**
 * Interface for encrypted document payload.
 */
export interface EncryptedDocument {
  ciphertext: string;
  iv: string;
  authTag: string;
}

/**
 * Generates a random AES-256 key and stores it in SecureStore.
 * @returns The base64-encoded AES-256 key.
 */
export async function generateAndStoreEncryptionKey(): Promise<string> {
  const keyBytes = new Uint8Array(32); // 256 bits
  await Crypto.getRandomValuesAsync(keyBytes);
  const keyBase64 = Crypto.encodeBase64(keyBytes);
  
  await SecureStore.setItemAsync('userDocEncryptionKey', keyBase64);
  return keyBase64;
}

/**
 * Retrieves the AES-256 key from SecureStore.
 * @returns The base64-encoded AES-256 key, or null if not found.
 */
export async function getEncryptionKey(): Promise<string | null> {
  return await SecureStore.getItemAsync('userDocEncryptionKey');
}

/**
 * Encrypts a document string using AES-256-GCM.
 * @param documentString The plaintext document to encrypt.
 * @param keyBase64 The base64-encoded AES-256 key.
 * @returns The encrypted payload (ciphertext, IV, auth tag).
 */
export async function encryptDocument(
  documentString: string,
  keyBase64: string
): Promise<EncryptedDocument> {
  const keyBytes = Crypto.decodeBase64(keyBase64);
  
  // Generate a random IV (12 bytes for GCM)
  const ivBytes = new Uint8Array(12);
  await Crypto.getRandomValuesAsync(ivBytes);
  const ivBase64 = Crypto.encodeBase64(ivBytes);

  // Import the key for AES-GCM
  const cryptoKey = await Crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  // Encrypt the document
  const encoder = new TextEncoder();
  const documentBytes = encoder.encode(documentString);

  const encryptedData = await Crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: ivBytes },
    cryptoKey,
    documentBytes
  );

  // Extract ciphertext and auth tag
  // In AES-GCM, the last 16 bytes are the authentication tag
  const encryptedBytes = new Uint8Array(encryptedData);
  const authTag = encryptedBytes.slice(encryptedBytes.length - 16);
  const ciphertext = encryptedBytes.slice(0, encryptedBytes.length - 16);

  return {
    ciphertext: Crypto.encodeBase64(ciphertext),
    iv: ivBase64,
    authTag: Crypto.encodeBase64(authTag),
  };
}

/**
 * Decrypts a document using AES-256-GCM.
 * @param encryptedDoc The encrypted payload.
 * @param keyBase64 The base64-encoded AES-256 key.
 * @returns The decrypted plaintext document string.
 */
export async function decryptDocument(
  encryptedDoc: EncryptedDocument,
  keyBase64: string
): Promise<string> {
  const keyBytes = Crypto.decodeBase64(keyBase64);
  const ivBytes = Crypto.decodeBase64(encryptedDoc.iv);
  const ciphertextBytes = Crypto.decodeBase64(encryptedDoc.ciphertext);
  const authTagBytes = Crypto.decodeBase64(encryptedDoc.authTag);

  // Import the key for AES-GCM
  const cryptoKey = await Crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  // Combine ciphertext and auth tag for decryption
  const encryptedData = new Uint8Array(ciphertextBytes.length + authTagBytes.length);
  encryptedData.set(ciphertextBytes, 0);
  encryptedData.set(authTagBytes, ciphertextBytes.length);

  // Decrypt the document
  const decryptedData = await Crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBytes },
    cryptoKey,
    encryptedData
  );

  // Convert bytes to string
  const decoder = new TextDecoder();
  return decoder.decode(decryptedData);
}

/**
 * Main utility function to encrypt and store a document.
 * @param documentId Unique identifier for the document.
 * @param documentString The plaintext document to encrypt.
 */
export async function storeEncryptedDocument(
  documentId: string,
  documentString: string
): Promise<void> {
  let keyBase64 = await getEncryptionKey();
  if (!keyBase64) {
    keyBase64 = await generateAndStoreEncryptionKey();
  }

  const encryptedDoc = await encryptDocument(documentString, keyBase64);
  
  // Store the encrypted document in SecureStore
  // Note: For large documents, consider using a file system and storing the key in SecureStore
  await SecureStore.setItemAsync(`encrypted_doc_${documentId}`, JSON.stringify(encryptedDoc));
}

/**
 * Main utility function to retrieve and decrypt a document.
 * @param documentId Unique identifier for the document.
 * @returns The decrypted plaintext document string, or null if not found.
 */
export async function getDecryptedDocument(
  documentId: string
): Promise<string | null> {
  const keyBase64 = await getEncryptionKey();
  if (!keyBase64) {
    return null;
  }

  const encryptedDocJson = await SecureStore.getItemAsync(`encrypted_doc_${documentId}`);
  if (!encryptedDocJson) {
    return null;
  }

  const encryptedDoc: EncryptedDocument = JSON.parse(encryptedDocJson);
  
  try {
    return await decryptDocument(encryptedDoc, keyBase64);
  } catch (e) {
    console.error('Failed to decrypt document:', e);
    return null;
  }
}