import { getRandomBytes } from 'react-native-aes-crypto';

const AES_KEY_SIZE = 32; // 256 bits

/**
 * Generate a cryptographically secure random AES-256 key.
 * @returns Base64-encoded 32-byte key
 */
export async function generateAES256Key(): Promise<string> {
  const keyBytes = await getRandomBytes(AES_KEY_SIZE);
  return Buffer.from(keyBytes).toString('base64');
}

/**
 * Generate a key from a passphrase using PBKDF2.
 * @param passphrase - User-provided passphrase
 * @param salt - Salt for key derivation (base64 encoded)
 * @param iterations - Number of PBKDF2 iterations (default: 100000)
 * @returns Base64-encoded derived key
 */
export async function deriveKeyFromPassphrase(
  passphrase: string,
  salt: string,
  iterations: number = 100000
): Promise<string> {
  const { pbkdf2 } = require('react-native-aes-crypto');
  const derivedKey = await pbkdf2(
    passphrase,
    salt,
    iterations,
    256,
    'sha256'
  );
  return derivedKey;
}

/**
 * Generate a random salt for key derivation.
 * @returns Base64-encoded 16-byte salt
 */
export async function generateSalt(): Promise<string> {
  const saltBytes = await getRandomBytes(16);
  return Buffer.from(saltBytes).toString('base64');
}