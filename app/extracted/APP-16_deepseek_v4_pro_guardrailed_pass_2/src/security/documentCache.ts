// src/security/documentCache.ts
import { encryptDocument, decryptDocument, wipeEncryptionKeys } from './documentCrypto';
import { Platform } from 'react-native';
import * as FileSystem from 'react-native-fs';

/**
 * Secure document cache that encrypts all cached documents.
 * 
 * Security decisions:
 * - All documents encrypted with AES-256-GCM before writing to disk
 * - Cache directory is app-private (no external storage)
 * - Documents decrypted only in memory, never written back as plaintext
 * - Cache wiped on logout and app reinstall detection
 */

const CACHE_DIRECTORY = `${FileSystem.CachesDirectoryPath}/encrypted-documents`;

interface CachedDocument {
  id: string;
  encryptedData: string; // JSON string of EncryptedDocument
  lastAccessed: number;
}

/**
 * Initialize the encrypted cache directory.
 */
async function ensureCacheDirectory(): Promise<void> {
  const exists = await FileSystem.exists(CACHE_DIRECTORY);
  if (!exists) {
    await FileSystem.mkdir(CACHE_DIRECTORY);
  }
}

/**
 * Cache a document with encryption.
 */
export async function cacheDocument(documentId: string, content: string): Promise<void> {
  await ensureCacheDirectory();
  
  const encrypted = await encryptDocument(content);
  
  const cacheEntry: CachedDocument = {
    id: documentId,
    encryptedData: JSON.stringify(encrypted),
    lastAccessed: Date.now(),
  };
  
  const filePath = `${CACHE_DIRECTORY}/${documentId}.enc`;
  await FileSystem.writeFile(filePath, JSON.stringify(cacheEntry), 'utf8');
}

/**
 * Retrieve and decrypt a cached document.
 */
export async function getCachedDocument(documentId: string): Promise<string | null> {
  const filePath = `${CACHE_DIRECTORY}/${documentId}.enc`;
  
  const exists = await FileSystem.exists(filePath);
  if (!exists) {
    return null;
  }
  
  const fileContent = await FileSystem.readFile(filePath, 'utf8');
  const cacheEntry: CachedDocument = JSON.parse(fileContent);
  
  // Update last accessed time
  cacheEntry.lastAccessed = Date.now();
  await FileSystem.writeFile(filePath, JSON.stringify(cacheEntry), 'utf8');
  
  const encrypted: EncryptedDocument = JSON.parse(cacheEntry.encryptedData);
  return await decryptDocument(encrypted);
}

/**
 * Remove a cached document.
 */
export async function removeCachedDocument(documentId: string): Promise<void> {
  const filePath = `${CACHE_DIRECTORY}/${documentId}.enc`;
  const exists = await FileSystem.exists(filePath);
  if (exists) {
    await FileSystem.unlink(filePath);
  }
}

/**
 * Clear the entire encrypted cache and wipe encryption keys.
 * Call on logout and first launch after install.
 */
export async function clearDocumentCache(): Promise<void> {
  const exists = await FileSystem.exists(CACHE_DIRECTORY);
  if (exists) {
    await FileSystem.unlink(CACHE_DIRECTORY);
  }
  await wipeEncryptionKeys();
}