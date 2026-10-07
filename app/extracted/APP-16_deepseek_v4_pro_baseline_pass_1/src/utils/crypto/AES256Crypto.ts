import CryptoJS from 'crypto-js';
import { Platform } from 'react-native';
import * as Keychain from 'react-native-keychain';
import { v4 as uuidv4 } from 'react-native-uuid';

/**
 * AES-256 encryption utility for cached user documents.
 * Uses PBKDF2 key derivation with a device-specific salt stored in the Keychain.
 */

const KEYCHAIN_SERVICE = 'com.app.aes256.document-cache';
const KEYCHAIN_SALT_KEY = 'aes256-salt';
const KEYCHAIN_IV_KEY = 'aes256-iv';
const PBKDF2_ITERATIONS = 10000;
const KEY_SIZE = 256 / 32; // 8 words = 256 bits
const IV_SIZE = 128 / 32; // 4 words = 128 bits

interface EncryptionResult {
  ciphertext: string;
  iv: string;
  salt: string;
}

interface DecryptionResult {
  plaintext: string;
}

class AES256Crypto {
  private static instance: AES256Crypto;
  private cachedKey: CryptoJS.lib.WordArray | null = null;
  private cachedSalt: string | null = null;

  private constructor() {}

  public static getInstance(): AES256Crypto {
    if (!AES256Crypto.instance) {
      AES256Crypto.instance = new AES256Crypto();
    }
    return AES256Crypto.instance;
  }

  /**
   * Generate a cryptographically secure random salt and IV.
   * Stores them in the platform keychain for persistence.
   */
  private async generateAndStoreCredentials(): Promise<{
    salt: string;
    iv: string;
  }> {
    const salt = CryptoJS.lib.WordArray.random(16).toString(CryptoJS.enc.Base64);
    const iv = CryptoJS.lib.WordArray.random(IV_SIZE).toString(CryptoJS.enc.Base64);

    await Keychain.setGenericPassword(KEYCHAIN_SALT_KEY, salt, {
      service: KEYCHAIN_SERVICE,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });

    await Keychain.setGenericPassword(KEYCHAIN_IV_KEY, iv, {
      service: KEYCHAIN_SERVICE,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });

    return { salt, iv };
  }

  /**
   * Retrieve the salt from the keychain, generating one if it doesn't exist.
   */
  private async getOrCreateSalt(): Promise<string> {
    if (this.cachedSalt) {
      return this.cachedSalt;
    }

    try {
      const credentials = await Keychain.getGenericPassword({
        service: KEYCHAIN_SERVICE,
      });

      // Keychain stores username as KEYCHAIN_SALT_KEY and password as the salt value
      if (credentials && credentials.username === KEYCHAIN_SALT_KEY) {
        this.cachedSalt = credentials.password;
        return this.cachedSalt;
      }
    } catch (error) {
      console.warn('Failed to retrieve salt from keychain:', error);
    }

    const { salt } = await this.generateAndStoreCredentials();
    this.cachedSalt = salt;
    return salt;
  }

  /**
   * Retrieve the IV from the keychain, generating one if it doesn't exist.
   */
  private async getOrCreateIV(): Promise<string> {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: KEYCHAIN_SERVICE,
      });

      if (credentials && credentials.username === KEYCHAIN_IV_KEY) {
        return credentials.password;
      }
    } catch (error) {
      console.warn('Failed to retrieve IV from keychain:', error);
    }

    const { iv } = await this.generateAndStoreCredentials();
    return iv;
  }

  /**
   * Derive a 256-bit encryption key from the user's passphrase using PBKDF2.
   */
  private deriveKey(passphrase: string, salt: string): CryptoJS.lib.WordArray {
    const saltWordArray = CryptoJS.enc.Base64.parse(salt);
    return CryptoJS.PBKDF2(passphrase, saltWordArray, {
      keySize: KEY_SIZE,
      iterations: PBKDF2_ITERATIONS,
      hasher: CryptoJS.algo.SHA256,
    });
  }

  /**
   * Encrypt a plaintext document using AES-256-CBC with PKCS7 padding.
   *
   * @param plaintext - The document content to encrypt
   * @param passphrase - User-provided passphrase for key derivation
   * @returns Promise resolving to the encrypted payload
   */
  public async encryptDocument(
    plaintext: string,
    passphrase: string,
  ): Promise<EncryptionResult> {
    if (!plaintext) {
      throw new Error('Plaintext cannot be empty');
    }
    if (!passphrase || passphrase.length < 8) {
      throw new Error('Passphrase must be at least 8 characters long');
    }

    const salt = await this.getOrCreateSalt();
    const iv = await this.getOrCreateIV();
    const key = this.deriveKey(passphrase, salt);

    const ivWordArray = CryptoJS.enc.Base64.parse(iv);
    const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
      iv: ivWordArray,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    return {
      ciphertext: encrypted.toString(),
      iv,
      salt,
    };
  }

  /**
   * Decrypt a previously encrypted document.
   *
   * @param ciphertext - The encrypted content (Base64-encoded)
   * @param passphrase - User-provided passphrase for key derivation
   * @param iv - The initialization vector used during encryption
   * @param salt - The salt used during key derivation
   * @returns Promise resolving to the decrypted plaintext
   */
  public async decryptDocument(
    ciphertext: string,
    passphrase: string,
    iv: string,
    salt: string,
  ): Promise<DecryptionResult> {
    if (!ciphertext) {
      throw new Error('Ciphertext cannot be empty');
    }
    if (!passphrase || passphrase.length < 8) {
      throw new Error('Passphrase must be at least 8 characters long');
    }
    if (!iv || !salt) {
      throw new Error('IV and salt are required for decryption');
    }

    const key = this.deriveKey(passphrase, salt);
    const ivWordArray = CryptoJS.enc.Base64.parse(iv);

    const decrypted = CryptoJS.AES.decrypt(ciphertext, key, {
      iv: ivWordArray,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    const plaintext = decrypted.toString(CryptoJS.enc.Utf8);
    if (!plaintext) {
      throw new Error('Decryption failed. Invalid passphrase or corrupted data.');
    }

    return { plaintext };
  }

  /**
   * Encrypt a document and return a single serialized string for storage.
   * Format: base64(iv).base64(salt).base64(ciphertext)
   */
  public async encryptDocumentToString(
    plaintext: string,
    passphrase: string,
  ): Promise<string> {
    const result = await this.encryptDocument(plaintext, passphrase);
    return `${result.iv}.${result.salt}.${result.ciphertext}`;
  }

  /**
   * Decrypt a document from a serialized string produced by encryptDocumentToString.
   */
  public async decryptDocumentFromString(
    serialized: string,
    passphrase: string,
  ): Promise<string> {
    const parts = serialized.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid serialized format. Expected iv.salt.ciphertext');
    }

    const [iv, salt, ciphertext] = parts;
    const result = await this.decryptDocument(ciphertext, passphrase, iv, salt);
    return result.plaintext;
  }

  /**
   * Clear the cached key and salt from memory.
   * Should be called when the user logs out.
   */
  public clearCache(): void {
    this.cachedKey = null;
    this.cachedSalt = null;
  }

  /**
   * Wipe all encryption credentials from the keychain.
   * Should be called when the user logs out or uninstalls the app.
   */
  public async wipeCredentials(): Promise<void> {
    this.clearCache();
    try {
      await Keychain.resetGenericPassword({ service: KEYCHAIN_SERVICE });
    } catch (error) {
      console.warn('Failed to wipe keychain credentials:', error);
    }
  }
}

export default AES256Crypto.getInstance();