import { useState, useEffect, useCallback } from 'react';
import * as Keychain from 'react-native-keychain';
import { api } from '../lib/api';

interface Tokens {
  accessToken: string;
  refreshToken: string;
}

const KEYCHAIN_SERVICE = 'com.example.app.auth';

export const useAuth = () => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTokens();
  }, []);

  const loadTokens = async () => {
    try {
      const credentials = await Keychain.getGenericPassword({ service: KEYCHAIN_SERVICE });
      if (credentials) {
        const tokens: Tokens = JSON.parse(credentials.password);
        setAccessToken(tokens.accessToken);
        scheduleRefresh(tokens.refreshToken);
      }
    } catch (e) {
      // No stored credentials
    } finally {
      setLoading(false);
    }
  };

  const scheduleRefresh = (refreshToken: string) => {
    // Proactive refresh 5 min before expiry (assuming 15 min access token lifetime)
    setTimeout(() => refreshAccessToken(refreshToken), 10 * 60 * 1000);
  };

  const refreshAccessToken = useCallback(async (refreshToken: string) => {
    try {
      const response = await api.post<Tokens>('/auth/refresh', { refreshToken });
      const { accessToken: newAccess, refreshToken: newRefresh } = response.data;
      setAccessToken(newAccess);
      await Keychain.setGenericPassword('tokens', JSON.stringify({ accessToken: newAccess, refreshToken: newRefresh }), {
        service: KEYCHAIN_SERVICE,
        accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
        authenticationType: Keychain.AUTHENTICATION_TYPE.BIOMETRY,
      });
      scheduleRefresh(newRefresh);
    } catch {
      // Refresh failed — user will need to re-login
      await Keychain.resetGenericPassword({ service: KEYCHAIN_SERVICE });
      setAccessToken(null);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const response = await api.post<Tokens>('/auth/login', { email, password });
    const { accessToken: newAccess, refreshToken: newRefresh } = response.data;
    setAccessToken(newAccess);
    await Keychain.setGenericPassword('tokens', JSON.stringify({ accessToken: newAccess, refreshToken: newRefresh }), {
      service: KEYCHAIN_SERVICE,
      accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
      authenticationType: Keychain.AUTHENTICATION_TYPE.BIOMETRY,
    });
    scheduleRefresh(newRefresh);
  };

  const logout = async () => {
    await Keychain.resetGenericPassword({ service: KEYCHAIN_SERVICE });
    setAccessToken(null);
  };

  return { accessToken, loading, login, logout };
};