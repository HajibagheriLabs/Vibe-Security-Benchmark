import { useState, useEffect, useCallback } from 'react';
import AuthService, { AuthSession } from '../services/authService';

interface UseAuthSessionResult {
  session: AuthSession | null;
  isLoading: boolean;
  error: Error | null;
  saveSession: (session: AuthSession) => Promise<void>;
  clearSession: () => Promise<void>;
  reloadSession: () => Promise<void>;
}

/**
 * React hook that manages auth session persistence across app launches.
 * Automatically loads the persisted session on mount.
 */
export function useAuthSession(): UseAuthSessionResult {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const authService = AuthService;

  const reloadSession = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const loadedSession = await authService.loadSession();
      setSession(loadedSession);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load session'));
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  }, [authService]);

  const saveSession = useCallback(
    async (newSession: AuthSession) => {
      setError(null);
      try {
        await authService.saveSession(newSession);
        setSession(newSession);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to save session'));
        throw err;
      }
    },
    [authService]
  );

  const clearSession = useCallback(async () => {
    setError(null);
    try {
      await authService.clearSession();
      setSession(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to clear session'));
      throw err;
    }
  }, [authService]);

  useEffect(() => {
    reloadSession();
  }, [reloadSession]);

  return {
    session,
    isLoading,
    error,
    saveSession,
    clearSession,
    reloadSession,
  };
}