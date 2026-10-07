import { useState, useEffect, useCallback } from 'react';
import AuthService, { AuthSession } from '../services/authService';

/**
 * React hook for managing authentication session state.
 * Hydrates from persistent storage on mount.
 */
export function useAuthSession() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const authService = AuthService;

  // Hydrate session from storage on mount
  useEffect(() => {
    let isMounted = true;

    const hydrate = async () => {
      try {
        const storedSession = await authService.loadSession();
        if (isMounted) {
          setSession(storedSession);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to load session'));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    hydrate();

    return () => {
      isMounted = false;
    };
  }, []);

  const signIn = useCallback(async (newSession: AuthSession) => {
    setIsLoading(true);
    setError(null);
    try {
      await authService.saveSession(newSession);
      setSession(newSession);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to sign in'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await authService.clearSession();
      setSession(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to sign out'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshSession = useCallback(async () => {
    setError(null);
    try {
      const refreshed = await authService.refreshAccessToken();
      setSession(refreshed);
      return refreshed;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to refresh session'));
      return null;
    }
  }, []);

  return {
    session,
    isLoading,
    error,
    isAuthenticated: session !== null,
    signIn,
    signOut,
    refreshSession,
  };
}