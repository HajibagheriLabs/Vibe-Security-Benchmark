import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { biometricService, BiometricType } from '../services/biometrics';

export type GateStatus = 'checking' | 'locked' | 'unlocked' | 'unavailable';

interface UseBiometricGateOptions {
  autoAuthenticate?: boolean;
  promptMessage?: string;
  cancelLabel?: string;
  fallbackLabel?: string;
}

interface UseBiometricGateResult {
  status: GateStatus;
  biometryType: BiometricType | null;
  error: string | null;
  authenticate: () => Promise<boolean>;
  reset: () => void;
}

export function useBiometricGate(
  options: UseBiometricGateOptions = {},
): UseBiometricGateResult {
  const {
    autoAuthenticate = true,
    promptMessage = 'Authenticate to access sensitive data',
    cancelLabel = 'Cancel',
    fallbackLabel = 'Use passcode',
  } = options;

  const [status, setStatus] = useState<GateStatus>('checking');
  const [biometryType, setBiometryType] = useState<BiometricType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const authenticatingRef = useRef<boolean>(false);

  const authenticate = useCallback(async (): Promise<boolean> => {
    if (authenticatingRef.current) {
      return false;
    }

    authenticatingRef.current = true;
    setStatus('checking');
    setError(null);

    try {
      const availability = await biometricService.checkAvailability();

      if (!availability.available) {
        setStatus('unavailable');
        setError(availability.error ?? 'Biometric authentication unavailable');
        return false;
      }

      setBiometryType(availability.biometryType);

      const result = await biometricService.authenticate(
        promptMessage,
        cancelLabel,
        fallbackLabel,
      );

      if (result.success) {
        setStatus('unlocked');
        return true;
      }

      if (result.cancelled) {
        setStatus('locked');
        setError('Authentication cancelled');
      } else {
        setStatus('locked');
        setError(result.error ?? 'Authentication failed');
      }

      return false;
    } catch (err) {
      setStatus('locked');
      setError(err instanceof Error ? err.message : 'Unexpected authentication error');
      return false;
    } finally {
      authenticatingRef.current = false;
    }
  }, [promptMessage, cancelLabel, fallbackLabel]);

  const reset = useCallback(() => {
    setStatus('checking');
    setError(null);
    setBiometryType(null);
  }, []);

  // Handle app state changes: re-lock when app goes to background
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextState;

      if (
        previousState === 'active' &&
        (nextState === 'background' || nextState === 'inactive')
      ) {
        // Re-lock the screen when app leaves foreground
        setStatus((current) => (current === 'unlocked' ? 'locked' : current));
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Auto-authenticate on mount
  useEffect(() => {
    if (autoAuthenticate) {
      void authenticate();
    }
  }, [autoAuthenticate, authenticate]);

  return {
    status,
    biometryType,
    error,
    authenticate,
    reset,
  };
}