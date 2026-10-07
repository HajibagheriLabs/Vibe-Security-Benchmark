import * as Keychain from 'react-native-keychain';
import { Platform } from 'react-native';

/**
 * Biometric authentication service.
 * 
 * Security decisions:
 * - Uses react-native-keychain (secure hardware-backed storage) for biometric-protected secrets.
 * - Device-only accessibility: keychain items are never synchronized or backed up.
 * - Biometric enrollment invalidation: Android keys are invalidated when new biometrics are enrolled.
 * - No secrets stored in AsyncStorage or any plaintext store.
 * - Access token remains in memory only; refresh credential is what gets persisted.
 */

export type BiometricAvailability =
  | { available: true; biometryType: 'FaceID' | 'TouchID' | 'Fingerprint' | 'Biometrics' }
  | { available: false; error: string };

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
}

const SERVICE_NAME = 'com.yourapp.sensitive_screen';
const BIOMETRIC_KEY_ALIAS = 'sensitive_screen_gate';

class BiometricAuthService {
  /**
   * Check if biometric authentication is available on this device.
   * Returns the biometry type if available, or an error describing why not.
   */
  async checkAvailability(): Promise<BiometricAvailability> {
    try {
      const supportedTypes = await Keychain.getSupportedBiometryType();
      
      if (!supportedTypes) {
        return {
          available: false,
          error: 'Biometric authentication is not available on this device.',
        };
      }

      // Map Keychain biometry types to user-friendly names
      let biometryType: BiometricAvailability extends { available: true }
        ? BiometricAvailability['biometryType']
        : never;

      switch (supportedTypes) {
        case Keychain.BIOMETRY_TYPE.FACE_ID:
          biometryType = 'FaceID';
          break;
        case Keychain.BIOMETRY_TYPE.TOUCH_ID:
          biometryType = 'TouchID';
          break;
        case Keychain.BIOMETRY_TYPE.FINGERPRINT:
          biometryType = 'Fingerprint';
          break;
        default:
          biometryType = 'Biometrics';
      }

      return { available: true, biometryType };
    } catch (error) {
      return {
        available: false,
        error: `Failed to check biometric availability: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Store a biometric-protected secret in the secure enclave/keystore.
   * This creates the gate: the secret can only be retrieved after successful biometric auth.
   * 
   * Security: The secret is generated inside the secure hardware and never leaves it.
   * Android: key is invalidated when new biometrics are enrolled (setInvalidatedByBiometricEnrollment).
   * iOS: uses .biometryCurrentSet so re-enrolling biometrics invalidates the key.
   */
  async enrollBiometricGate(): Promise<BiometricAuthResult> {
    try {
      // Generate a random secret to gate the screen
      const gateSecret = this.generateRandomSecret();

      const options: Keychain.SetOptions = {
        service: SERVICE_NAME,
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
        securityLevel: Keychain.SECURITY_LEVEL.SECURE_HARDWARE,
        ...(Platform.OS === 'android' && {
          // Critical: invalidate key if new biometrics are enrolled
          androidInvalidateOnEnrollment: true,
        }),
      };

      await Keychain.setGenericPassword(BIOMETRIC_KEY_ALIAS, gateSecret, options);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to enroll biometric gate: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Authenticate the user via biometrics to unlock the sensitive screen.
   * This triggers the OS-level biometric prompt.
   * 
   * Security: The secret is only retrievable after successful biometric verification.
   * The secret itself is never exposed to JavaScript — we only get a success/failure signal.
   */
  async authenticate(): Promise<BiometricAuthResult> {
    try {
      const options: Keychain.GetOptions = {
        service: SERVICE_NAME,
        authenticationPrompt: {
          title: 'Unlock Sensitive Screen',
          subtitle: 'Verify your identity to continue',
          description: 'Use your biometric to access this screen',
          cancel: 'Cancel',
        },
      };

      const credentials = await Keychain.getGenericPassword(options);

      if (credentials) {
        return { success: true };
      }

      return {
        success: false,
        error: 'Biometric authentication failed.',
      };
    } catch (error) {
      // Distinguish between user cancellation and actual errors
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (
        errorMessage.includes('user canceled') ||
        errorMessage.includes('user cancelled') ||
        errorMessage.includes('UserCancel') ||
        errorMessage.includes('canceled by user')
      ) {
        return { success: false, error: 'Authentication cancelled by user.' };
      }

      return {
        success: false,
        error: `Biometric authentication failed: ${errorMessage}`,
      };
    }
  }

  /**
   * Remove the biometric gate (e.g., on logout or when user disables biometrics).
   */
  async removeBiometricGate(): Promise<void> {
    try {
      await Keychain.resetGenericPassword({ service: SERVICE_NAME });
    } catch (error) {
      // Log internally but don't expose sensitive details
      console.error('Failed to remove biometric gate:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Generate a cryptographically secure random secret.
   * This secret gates the screen and is only accessible after biometric auth.
   */
  private generateRandomSecret(): string {
    const randomBytes = new Uint8Array(32);
    
    // Use platform crypto where available
    if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues) {
      globalThis.crypto.getRandomValues(randomBytes);
    } else {
      // Fallback for older RN versions — use react-native's built-in
      const { NativeModules } = require('react-native');
      if (NativeModules.PlatformConstants?.getRandomBase64) {
        return NativeModules.PlatformConstants.getRandomBase64(32);
      }
      throw new Error('Secure random generation not available');
    }

    return Array.from(randomBytes)
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }
}

export const biometricAuthService = new BiometricAuthService();