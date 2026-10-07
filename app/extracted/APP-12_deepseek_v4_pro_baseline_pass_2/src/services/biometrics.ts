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
  cancelled?: boolean;
}

class BiometricService {
  private static instance: BiometricService;

  private constructor() {}

  static getInstance(): BiometricService {
    if (!BiometricService.instance) {
      BiometricService.instance = new BiometricService();
    }
    return BiometricService.instance;
  }

  async checkAvailability(): Promise<BiometricAvailability> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        return {
          available: false,
          biometryType: 'none',
          error: 'No biometric hardware detected',
        };
      }

      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!isEnrolled) {
        return {
          available: false,
          biometryType: 'none',
          error: 'No biometrics enrolled on this device',
        };
      }

      const supportedTypes =
        await LocalAuthentication.supportedAuthenticationTypesAsync();

      let biometryType: BiometricType = 'none';
      if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        biometryType = 'facial';
      } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        biometryType = 'fingerprint';
      } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.IRIS)) {
        biometryType = 'iris';
      }

      return { available: true, biometryType };
    } catch (error) {
      return {
        available: false,
        biometryType: 'none',
        error: error instanceof Error ? error.message : 'Unknown biometric error',
      };
    }
  }

  async authenticate(
    promptMessage: string = 'Authenticate to access sensitive data',
    cancelLabel: string = 'Cancel',
    fallbackLabel: string = 'Use passcode',
  ): Promise<BiometricResult> {
    try {
      const availability = await this.checkAvailability();

      if (!availability.available) {
        return {
          success: false,
          error: availability.error ?? 'Biometric authentication unavailable',
        };
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        cancelLabel,
        fallbackLabel,
        disableDeviceFallback: false,
        requireConfirmation: Platform.OS === 'android',
      });

      if (result.success) {
        return { success: true };
      }

      if (result.error === 'user_cancel' || result.error === 'system_cancel') {
        return { success: false, cancelled: true };
      }

      return {
        success: false,
        error: result.error ?? 'Authentication failed',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication error',
      };
    }
  }
}

export const biometricService = BiometricService.getInstance();