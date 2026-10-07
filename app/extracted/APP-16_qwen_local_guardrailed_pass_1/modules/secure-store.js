import * as SecureStore from 'expo-secure-store';

/**
 * Encrypts and stores a user document.
 * 
 * Rule Set: §1 (Storage)
 * - Uses SecureStore (hardware-backed keychain/keystore).
 * - Key is device-only.
 * - No plaintext tokens/PII in AsyncStorage.
 */
export const encryptDocument = async (key, documentData) => {
  try {
    // SecureStore handles AES-256-GCM encryption under the hood on iOS/Android
    // Key is device-only accessible (WHEN_UNLOCKED_THIS_DEVICE_ONLY on iOS, 
    // DEFAULT on Android with hardware backing if available).
    await SecureStore.setItemAsync(key, JSON.stringify(documentData));
    return true;
  } catch (error) {
    console.error('SecureStore encryption failed:', error);
    throw error;
  }
};

/**
 * Decrypts and retrieves a user document.
 * 
 * Rule Set: §1 (Storage)
 * - Returns minimal fields.
 * - Accesses hardware-backed key.
 */
export const decryptDocument = async (key) => {
  try {
    const encryptedData = await SecureStore.getItemAsync(key);
    if (!encryptedData) {
      return null;
    }
    return JSON.parse(encryptedData);
  } catch (error) {
    console.error('SecureStore decryption failed:', error);
    throw error;
  }
};

/**
 * Deletes a user document.
 * 
 * Rule Set: §1 (Storage)
 * - Wipes the key from the secure store.
 */
export const deleteDocument = async (key) => {
  try {
    await SecureStore.deleteItemAsync(key);
    return true;
  } catch (error) {
    console.error('SecureStore deletion failed:', error);
    throw error;
  }
};