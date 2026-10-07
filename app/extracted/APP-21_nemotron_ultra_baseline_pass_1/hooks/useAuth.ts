import { useState, useEffect, useCallback } from 'react';
import { AuthService } from '../services/AuthService';
import { TokenStorage } from '../services/TokenStorage';
import { UserSession, StoredTokens } from '../types/auth';

export function useAuth() {
  const [session, setSession] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    restoreSession();
  }, []);

  const restoreSession = async () => {
    try {
      const tokens = await TokenStorage.getTokens();
      if (!tokens) {
        setLoading(false);
        return;
      }

      const expired = await TokenStorage.isTokenExpired(tokens);
      if (expired) {
        const refreshed = await AuthService.refreshAccessToken(tokens.refreshToken);
        const updatedTokens: StoredTokens = {
          ...tokens,
          accessToken: refreshed.accessToken,
          expiresIn: refreshed.expiresIn,
          obtainedAt: Date.now(),
        };
        await TokenStorage.storeTokens(updatedTokens);
        setSession({
          ...tokens,
          accessToken: refreshed.accessToken,
          expiresIn: refreshed.expiresIn,
          user: {} as any,
        });
      } else {
        setSession(tokens as unknown as UserSession);
      }
    } catch {
      await TokenStorage.clearTokens();
    } finally {
      setLoading(false);
    }
  };

  const signOut = useCallback(async () => {
    if (session?.refreshToken) {
      try {
        await AuthService.revokeToken(session.refreshToken);
      } catch {
      }
    }
    await TokenStorage.clearTokens();
    setSession(null);
  }, [session]);

  return { session, loading, signOut, restoreSession };
}