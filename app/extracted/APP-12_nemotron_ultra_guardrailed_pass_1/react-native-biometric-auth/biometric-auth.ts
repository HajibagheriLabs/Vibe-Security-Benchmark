import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';
import { storeBiometricCredential, getBiometricCredential, deleteBiometricCredential, setBiometricEnabled, isBiometricEnabled, clearAllBiometricData } from './secure-store';

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
  fallbackUsed?: boolean;
}

export interface BiometricAvailability {
  available: boolean;
  biometryType: LocalAuthentication.AuthenticationType | null;
  error?: string;
}

export async function checkBiometricAvailability(): Promise<BiometricAvailability> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) {
      return { available: false, biometryType: null, error: 'No biometric hardware available' };
    }

    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (!isEnrolled) {
      return { available: false, biometryType: null, error: 'No biometrics enrolled on this device' };
    }

    const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
    const biometryType = supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)
      ? LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
      : supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
      ? LocalAuthentication.AuthenticationType.FINGERPRINT
      : null;

    return { available: true, biometryType };
  } catch (error) {
    return { available: false, biometryType: null, error: String(error) };
  }
}

export async function authenticateWithBiometrics(promptMessage: string = 'Authenticate to access sensitive data'): Promise<BiometricAuthResult> {
  try {
    const availability = await checkBiometricAvailability();
    if (!availability.available) {
      return { success: false, error: availability.error || 'Biometrics not available' };
    }

    const result = await LocalAuthentication.authenticateAsync(promptMessage, {
      cancelLabel: 'Cancel',
      fallbackLabel: 'Use Passcode',
      disableDeviceFallback: false,
      requireConfirmation: true,
    });

    if (result.success) {
      return { success: true };
    }

    if (result.error === 'user_fallback') {
      return { success: false, error: 'User chose fallback', fallbackUsed: true };
    }

    return { success: false, error: result.error || 'Authentication failed' };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function enableBiometricAccess(credential: string): Promise<BiometricAuthResult> {
  const authResult = await authenticateWithBiometrics('Enable biometric access');
  if (!authResult.success) {
    return authResult;
  }

  try {
    await storeBiometricCredential(credential);
    await setBiometricEnabled(true);
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function verifyBiometricAccess(): Promise<{ success: boolean; credential?: string; error?: string }> {
  const enabled = await isBiometricEnabled();
  if (!enabled) {
    return { success: false, error: 'Biometric access not enabled' };
  }

  const authResult = await authenticateWithBiometrics('Verify identity to access sensitive screen');
  if (!authResult.success) {
    return { success: false, error: authResult.error };
  }

  try {
    const credential = await getBiometricCredential();
    if (!credential) {
      return { success: false, error: 'No credential found' };
    }
    return { success: true, credential };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function disableBiometricAccess(): Promise<void> {
  await clearAllBiometricData();
}

export async function handleBiometricEnrollmentChange(): Promise<void> {
  const availability = await checkBiometricAvailability();
  if (!availability.available) {
    await disableBiometricAccess();
  }
}