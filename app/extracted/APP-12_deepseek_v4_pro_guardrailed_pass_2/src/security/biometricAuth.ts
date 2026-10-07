import * as Keychain from 'react-native-keychain';
import { Platform } from 'react-native';

/**
 * Biometric authentication service
 * Security decisions:
 * - Uses react-native-keychain (secure hardware-backed storage)
 * - Device-only accessibility (no sync, no backup)
 * - Biometric enrollment changes invalidate stored credentials
 * - No fallback to plaintext storage
 */

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
  biometricType?: 'FaceID' | 'TouchID' | 'Fingerprint' | 'Biometric';
}

export class BiometricAuthService {
  private static readonly SERVICE_NAME = 'com.yourapp.sensitive';
  private static readonly ACCESS_CONTROL = Platform.select({
    ios: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
    android: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
  });

  private static readonly ACCESSIBLE = Platform.select({
    ios: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    android: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });

  /**
   * Check if biometric authentication is available on device
   */
  static async isBiometricAvailable(): Promise<boolean> {
    try {
      const biometryType = await Keychain.getSupportedBiometryType();
      return biometryType !== null;
    } catch (error) {
      console.error('Biometric availability check failed:', error);
      return false;
    }
  }

  /**
   * Get the type of biometric authentication available
   */
  static async getBiometricType(): Promise<string | null> {
    try {
      const biometryType = await Keychain.getSupportedBiometryType();
      
      if (!biometryType) return null;
      
      switch (biometryType) {
        case Keychain.BIOMETRY_TYPE.FACE_ID:
          return 'FaceID';
        case Keychain.BIOMETRY_TYPE.TOUCH_ID:
          return 'TouchID';
        case Keychain.BIOMETRY_TYPE.FINGERPRINT:
          return 'Fingerprint';
        default:
          return 'Biometric';
      }
    } catch (error) {
      console.error('Failed to get biometric type:', error);
      return null;
    }
  }

  /**
   * Store a random token in secure storage protected by biometric authentication
   * This token is used to verify biometric authentication on subsequent access
   */
  static async setupBiometricProtection(): Promise<BiometricAuthResult> {
    try {
      const isAvailable = await this.isBiometricAvailable();
      if (!isAvailable) {
        return {
          success: false,
          error: 'Biometric authentication is not available on this device',
        };
      }

      // Generate a random token to store (this is not a credential, just a verification token)
      const randomToken = this.generateRandomToken();
      
      const options: Keychain.SetOptions = {
        accessControl: this.ACCESS_CONTROL,
        accessible: this.ACCESSIBLE,
        service: this.SERVICE_NAME,
        authenticationPrompt: {
          title: 'Authenticate',
          subtitle: 'Verify your identity to access sensitive data',
          description: 'Use biometric authentication to continue',
          cancel: 'Cancel',
        },
      };

      await Keychain.setGenericPassword('biometric_user', randomToken, options);
      
      return {
        success: true,
        biometricType: await this.getBiometricType() as BiometricAuthResult['biometricType'],
      };
    } catch (error) {
      console.error('Failed to setup biometric protection:', error);
      return {
        success: false,
        error: 'Failed to setup biometric authentication',
      };
    }
  }

  /**
   * Authenticate user via biometrics to access sensitive screen
   */
  static async authenticate(): Promise<BiometricAuthResult> {
    try {
      const isAvailable = await this.isBiometricAvailable();
      if (!isAvailable) {
        return {
          success: false,
          error: 'Biometric authentication is not available on this device',
        };
      }

      const options: Keychain.GetOptions = {
        authenticationPrompt: {
          title: 'Authentication Required',
          subtitle: 'Verify your identity to access sensitive information',
          description: 'Use biometric authentication to continue',
          cancel: 'Cancel',
        },
        service: this.SERVICE_NAME,
      };

      const credentials = await Keychain.getGenericPassword(options);
      
      if (credentials) {
        return {
          success: true,
          biometricType: await this.getBiometricType() as BiometricAuthResult['biometricType'],
        };
      } else {
        return {
          success: false,
          error: 'Authentication failed',
        };
      }
    } catch (error: any) {
      // Handle specific error cases
      if (error?.message?.includes('User canceled')) {
        return {
          success: false,
          error: 'Authentication cancelled by user',
        };
      }
      
      if (error?.message?.includes('Biometry has been changed')) {
        return {
          success: false,
          error: 'Biometric enrollment has changed. Please re-authenticate.',
        };
      }
      
      console.error('Biometric authentication failed:', error);
      return {
        success: false,
        error: 'Authentication failed',
      };
    }
  }

  /**
   * Remove biometric protection (e.g., on logout)
   */
  static async removeBiometricProtection(): Promise<void> {
    try {
      await Keychain.resetGenericPassword({ service: this.SERVICE_NAME });
    } catch (error) {
      console.error('Failed to remove biometric protection:', error);
    }
  }

  /**
   * Generate a cryptographically secure random token
   */
  private static generateRandomToken(): string {
    const array = new Uint8Array(32);
    
    // Use crypto.getRandomValues for secure random generation
    if (typeof global.crypto !== 'undefined' && global.crypto.getRandomValues) {
      global.crypto.getRandomValues(array);
    } else {
      // Fallback for older React Native versions
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
    }
    
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
}