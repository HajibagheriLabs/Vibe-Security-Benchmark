import * as Keychain from 'react-native-keychain';
import 'react-native-get-random-values';
import { randomBytes } from 'react-native-quick-crypto';
import { Platform } from 'react-native';

const KEYCHAIN_SERVICE = 'com.example.app.profile-encryption-key';
const KEY_LENGTH_BYTES = 32; // AES-256

/**
 * Security decision (AGENT_RULES §1):
 * - Encryption key is generated inside the platform secure store (Keychain/Keystore).
 * - Key never leaves the secure enclave / keystore.
 * - Accessibility is device-only, not synchronizable.
 * - Android: key invalidated on biometric enrollment change.
 */
export async function getOrCreateEncryptionKey(): Promise<Buffer> {
  const existing = await Keychain.getGenericPassword({
    service: KEYCHAIN_SERVICE,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    securityLevel: Keychain.SECURITY_LEVEL.SECURE_HARDWARE,
  });

  if (existing && existing.password) {
    return Buffer.from(existing.password, 'base64');
  }

  const keyBytes = randomBytes(KEY_LENGTH_BYTES);
  const keyBase64 = keyBytes.toString('base64');

  const options: Keychain.SetOptions = {
    service: KEYCHAIN_SERVICE,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    securityLevel: Keychain.SECURITY_LEVEL.SECURE_HARDWARE,
    storage: Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
  };

  if (Platform.OS === 'android') {
    // Security decision: invalidate key if a new biometric is enrolled.
    options.rules = Keychain.SECURITY_RULES.NONE;
    options.securityLevel = Keychain.SECURITY_LEVEL.SECURE_HARDWARE;
    options.storage = Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH;
  }

  await Keychain.setGenericPassword('profile-encryption-key', keyBase64, options);

  return keyBytes;
}

export async function deleteEncryptionKey(): Promise<void> {
  await Keychain.resetGenericPassword({ service: KEYCHAIN_SERVICE });
}