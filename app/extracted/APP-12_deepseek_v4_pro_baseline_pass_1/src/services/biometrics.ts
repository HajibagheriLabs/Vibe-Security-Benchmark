import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

export type BiometricType = 'fingerprint' | 'facial' | 'iris' | 'none';

export interface BiometricAvailability {
  available: boolean;
  biometryType: BiometricType;
  error?: string;
}

export interface BiometricResult {
  success: boolean;
  error?: string;
}

class BiometricService {
  private static instance: BiometricService;
  private cachedAvailability: BiometricAvailability | null = null;

  private constructor() {}

  static getInstance(): BiometricService {
    if (!BiometricService.instance) {
      BiometricService.instance = new BiometricService();
    }
    return BiometricService.instance;
  }

  async checkAvailability(): Promise<BiometricAvailability> {
    if (this.cachedAvailability) {
      return this.cachedAvailability;
    }

    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        this.cachedAvailability = {
          available: false,
          biometryType: 'none',
          error: 'No biometric hardware detected on this device.',
        };
        return this.cachedAvailability;
      }

      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!isEnrolled) {
        this.cachedAvailability = {
          available: false,
          biometryType: 'none',
          error: 'No biometric credentials enrolled. Please set up biometrics in device settings.',
        };
        return this.cachedAvailability;
      }

      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      let biometryType: BiometricType = 'none';

      if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        biometryType = 'facial';
      } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        biometryType = 'fingerprint';
      } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.IRIS)) {
        biometryType = 'iris';
      }

      this.cachedAvailability = {
        available: true,
        biometryType,
      };
      return this.cachedAvailability;
    } catch (error) {
      this.cachedAvailability = {
        available: false,
        biometryType: 'none',
        error: `Failed to check biometric availability: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
      return this.cachedAvailability;
    }
  }

  async authenticate(reason: string = 'Authenticate to access sensitive content'): Promise<BiometricResult> {
    try {
      const availability = await this.checkAvailability();
      if (!availability.available) {
        return {
          success: false,
          error: availability.error ?? 'Biometric authentication is not available.',
        };
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: reason,
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
        fallbackLabel: 'Use passcode',
        requireConfirmation: Platform.OS === 'android',
      });

      if (result.success) {
        return { success: true };
      }

      if (result.error === 'user_cancel' || result.error === 'system_cancel') {
        return { success: false, error: 'Authentication cancelled by user.' };
      }

      if (result.error === 'lockout' || result.error === 'too_many_attempts') {
        return { success: false, error: 'Too many failed attempts. Biometric authentication is locked.' };
      }

      return { success: false, error: `Authentication failed: ${result.error ?? 'Unknown error'}` };
    } catch (error) {
      return {
        success: false,
        error: `Biometric authentication error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  clearCache(): void {
    this.cachedAvailability = null;
  }
}

export const biometricService = BiometricService.getInstance();