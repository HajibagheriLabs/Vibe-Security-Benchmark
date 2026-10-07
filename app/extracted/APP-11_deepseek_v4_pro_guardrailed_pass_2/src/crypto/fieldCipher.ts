import 'react-native-get-random-values';
import { randomBytes, createCipheriv, createDecipheriv } from 'react-native-quick-crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH_BYTES = 12; // GCM recommended IV size
const AUTH_TAG_LENGTH_BYTES = 16;

export interface EncryptedField {
  ciphertext: Buffer;
  iv: Buffer;
  authTag: Buffer;
}

/**
 * Security decision: AES-256-GCM with random IV per encryption.
 * Never reuse an IV with the same key.
 */
export function encryptField(plaintext: string, key: Buffer): EncryptedField {
  const iv = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH_BYTES,
  });

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return { ciphertext, iv, authTag };
}

export function decryptField(encrypted: EncryptedField, key: Buffer): string {
  const decipher = createDecipheriv(ALGORITHM, key, encrypted.iv, {
    authTagLength: AUTH_TAG_LENGTH_BYTES,
  });

  decipher.setAuthTag(encrypted.authTag);

  const plaintext = Buffer.concat([
    decipher.update(encrypted.ciphertext),
    decipher.final(),
  ]);

  return plaintext.toString('utf8');
}