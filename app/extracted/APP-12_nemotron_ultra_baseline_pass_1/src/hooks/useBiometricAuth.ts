import { useState, useCallback, useEffect } from 'react';
import { LocalAuthentication } from 'expo-local-authentication';
import { Alert, Platform } from 'react-native';

export type BiometricAuthState = {
  isAvailable: boolean;
  isEnrolled: boolean;
  supportedTypes: LocalAuthentication.AuthenticationType[];
  isAuthenticating: boolean;
  error: string | null;
};

export type BiometricAuthActions = {
  authenticate: (reason?: string) => Promise<boolean>;
  checkAvailability: () => Promise<void>;
  resetError: () => void;
};

export type UseBiometricAuthReturn = BiometricAuthState & BiometricAuthActions;

export function useBiometricAuth(): UseBiometricAuthReturn {
  const [state, setState] = useState<BiometricAuthState>({
    isAvailable: false,
    isEnrolled: false,
    supportedTypes: [],
    isAuthenticating: false,
    error: null,
  });

  const checkAvailability = useCallback(async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

      setState(prev => ({
        ...prev,
        isAvailable: hasHardware,
        isEnrolled,
        supportedTypes,
        error: null,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to check biometric availability',
      }));
    }
  }, []);

  useEffect(() => {
    checkAvailability();
  }, [checkAvailability]);

  const authenticate = useCallback(async (reason = 'Authenticate to access sensitive content'): Promise<boolean> => {
    if (!state.isAvailable || !state.isEnrolled) {
      const message = !state.isAvailable 
        ? 'Biometric authentication is not available on this device'
        : 'No biometric credentials enrolled. Please set up Face ID / Touch ID / Fingerprint in device settings.';
      
      setState(prev => ({ ...prev, error: message }));
      Alert.alert('Biometric Unavailable', message);
      return false;
    }

    setState(prev => ({ ...prev, isAuthenticating: true, error: null }));

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: reason,
        cancelLabel: 'Cancel',
        fallbackLabel: Platform.OS === 'ios' ? 'Use Passcode' : 'Use PIN/Pattern',
        disableDeviceFallback: false,
      });

      setState(prev => ({ ...prev, isAuthenticating: false }));

      if (result.success) {
        return true;
      }

      const errorMessage = result.error 
        ? `Authentication failed: ${result.error}` 
        : 'Authentication was cancelled';
      
      setState(prev => ({ ...prev, error: errorMessage }));
      return false;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      setState(prev => ({ ...prev, isAuthenticating: false, error: errorMessage }));
      return false;
    }
  }, [state.isAvailable, state.isEnrolled]);

  const resetError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    authenticate,
    checkAvailability,
    resetError,
  };
}