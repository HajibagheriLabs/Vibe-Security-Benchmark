// src/security/nativeModules.ts
import { NativeModules, Platform } from 'react-native';

/**
 * Native module interface for hardware-backed crypto operations.
 * 
 * Security decisions:
 * - All crypto operations execute in native layer (Swift/Kotlin)
 * - Raw key material never crosses the JS bridge
 * - Key references are opaque handles, not the actual key
 */

export interface SecureCryptoModule {
  generateKey(keyId: string, keySizeBits: number): Promise<string>;
  generateRandomBytes(length: number): Promise<string>;
  encryptAES256GCM(keyRef: string, plaintext: string, ivBase64: string): Promise<{
    ciphertext: string;
    tag: string;
  }>;
  decryptAES256GCM(
    keyRef: string,
    ciphertextBase64: string,
    ivBase64: string,
    tagBase64: string
  ): Promise<string>;
}

export const SecureCrypto: SecureCryptoModule = Platform.select({
  ios: NativeModules.SecureEnclaveModule as SecureCryptoModule,
  android: NativeModules.AndroidKeystoreModule as SecureCryptoModule,
  default: undefined,
});

if (!SecureCrypto) {
  console.error('Secure crypto module not available on this platform');
}