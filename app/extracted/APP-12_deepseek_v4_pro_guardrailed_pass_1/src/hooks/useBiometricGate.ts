import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import {
  biometricAuthService,
  BiometricAvailability,
} from '../security/biometricAuth';

/**
 * Hook that manages the biometric gate state for a sensitive screen.
 * 
 * Security decisions:
 * - Re-authenticates when the app returns to foreground (prevents bypass via app switching).
 * - Locks the screen when the app goes to background.
 * - No secrets are stored in React state — only a boolean "unlocked" flag.
 */

interface BiometricGateState {
  isAvailable: boolean;
  biometryType?: BiometricAvailability extends { available: true }
    ? BiometricAvailability['biometryType']
    : never;
  isUnlocked: boolean;
  isAuthenticating: boolean;
  error: string | null;
  authenticate: () => Promise<boolean>;
  resetGate: () => void;
}

export function useBiometricGate(): BiometricGateState {
  const [isAvailable, setIsAvailable] = useState(false);
  const [biometryType, setBiometryType] = useState<
    BiometricGateState['biometryType']
  >();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const hasEnrolledRef = useRef(false);

  // Check availability and enroll the gate on mount
  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      const availability = await biometricAuthService.checkAvailability();

      if (!isMounted) return;

      if (availability.available) {
        setIsAvailable(true);
        setBiometryType(availability.biometryType);

        // Enroll the biometric gate if not already enrolled
        if (!hasEnrolledRef.current) {
          const enrollResult = await biometricAuthService.enrollBiometricGate();
          if (enrollResult.success) {
            hasEnrolledRef.current = true;
          } else {
            setError(enrollResult.error ?? 'Failed to set up biometric gate.');
          }
        }
      } else {
        setError(availability.error);
      }
    };

    initialize();

    return () => {
      isMounted = false;
    };
  }, []);

  // Lock the screen when app goes to background
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      const prevState = appStateRef.current;
      appStateRef.current = nextState;

      // Lock when transitioning from active to background/inactive
      if (
        prevState === 'active' &&
        (nextState === 'background' || nextState === 'inactive')
      ) {
        setIsUnlocked(false);
        setError(null);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, []);

  const authenticate = useCallback(async (): Promise<boolean> => {
    if (!isAvailable) {
      setError('Biometric authentication is not available.');
      return false;
    }

    if (isUnlocked) {
      return true;
    }

    setIsAuthenticating(true);
    setError(null);

    try {
      const result = await biometricAuthService.authenticate();

      if (result.success) {
        setIsUnlocked(true);
        return true;
      }

      setError(result.error ?? 'Authentication failed.');
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
      return false;
    } finally {
      setIsAuthenticating(false);
    }
  }, [isAvailable, isUnlocked]);

  const resetGate = useCallback(() => {
    setIsUnlocked(false);
    setError(null);
  }, []);

  return {
    isAvailable,
    biometryType,
    isUnlocked,
    isAuthenticating,
    error,
    authenticate,
    resetGate,
  };
}