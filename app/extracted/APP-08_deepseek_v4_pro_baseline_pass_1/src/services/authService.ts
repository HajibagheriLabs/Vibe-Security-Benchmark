import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Keychain from 'react-native-keychain';

const REFRESH_TOKEN_KEY = 'auth_refresh_token';
const ACCESS_TOKEN_KEY = 'auth_access_token';
const USER_KEY = 'auth_user';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
}

export interface AuthSession {
  tokens: AuthTokens;
  user: AuthUser;
}

class AuthService {
  private static instance: AuthService;
  private currentSession: AuthSession | null = null;
  private refreshPromise: Promise<AuthSession | null> | null = null;

  private constructor() {}

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Store tokens securely. Refresh token goes to Keychain (iOS/Android secure storage),
   * access token and user data go to AsyncStorage for fast access.
   */
  async saveSession(session: AuthSession): Promise<void> {
    this.currentSession = session;

    // Store refresh token in secure storage (Keychain)
    await Keychain.setGenericPassword(
      'refresh_token',
      session.tokens.refreshToken,
      {
        service: REFRESH_TOKEN_KEY,
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      }
    );

    // Store access token and user in AsyncStorage
    await AsyncStorage.multiSet([
      [ACCESS_TOKEN_KEY, session.tokens.accessToken],
      [USER_KEY, JSON.stringify(session.user)],
    ]);
  }

  /**
   * Load the persisted session from storage.
   * Returns null if no session exists or if refresh token is missing.
   */
  async loadSession(): Promise<AuthSession | null> {
    if (this.currentSession) {
      return this.currentSession;
    }

    try {
      // Retrieve refresh token from Keychain
      const credentials = await Keychain.getGenericPassword({
        service: REFRESH_TOKEN_KEY,
      });

      if (!credentials || !credentials.password) {
        return null;
      }

      // Retrieve access token and user from AsyncStorage
      const [accessToken, userJson] = await Promise.all([
        AsyncStorage.getItem(ACCESS_TOKEN_KEY),
        AsyncStorage.getItem(USER_KEY),
      ]);

      if (!accessToken || !userJson) {
        return null;
      }

      const user: AuthUser = JSON.parse(userJson);

      const session: AuthSession = {
        tokens: {
          accessToken,
          refreshToken: credentials.password,
        },
        user,
      };

      this.currentSession = session;
      return session;
    } catch (error) {
      console.error('[AuthService] Failed to load session:', error);
      return null;
    }
  }

  /**
   * Get the refresh token from secure storage.
   */
  async getRefreshToken(): Promise<string | null> {
    if (this.currentSession?.tokens.refreshToken) {
      return this.currentSession.tokens.refreshToken;
    }

    try {
      const credentials = await Keychain.getGenericPassword({
        service: REFRESH_TOKEN_KEY,
      });
      return credentials?.password ?? null;
    } catch (error) {
      console.error('[AuthService] Failed to get refresh token:', error);
      return null;
    }
  }

  /**
   * Get the current access token.
   */
  async getAccessToken(): Promise<string | null> {
    if (this.currentSession?.tokens.accessToken) {
      return this.currentSession.tokens.accessToken;
    }

    try {
      return await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
    } catch (error) {
      console.error('[AuthService] Failed to get access token:', error);
      return null;
    }
  }

  /**
   * Update only the access token (e.g., after a token refresh).
   */
  async updateAccessToken(newAccessToken: string): Promise<void> {
    if (this.currentSession) {
      this.currentSession.tokens.accessToken = newAccessToken;
    }

    await AsyncStorage.setItem(ACCESS_TOKEN_KEY, newAccessToken);
  }

  /**
   * Update the entire token pair (e.g., after refresh rotation).
   */
  async updateTokens(tokens: AuthTokens): Promise<void> {
    if (this.currentSession) {
      this.currentSession.tokens = tokens;
    }

    await Keychain.setGenericPassword('refresh_token', tokens.refreshToken, {
      service: REFRESH_TOKEN_KEY,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });

    await AsyncStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  }

  /**
   * Clear all stored authentication data.
   */
  async clearSession(): Promise<void> {
    this.currentSession = null;

    await Promise.all([
      Keychain.resetGenericPassword({ service: REFRESH_TOKEN_KEY }),
      AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, USER_KEY, REFRESH_TOKEN_KEY]),
    ]);
  }

  /**
   * Check if a valid session exists (refresh token present).
   */
  async hasValidSession(): Promise<boolean> {
    const refreshToken = await this.getRefreshToken();
    return refreshToken !== null && refreshToken.length > 0;
  }

  /**
   * Get the current in-memory session (synchronous).
   */
  getCurrentSession(): AuthSession | null {
    return this.currentSession;
  }

  /**
   * Set the in-memory session without persisting (useful for hydration).
   */
  setInMemorySession(session: AuthSession | null): void {
    this.currentSession = session;
  }

  /**
   * Perform a token refresh using the stored refresh token.
   * This is a placeholder — replace with your actual API call.
   */
  async refreshAccessToken(): Promise<AuthSession | null> {
    // Prevent concurrent refresh calls
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this._performRefresh();
    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async _performRefresh(): Promise<AuthSession | null> {
    const refreshToken = await this.getRefreshToken();
    if (!refreshToken) {
      return null;
    }

    try {
      // TODO: Replace with your actual API endpoint
      const response = await fetch('https://your-api.com/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        await this.clearSession();
        return null;
      }

      const data = await response.json();
      const newSession: AuthSession = {
        tokens: {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken ?? refreshToken, // Some APIs rotate refresh tokens
        },
        user: data.user ?? this.currentSession?.user,
      };

      await this.saveSession(newSession);
      return newSession;
    } catch (error) {
      console.error('[AuthService] Token refresh failed:', error);
      return null;
    }
  }
}

export default AuthService.getInstance();