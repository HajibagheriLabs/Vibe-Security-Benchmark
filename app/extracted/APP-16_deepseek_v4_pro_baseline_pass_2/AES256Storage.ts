import { NativeModules, Platform } from 'react-native';
import { getRandomBytes, encrypt, decrypt, CipherMode } from 'react-native-aes-crypto';

interface EncryptedDocument {
  cipherText: string;
  iv: string;
  tag: string;
  timestamp: number;
}

interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

const AES_KEY_SIZE = 32; // 256 bits
const AES_IV_SIZE = 16; // 128 bits
const AES_TAG_SIZE = 16; // 128 bits for GCM auth tag

class AES256Storage {
  private encryptionKey: string | null = null;
  private storageAdapter: StorageAdapter;

  constructor(storageAdapter?: StorageAdapter) {
    this.storageAdapter = storageAdapter || this.getDefaultStorageAdapter();
  }

  /**
   * Initialize the encryption key. Must be called before any encrypt/decrypt operations.
   * @param key - Base64-encoded 32-byte AES-256 key
   */
  async initialize(key: string): Promise<void> {
    if (!key || key.length === 0) {
      throw new Error('Encryption key cannot be empty');
    }

    // Validate key length (base64 decoded should be 32 bytes)
    const decodedKey = Buffer.from(key, 'base64');
    if (decodedKey.length !== AES_KEY_SIZE) {
      throw new Error(
        `Invalid AES-256 key length. Expected ${AES_KEY_SIZE} bytes, got ${decodedKey.length}`
      );
    }

    this.encryptionKey = key;
  }

  /**
   * Encrypt and store a document in the cache.
   * @param key - Cache key for the document
   * @param document - Plain text document to encrypt
   */
  async encryptAndStore(key: string, document: string): Promise<void> {
    this.assertInitialized();

    const iv = await this.generateIV();
    const result = await encrypt(
      document,
      this.encryptionKey!,
      iv,
      'aes-256-gcm'
    );

    const encryptedDoc: EncryptedDocument = {
      cipherText: result.cipherText,
      iv,
      tag: result.tag || '',
      timestamp: Date.now(),
    };

    await this.storageAdapter.setItem(key, JSON.stringify(encryptedDoc));
  }

  /**
   * Retrieve and decrypt a document from the cache.
   * @param key - Cache key for the document
   * @returns Decrypted plain text document, or null if not found
   */
  async retrieveAndDecrypt(key: string): Promise<string | null> {
    this.assertInitialized();

    const storedValue = await this.storageAdapter.getItem(key);
    if (!storedValue) {
      return null;
    }

    try {
      const encryptedDoc: EncryptedDocument = JSON.parse(storedValue);
      const decrypted = await decrypt(
        encryptedDoc.cipherText,
        this.encryptionKey!,
        encryptedDoc.iv,
        'aes-256-gcm',
        encryptedDoc.tag
      );
      return decrypted;
    } catch (error) {
      throw new Error(
        `Failed to decrypt document for key "${key}": ${(error as Error).message}`
      );
    }
  }

  /**
   * Remove a document from the cache.
   * @param key - Cache key to remove
   */
  async removeDocument(key: string): Promise<void> {
    await this.storageAdapter.removeItem(key);
  }

  /**
   * Check if a document exists in the cache.
   * @param key - Cache key to check
   */
  async hasDocument(key: string): Promise<boolean> {
    const value = await this.storageAdapter.getItem(key);
    return value !== null;
  }

  /**
   * Clear the encryption key from memory.
   */
  clearKey(): void {
    this.encryptionKey = null;
  }

  /**
   * Check if the storage is initialized with a valid key.
   */
  isInitialized(): boolean {
    return this.encryptionKey !== null;
  }

  private async generateIV(): Promise<string> {
    const ivBytes = await getRandomBytes(AES_IV_SIZE);
    return Buffer.from(ivBytes).toString('base64');
  }

  private assertInitialized(): void {
    if (!this.encryptionKey) {
      throw new Error(
        'AES256Storage not initialized. Call initialize(key) before performing operations.'
      );
    }
  }

  private getDefaultStorageAdapter(): StorageAdapter {
    if (Platform.OS === 'web') {
      return {
        getItem: async (key: string) => localStorage.getItem(key),
        setItem: async (key: string, value: string) => {
          localStorage.setItem(key, value);
        },
        removeItem: async (key: string) => {
          localStorage.removeItem(key);
        },
      };
    }

    // React Native AsyncStorage
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    return {
      getItem: async (key: string) => AsyncStorage.getItem(key),
      setItem: async (key: string, value: string) => {
        await AsyncStorage.setItem(key, value);
      },
      removeItem: async (key: string) => {
        await AsyncStorage.removeItem(key);
      },
    };
  }
}

// Export singleton instance
export const aes256Storage = new AES256Storage();

// Export class for custom instantiation
export { AES256Storage };
export type { EncryptedDocument, StorageAdapter };