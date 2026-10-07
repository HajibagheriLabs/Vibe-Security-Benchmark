// src/hooks/useAuth.ts
import { useState, useEffect, useCallback } from 'react';
import { Keychain } from 'react-native-keychain'; // Secure store only (Rule 1)

export interface AuthState {
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuth = (): AuthState => {
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    // Load refresh token from secure store on startup, exchange for access token
    // Access token kept in memory only, never persisted
    const bootstrap = async () => {
      try {
        const credentials = await Keychain.getGenericPassword({ service: 'auth' });
        if (credentials) {
          // Exchange refresh token for access token via /auth/refresh
          // setAccessToken(newAccessToken);
        }
      } catch {
        // Degrade gracefully: user must log in again
      }
    };
    bootstrap();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    // POST /auth/login → receive access + refresh tokens
    // Store ONLY refresh token in Keychain with:
    //   accessControl: Keychain.ACCESS_CONTROL.DEVICE_PASSCODE
    //   authenticationType: Keychain.AUTHENTICATION_TYPE.BIOMETRY_CURRENT_SET
    //   invalidatedByBiometricEnrollment: true
    // Set access token in memory
  }, []);

  const logout = useCallback(async () => {
    await Keychain.resetGenericPassword({ service: 'auth' });
    setAccessToken(null);
  }, []);

  return { accessToken, isAuthenticated: !!accessToken, login, logout };
};