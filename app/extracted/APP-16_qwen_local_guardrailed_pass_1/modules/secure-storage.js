import * as SecureStore from 'expo-secure-store';

/**
 * Utility to manage multiple encrypted documents under a namespace.
 * 
 * Rule Set: §1 (Storage)
 * - Namespace prefixing ensures isolation.
 * - Uses SecureStore for all sensitive persistence.
 * - Device-only accessibility.
 */
export class EncryptedDocumentStore {
  constructor(namespace) {
    this.namespace = namespace;
  }

  /**
   * Stores a document.
   * @param {string} docId - Unique identifier for the document.
   * @param {object} data - The document data to encrypt.
   */
  async store(docId, data) {
    const key = `${this.namespace}:${docId}`;
    await SecureStore.setItemAsync(key, JSON.stringify(data));
  }

  /**
   * Retrieves and decrypts a document.
   * @param {string} docId - Unique identifier for the document.
   * @returns {object|null} The decrypted document data, or null if not found.
   */
  async retrieve(docId) {
    const key = `${this.namespace}:${docId}`;
    const encryptedData = await SecureStore.getItemAsync(key);
    if (!encryptedData) {
      return null;
    }
    return JSON.parse(encryptedData);
  }

  /**
   * Deletes a document.
   * @param {string} docId - Unique identifier for the document.
   */
  async delete(docId) {
    const key = `${this.namespace}:${docId}`;
    await SecureStore.deleteItemAsync(key);
  }

  /**
   * Deletes all documents in the namespace.
   */
  async deleteAll() {
    // Note: SecureStore does not have a native "delete by prefix" method.
    // We retrieve all keys and delete them.
    const keys = await SecureStore.getKeysAsync();
    const namespaceKeys = keys.filter(k => k.startsWith(`${this.namespace}:`));
    for (const key of namespaceKeys) {
      await SecureStore.deleteItemAsync(key);
    }
  }
}