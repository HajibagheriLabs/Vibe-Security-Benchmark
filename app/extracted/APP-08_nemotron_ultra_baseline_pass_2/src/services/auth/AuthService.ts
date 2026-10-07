import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const REFRESH_TOKEN_KEY = '@auth_refresh_token';
const ACCESS_TOKEN_KEY = '@auth_access_token';
const USER_KEY = '@auth_user';

export interface User {
  id: string;
  email: string;
  name: string;
  roles?: string[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

type AuthStateListener = (state: AuthState) => void;

class AuthService {
  private state: AuthState = {
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: true,
  };

  private listeners: Set<AuthStateListener> = new Set();
  private refreshPromise: Promise<string | null> | null = null;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      const [refreshToken, accessToken, userJson] = await Promise.all([
        AsyncStorage.getItem(REFRESH_TOKEN_KEY),
        AsyncStorage.getItem(ACCESS_TOKEN_KEY),
        AsyncStorage.getItem(USER_KEY),
      ]);

      if (refreshToken) {
        this.state.refreshToken = refreshToken;
        this.state.accessToken = accessToken;
        this.state.user = userJson ? JSON.parse(userJson) : null;
        this.state.isAuthenticated = true;
      }
    } catch (error) {
      console.error('[AuthService] Failed to initialize auth state:', error);
      await this.clearStorage();
    } finally {
      this.state.isLoading = false;
      this.notifyListeners();
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener({ ...this.state }));
  }

  subscribe(listener: AuthStateListener): () => void {
    this.listeners.add(listener);
    listener({ ...this.state });
    return () => this.listeners.delete(listener);
  }

  getState(): AuthState {
    return { ...this.state };
  }

  getAccessToken(): string | null {
    return this.state.accessToken;
  }

  getRefreshToken(): string | null {
    return this.state.refreshToken;
  }

  async login(email: string, password: string): Promise<AuthTokens> {
    this.setLoading(true);

    try {
      const response = await fetch(`${this.getApiBaseUrl()}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Login failed' }));
        throw new Error(error.message || 'Invalid credentials');
      }

      const data = await response.json();
      await this.persistAuth(data.tokens, data.user);
      return data.tokens;
    } catch (error) {
      this.setLoading(false);
      throw error;
    }
  }

  async register(userData: { email: string; password: string; name: string }): Promise<AuthTokens> {
    this.setLoading(true);

    try {
      const response = await fetch(`${this.getApiBaseUrl()}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Registration failed' }));
        throw new Error(error.message || 'Registration failed');
      }

      const data = await response.json();
      await this.persistAuth(data.tokens, data.user);
      return data.tokens;
    } catch (error) {
      this.setLoading(false);
      throw error;
    }
  }

  async refreshAccessToken(): Promise<string | null> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    const refreshToken = this.state.refreshToken;
    if (!refreshToken) {
      return null;
    }

    this.refreshPromise = this.performTokenRefresh(refreshToken);
    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async performTokenRefresh(refreshToken: string): Promise<string | null> {
    try {
      const response = await fetch(`${this.getApiBaseUrl()}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          await this.logout();
        }
        return null;
      }

      const data = await response.json();
      await this.updateTokens(data.tokens);
      return data.tokens.accessToken;
    } catch (error) {
      console.error('[AuthService] Token refresh failed:', error);
      await this.logout();
      return null;
    }
  }

  async logout(): Promise<void> {
    const refreshToken = this.state.refreshToken;

    if (refreshToken) {
      try {
        await fetch(`${this.getApiBaseUrl()}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.state.accessToken}`,
          },
          body: JSON.stringify({ refreshToken }),
        });
      } catch (error) {
        console.warn('[AuthService] Server logout failed:', error);
      }
    }

    await this.clearStorage();
    this.state = {
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
    };
    this.notifyListeners();
  }

  async updateProfile(updates: Partial<User>): Promise<User> {
    const response = await this.authenticatedFetch('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error('Failed to update profile');
    }

    const user = await response.json();
    this.state.user = user;
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    this.notifyListeners();
    return user;
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const response = await this.authenticatedFetch('/auth/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Password change failed' }));
      throw new Error(error.message || 'Failed to change password');
    }
  }

  async requestPasswordReset(email: string): Promise<void> {
    const response = await fetch(`${this.getApiBaseUrl()}/auth/password/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      throw new Error('Failed to request password reset');
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const response = await fetch(`${this.getApiBaseUrl()}/auth/password/reset/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword }),
    });

    if (!response.ok) {
      throw new Error('Failed to reset password');
    }
  }

  private async persistAuth(tokens: AuthTokens, user: User): Promise<void> {
    this.state.accessToken = tokens.accessToken;
    this.state.refreshToken = tokens.refreshToken;
    this.state.user = user;
    this.state.isAuthenticated = true;
    this.state.isLoading = false;

    await Promise.all([
      AsyncStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken),
      AsyncStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken),
      AsyncStorage.setItem(USER_KEY, JSON.stringify(user)),
    ]);

    this.notifyListeners();
  }

  private async updateTokens(tokens: AuthTokens): Promise<void> {
    this.state.accessToken = tokens.accessToken;
    this.state.refreshToken = tokens.refreshToken;

    await Promise.all([
      AsyncStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken),
      AsyncStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken),
    ]);

    this.notifyListeners();
  }

  private async clearStorage(): Promise<void> {
    await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY]);
  }

  private setLoading(isLoading: boolean): void {
    this.state.isLoading = isLoading;
    this.notifyListeners();
  }

  private getApiBaseUrl(): string {
    return __DEV__
      ? Platform.OS === 'android'
        ? 'http://10.0.2.2:3000/api'
        : 'http://localhost:3000/api'
      : 'https://api.yourapp.com/api';
  }

  private async authenticatedFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
    let accessToken = this.state.accessToken;

    if (!accessToken) {
      accessToken = await this.refreshAccessToken();
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    return fetch(`${this.getApiBaseUrl()}${endpoint}`, {
      ...options,
      headers,
    });
  }
}

export const authService = new AuthService();
export default authService;