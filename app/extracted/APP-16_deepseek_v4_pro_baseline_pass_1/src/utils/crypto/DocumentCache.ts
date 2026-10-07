import AsyncStorage from '@react-native-async-storage/async-storage';
import AES256Crypto from './AES256Crypto';

/**
 * High-level document cache that transparently encrypts/decrypts
 * user documents stored in AsyncStorage using AES-256.
 */

const CACHE_PREFIX = '@encrypted_document_cache/';

export interface CachedDocument {
  id: string;
  encryptedContent: string;
  updatedAt: string;
  size: number;
}

class DocumentCache {
  private crypto: AES256Crypto;

  constructor() {
    this.crypto = AES256Crypto;
  }

  /**
   * Store a document in the encrypted cache.
   *
   * @param documentId - Unique identifier for the document
   * @param content - Plaintext document content
   * @param passphrase - User passphrase for encryption
   */
  public async put(
    documentId: string,
    content: string,
    passphrase: string,
  ): Promise<void> {
    const encryptedContent = await this.crypto.encryptDocumentToString(
      content,
      passphrase,
    );

    const cachedDoc: CachedDocument = {
      id: documentId,
      encryptedContent,
      updatedAt: new Date().toISOString(),
      size: content.length,
    };

    await AsyncStorage.setItem(
      `${CACHE_PREFIX}${documentId}`,
      JSON.stringify(cachedDoc),
    );
  }

  /**
   * Retrieve and decrypt a document from the cache.
   *
   * @param documentId - Unique identifier for the document
   * @param passphrase - User passphrase for decryption
   * @returns The decrypted document content, or null if not found
   */
  public async get(
    documentId: string,
    passphrase: string,
  ): Promise<string | null> {
    const raw = await AsyncStorage.getItem(`${CACHE_PREFIX}${documentId}`);
    if (!raw) {
      return null;
    }

    const cachedDoc: CachedDocument = JSON.parse(raw);
    return this.crypto.decryptDocumentFromString(
      cachedDoc.encryptedContent,
      passphrase,
    );
  }

  /**
   * Check if a document exists in the cache.
   */
  public async has(documentId: string): Promise<boolean> {
    const raw = await AsyncStorage.getItem(`${CACHE_PREFIX}${documentId}`);
    return raw !== null;
  }

  /**
   * Remove a document from the cache.
   */
  public async remove(documentId: string): Promise<void> {
    await AsyncStorage.removeItem(`${CACHE_PREFIX}${documentId}`);
  }

  /**
   * Clear all cached documents.
   */
  public async clearAll(): Promise<void> {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((key) => key.startsWith(CACHE_PREFIX));
    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
    }
  }

  /**
   * Get metadata for all cached documents without decrypting them.
   */
  public async listAll(): Promise<CachedDocument[]> {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((key) => key.startsWith(CACHE_PREFIX));

    const docs: CachedDocument[] = [];
    for (const key of cacheKeys) {
      const raw = await AsyncStorage.getItem(key);
      if (raw) {
        docs.push(JSON.parse(raw));
      }
    }
    return docs;
  }

  /**
   * Get the total size of all cached documents in bytes (approximate).
   */
  public async getTotalCacheSize(): Promise<number> {
    const docs = await this.listAll();
    return docs.reduce((total, doc) => total + doc.size, 0);
  }
}

export default new DocumentCache();