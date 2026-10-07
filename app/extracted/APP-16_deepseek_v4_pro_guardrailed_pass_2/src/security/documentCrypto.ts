// src/security/documentCrypto.ts
import { Platform } from 'react-native';
import * as Keychain from 'react-native-keychain';
import { NativeModules } from 'react-native';

/**
 * AES-256-GCM document encryption utility.
 * 
 * Security decisions:
 * - Key generated inside hardware-backed secure storage (Keychain/Keystore)
 * - AES-256-GCM for authenticated encryption (prevents tampering)
 * - Device-only accessibility, invalidated on biometric enrollment change
 * - No key material ever leaves secure storage or enters JS memory
 * - Random 12-byte IV per encryption operation
 */

const KEYCHAIN_SERVICE = 'com.yourapp.document-encryption';
const KEY_ALIAS = 'document-master-key';
const AES_KEY_SIZE_BITS = 256;
const GCM_IV_LENGTH_BYTES = 12;
const GCM_TAG_LENGTH_BITS = 128;

interface EncryptedDocument {
  ciphertext: string; // base64
  iv: string;         // base64
  tag: string;        // base64
  algorithm: 'AES-256-GCM';
  keyId: string;
}

interface SecureKeyResult {
  keyId: string;
  keyRef: string; // opaque reference, never the raw key
}

/**
 * Generate or retrieve the master key from hardware-backed storage.
 * The raw key never enters JavaScript memory.
 */
async function getOrCreateMasterKey(): Promise<SecureKeyResult> {
  // Check if key already exists in secure storage
  const existingKey = await Keychain.getGenericPassword({
    service: KEYCHAIN_SERVICE,
    authenticationPrompt: {
      title: 'Unlock Document Encryption',
      subtitle: 'Authenticate to access your encrypted documents',
    },
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });

  if (existingKey && existingKey.password) {
    return {
      keyId: existingKey.username,
      keyRef: existingKey.password, // opaque reference to hardware key
    };
  }

  // Generate new key inside secure hardware
  const keyId = `doc-key-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const keyRef = await generateKeyInHardware(keyId);

  // Store reference with device-only accessibility and biometric invalidation
  await Keychain.setGenericPassword(keyId, keyRef, {
    service: KEYCHAIN_SERVICE,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    securityLevel: Keychain.SECURITY_LEVEL.SECURE_HARDWARE,
    storage: Keychain.STORAGE_TYPE.AES_GCM,
    rules: Platform.OS === 'ios' 
      ? Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE
      : undefined,
    androidBiometricPrompt: {
      title: 'Document Encryption Key',
      subtitle: 'Required to access encrypted documents',
      confirmationRequired: false,
      invalidateOnEnrollment: true, // Critical: invalidate if biometrics change
    },
  });

  return { keyId, keyRef };
}

/**
 * Generate a key inside hardware-backed storage.
 * On iOS this uses the Secure Enclave; on Android the Keystore.
 */
async function generateKeyInHardware(keyId: string): Promise<string> {
  if (Platform.OS === 'ios') {
    // iOS: Secure Enclave key generation
    const { SecureEnclaveModule } = NativeModules;
    if (!SecureEnclaveModule?.generateKey) {
      throw new Error('Secure Enclave module not available');
    }
    return await SecureEnclaveModule.generateKey(keyId, AES_KEY_SIZE_BITS);
  } else {
    // Android: Keystore key generation
    const { AndroidKeystoreModule } = NativeModules;
    if (!AndroidKeystoreModule?.generateKey) {
      throw new Error('Android Keystore module not available');
    }
    return await AndroidKeystoreModule.generateKey(keyId, AES_KEY_SIZE_BITS);
  }
}

/**
 * Encrypt a document using AES-256-GCM.
 * 
 * @param plaintext - The document content as a string (UTF-8)
 * @returns EncryptedDocument with ciphertext, IV, and auth tag
 */
export async function encryptDocument(plaintext: string): Promise<EncryptedDocument> {
  if (typeof plaintext !== 'string' || plaintext.length === 0) {
    throw new Error('Plaintext must be a non-empty string');
  }

  const { keyId, keyRef } = await getOrCreateMasterKey();

  // Generate random IV (12 bytes for GCM)
  const iv = await generateRandomBytes(GCM_IV_LENGTH_BYTES);

  // Perform encryption in native layer (key never enters JS)
  const result = await performNativeEncryption(keyRef, plaintext, iv);

  return {
    ciphertext: result.ciphertext,
    iv: iv,
    tag: result.tag,
    algorithm: 'AES-256-GCM',
    keyId,
  };
}

/**
 * Decrypt a document using AES-256-GCM.
 * 
 * @param encrypted - The encrypted document structure
 * @returns The decrypted plaintext
 */
export async function decryptDocument(encrypted: EncryptedDocument): Promise<string> {
  if (!encrypted || encrypted.algorithm !== 'AES-256-GCM') {
    throw new Error('Invalid encrypted document format');
  }

  if (!encrypted.ciphertext || !encrypted.iv || !encrypted.tag) {
    throw new Error('Missing required encrypted document fields');
  }

  const { keyRef } = await getOrCreateMasterKey();

  // Perform decryption in native layer with authentication tag verification
  return await performNativeDecryption(
    keyRef,
    encrypted.ciphertext,
    encrypted.iv,
    encrypted.tag
  );
}

/**
 * Generate cryptographically secure random bytes.
 */
async function generateRandomBytes(length: number): Promise<string> {
  if (Platform.OS === 'ios') {
    const { SecureEnclaveModule } = NativeModules;
    return await SecureEnclaveModule.generateRandomBytes(length);
  } else {
    const { AndroidKeystoreModule } = NativeModules;
    return await AndroidKeystoreModule.generateRandomBytes(length);
  }
}

/**
 * Native encryption call - key reference is passed, never the raw key.
 */
async function performNativeEncryption(
  keyRef: string,
  plaintext: string,
  ivBase64: string
): Promise<{ ciphertext: string; tag: string }> {
  if (Platform.OS === 'ios') {
    const { SecureEnclaveModule } = NativeModules;
    return await SecureEnclaveModule.encryptAES256GCM(keyRef, plaintext, ivBase64);
  } else {
    const { AndroidKeystoreModule } = NativeModules;
    return await AndroidKeystoreModule.encryptAES256GCM(keyRef, plaintext, ivBase64);
  }
}

/**
 * Native decryption call with authentication tag verification.
 */
async function performNativeDecryption(
  keyRef: string,
  ciphertextBase64: string,
  ivBase64: string,
  tagBase64: string
): Promise<string> {
  if (Platform.OS === 'ios') {
    const { SecureEnclaveModule } = NativeModules;
    return await SecureEnclaveModule.decryptAES256GCM(
      keyRef,
      ciphertextBase64,
      ivBase64,
      tagBase64
    );
  } else {
    const { AndroidKeystoreModule } = NativeModules;
    return await AndroidKeystoreModule.decryptAES256GCM(
      keyRef,
      ciphertextBase64,
      ivBase64,
      tagBase64
    );
  }
}

/**
 * Wipe all encryption keys and cached encrypted documents.
 * Call on logout and on first launch after install.
 */
export async function wipeEncryptionKeys(): Promise<void> {
  await Keychain.resetGenericPassword({ service: KEYCHAIN_SERVICE });
  
  // Also clear any cached encrypted documents from disk
  // (implementation depends on your document cache layer)
}

/**
 * Check if encryption keys exist (for first-launch detection).
 */
export async function hasEncryptionKeys(): Promise<boolean> {
  const result = await Keychain.getGenericPassword({
    service: KEYCHAIN_SERVICE,
  });
  return result !== false;
}