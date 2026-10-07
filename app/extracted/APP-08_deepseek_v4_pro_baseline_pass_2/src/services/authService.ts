import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Keychain from 'react-native-keychain';

const ACCESS_TOKEN_KEY = 'auth_access_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';
const USER_KEY = 'auth_user';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
}

export interface AuthSession {
  tokens: AuthTokens;
  user: User;
}

class AuthService {
  private static instance: AuthService;
  private currentSession: AuthSession | null = null;

  private constructor() {}

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Persist the full auth session (tokens + user) to secure storage.
   * Refresh token is stored in Keychain (encrypted) on iOS/Android,
   * with AsyncStorage fallback for web or when Keychain is unavailable.
   */
  async saveSession(session: AuthSession): Promise<void> {
    this.currentSession = session;

    const { tokens, user } = session;

    // Store access token and user in AsyncStorage (fast, non-sensitive)
    await AsyncStorage.multiSet([
      [ACCESS_TOKEN_KEY, tokens.accessToken],
      [USER_KEY, JSON.stringify(user)],
    ]);

    // Store refresh token securely
    await this.saveRefreshToken(tokens.refreshToken);
  }

  /**
   * Save only the refresh token to secure storage.
   */
  async saveRefreshToken(refreshToken: string): Promise<void> {
    if (Platform.OS === 'web') {
      // Web fallback: AsyncStorage (not truly secure, but functional)
      await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      return;
    }

    try {
      await Keychain.setGenericPassword('refresh_token', refreshToken, {
        service: 'com.yourapp.auth.refresh_token',
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    } catch (error) {
      // Fallback to AsyncStorage if Keychain fails
      console.warn('Keychain storage failed, falling back to AsyncStorage', error);
      await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
  }

  /**
   * Retrieve the refresh token from secure storage.
   */
  async getRefreshToken(): Promise<string | null> {
    if (Platform.OS === 'web') {
      return AsyncStorage.getItem(REFRESH_TOKEN_KEY);
    }

    try {
      const credentials = await Keychain.getGenericPassword({
        service: 'com.yourapp.auth.refresh_token',
      });
      return credentials ? credentials.password : null;
    } catch (error) {
      console.warn('Keychain retrieval failed, trying AsyncStorage', error);
      return AsyncStorage.getItem(REFRESH_TOKEN_KEY);
    }
  }

  /**
   * Retrieve the full persisted session (tokens + user) from storage.
   * Returns null if no session exists.
   */
  async loadSession(): Promise<AuthSession | null> {
    if (this.currentSession) {
      return this.currentSession;
    }

    try {
      const [accessToken, refreshToken, userJson] = await Promise.all([
        AsyncStorage.getItem(ACCESS_TOKEN_KEY),
        this.getRefreshToken(),
        AsyncStorage.getItem(USER_KEY),
      ]);

      if (!accessToken || !refreshToken || !userJson) {
        return null;
      }

      const user: User = JSON.parse(userJson);
      const session: AuthSession = {
        tokens: { accessToken, refreshToken },
        user,
      };

      this.currentSession = session;
      return session;
    } catch (error) {
      console.error('Failed to load auth session', error);
      return null;
    }
  }

  /**
   * Update tokens after a refresh, keeping the user data intact.
   */
  async updateTokens(tokens: AuthTokens): Promise<void> {
    if (!this.currentSession) {
      throw new Error('No active session to update');
    }

    this.currentSession = {
      ...this.currentSession,
      tokens,
    };

    await AsyncStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    await this.saveRefreshToken(tokens.refreshToken);
  }

  /**
   * Clear all persisted auth data (logout).
   */
  async clearSession(): Promise<void> {
    this.currentSession = null;

    await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY]);

    if (Platform.OS !== 'web') {
      try {
        await Keychain.resetGenericPassword({
          service: 'com.yourapp.auth.refresh_token',
        });
      } catch (error) {
        console.warn('Keychain reset failed', error);
      }
    }
  }

  /**
   * Get the currently loaded session (in-memory, not from storage).
   */
  getCurrentSession(): AuthSession | null {
    return this.currentSession;
  }

  /**
   * Check if a valid session exists in storage.
   */
  async hasPersistedSession(): Promise<boolean> {
    const session = await this.loadSession();
    return session !== null;
  }
}

export default AuthService.getInstance();