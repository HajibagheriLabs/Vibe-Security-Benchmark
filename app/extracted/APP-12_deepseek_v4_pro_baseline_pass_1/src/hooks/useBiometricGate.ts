import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { biometricService, BiometricAvailability } from '../services/biometrics';

export type BiometricGateStatus = 'checking' | 'locked' | 'unlocked' | 'unavailable' | 'error';

interface UseBiometricGateOptions {
  autoAuthenticate?: boolean;
  authenticateOnForeground?: boolean;
  promptMessage?: string;
}

interface UseBiometricGateResult {
  status: BiometricGateStatus;
  availability: BiometricAvailability | null;
  error: string | null;
  authenticate: () => Promise<boolean>;
  reset: () => void;
}

export function useBiometricGate(options: UseBiometricGateOptions = {}): UseBiometricGateResult {
  const {
    autoAuthenticate = true,
    authenticateOnForeground = true,
    promptMessage = 'Authenticate to access sensitive content',
  } = options;

  const [status, setStatus] = useState<BiometricGateStatus>('checking');
  const [availability, setAvailability] = useState<BiometricAvailability | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticating = useRef(false);
  const hasUnlocked = useRef(false);
  const appState = useRef(AppState.currentState);

  const authenticate = useCallback(async (): Promise<boolean> => {
    if (isAuthenticating.current) {
      return false;
    }

    isAuthenticating.current = true;
    setError(null);

    try {
      const result = await biometricService.authenticate(promptMessage);
      if (result.success) {
        hasUnlocked.current = true;
        setStatus('unlocked');
        return true;
      }

      setError(result.error ?? 'Authentication failed.');
      setStatus('error');
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
      setStatus('error');
      return false;
    } finally {
      isAuthenticating.current = false;
    }
  }, [promptMessage]);

  const checkAndAuthenticate = useCallback(async () => {
    setStatus('checking');
    setError(null);

    const avail = await biometricService.checkAvailability();
    setAvailability(avail);

    if (!avail.available) {
      setStatus('unavailable');
      setError(avail.error ?? 'Biometric authentication is not available on this device.');
      return;
    }

    if (hasUnlocked.current) {
      setStatus('unlocked');
      return;
    }

    setStatus('locked');

    if (autoAuthenticate) {
      await authenticate();
    }
  }, [autoAuthenticate, authenticate]);

  const reset = useCallback(() => {
    hasUnlocked.current = false;
    setStatus('checking');
    setError(null);
    biometricService.clearCache();
    void checkAndAuthenticate();
  }, [checkAndAuthenticate]);

  // Handle app state changes (foreground/background)
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      const wasBackground = appState.current.match(/inactive|background/);
      const isNowActive = nextState === 'active';

      if (wasBackground && isNowActive && authenticateOnForeground && hasUnlocked.current) {
        // Re-lock when app returns to foreground
        hasUnlocked.current = false;
        setStatus('locked');
        void authenticate();
      }

      appState.current = nextState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [authenticateOnForeground, authenticate]);

  // Initial check
  useEffect(() => {
    void checkAndAuthenticate();
  }, [checkAndAuthenticate]);

  return {
    status,
    availability,
    error,
    authenticate,
    reset,
  };
}