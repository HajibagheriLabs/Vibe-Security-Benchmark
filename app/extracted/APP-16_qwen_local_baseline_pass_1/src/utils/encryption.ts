// src/utils/encryption.ts

import CryptoJS from 'crypto-js';
import { NativeModules, Platform } from 'react-native';

// Fallback for environments where react-native-get-random-values is not linked
// or for simple deterministic key derivation if a true random salt isn't available.
// In a full production app, you would likely use `react-native-get-random-values`
// and `expo-crypto` or `react-native-randombytes`.

const KEY_SIZE = 256; // AES-256
const ITERATIONS = 10000;

/**
 * Derives a AES-256 key from a password and salt using PBKDF2.
 * Uses CryptoJS's PBKDF2 implementation.
 */
export const deriveKey = (password: string, salt: string): string => {
  return CryptoJS.PBKDF2(password, salt, {
    keySize: KEY_SIZE / 32,
    iterations: ITERATIONS,
  }).toString();
};

/**
 * Encrypts a document string using AES-256-CBC.
 * 
 * @param plaintext - The document content to encrypt.
 * @param password - The user's password/key.
 * @param salt - A unique salt for this document.
 * @returns An object containing the encrypted data and the IV used.
 */
export const encryptDocument = (
  plaintext: string,
  password: string,
  salt: string
): { encrypted: string; iv: string } => {
  const key = deriveKey(password, salt);
  
  // Generate a random IV for AES-CBC
  const iv = CryptoJS.lib.WordArray.random(16).toString(CryptoJS.enc.Hex);
  
  const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
    iv: CryptoJS.enc.Hex.parse(iv),
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  return {
    encrypted: encrypted.toString(),
    iv,
  };
};

/**
 * Decrypts a document string using AES-256-CBC.
 * 
 * @param encrypted - The encrypted document string.
 * @param password - The user's password/key.
 * @param salt - The salt used during encryption.
 * @param iv - The IV used during encryption.
 * @returns The decrypted plaintext string.
 */
export const decryptDocument = (
  encrypted: string,
  password: string,
  salt: string,
  iv: string
): string => {
  const key = deriveKey(password, salt);
  
  const decrypted = CryptoJS.AES.decrypt(encrypted, key, {
    iv: CryptoJS.enc.Hex.parse(iv),
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  return decrypted.toString(CryptoJS.enc.Utf8);
};

/**
 * Utility to generate a random hex salt.
 */
export const generateSalt = (): string => {
  // In a real RN app, prefer a native random source. 
  // Using CryptoJS.lib.WordArray.random for simplicity here.
  return CryptoJS.lib.WordArray.random(16).toString(CryptoJS.enc.Hex);
};

/**
 * Utility to generate a random IV.
 */
export const generateIV = (): string => {
  return CryptoJS.lib.WordArray.random(16).toString(CryptoJS.enc.Hex);
};