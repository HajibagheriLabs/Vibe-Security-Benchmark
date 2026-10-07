// src/services/auth/AuthService.ts
import * as Keychain from 'react-native-keychain';
import { Platform } from 'react-native';

/**
 * Authentication service managing JWT token lifecycle.
 * 
 * SECURITY DECISIONS:
 * - Refresh token persisted ONLY in react-native-keychain (hardware-backed secure storage)
 * - Access token kept in memory only, never persisted
 * - Device-only accessibility: token cannot be extracted via backup or migrated to another device
 * - Biometric enrollment invalidation: token is wiped if device biometrics change
 * - No tokens in AsyncStorage, SharedPreferences, or any cleartext store
 */

const REFRESH_TOKEN_SERVICE = 'com.yourapp.auth.refresh-token';
const REFRESH_TOKEN_ACCOUNT = 'refresh-token';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp in milliseconds
}

interface StoredRefreshToken {
  refreshToken: string;
  createdAt: number;
}

class AuthService {
  private accessToken: string | null = null;
  private accessTokenExpiry: number = 0;
  private refreshToken: string | null = null;
  private static instance: AuthService;

  private constructor() {}

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Persist refresh token to secure storage.
   * Uses biometric invalidation on Android and biometryCurrentSet on iOS.
   */
  async persistRefreshToken(refreshToken: string): Promise<void> {
    if (!refreshToken || refreshToken.length === 0) {
      throw new Error('Cannot persist empty refresh token');
    }

    const payload: StoredRefreshToken = {
      refreshToken,
      createdAt: Date.now(),
    };

    const options: Keychain.SetOptions = {
      service: REFRESH_TOKEN_SERVICE,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
      securityLevel: Keychain.SECURITY_LEVEL.SECURE_HARDWARE,
      storage: Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
    };

    // Android: invalidate on biometric enrollment change
    if (Platform.OS === 'android') {
      options.rules = Keychain.SECURITY_RULES.NONE;
      // react-native-keychain uses setInvalidatedByBiometricEnrollment via ACCESS_CONTROL
      // BIOMETRY_CURRENT_SET on Android maps to setInvalidatedByBiometricEnrollment(true)
    }

    await Keychain.setGenericPassword(
      REFRESH_TOKEN_ACCOUNT,
      JSON.stringify(payload),
      options
    );

    this.refreshToken = refreshToken;
  }

  /**
   * Load refresh token from secure storage.
   * Returns null if no token exists or biometric authentication fails.
   */
  async loadRefreshToken(): Promise<string | null> {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: REFRESH_TOKEN_SERVICE,
        authenticationPrompt: {
          title: 'Authenticate',
          subtitle: 'Unlock your session',
          description: 'Use biometrics to restore your session',
          cancel: 'Cancel',
        },
      });

      if (!credentials) {
        return null;
      }

      const payload: StoredRefreshToken = JSON.parse(credentials.password);
      
      if (!payload.refreshToken || typeof payload.refreshToken !== 'string') {
        // Corrupted data - clear it
        await this.clearRefreshToken();
        return null;
      }

      this.refreshToken = payload.refreshToken;
      return payload.refreshToken;
    } catch (error) {
      // Keychain errors (including user cancellation of biometric prompt)
      // are treated as "no token available"
      return null;
    }
  }

  /**
   * Set access token in memory only. Never persisted.
   */
  setAccessToken(accessToken: string, expiresInSeconds: number): void {
    this.accessToken = accessToken;
    this.accessTokenExpiry = Date.now() + expiresInSeconds * 1000;
  }

  /**
   * Get current access token from memory.
   * Returns null if expired or not set.
   */
  getAccessToken(): string | null {
    if (!this.accessToken || Date.now() >= this.accessTokenExpiry) {
      return null;
    }
    return this.accessToken;
  }

  /**
   * Get refresh token from memory (if loaded) or trigger secure load.
   */
  async getRefreshToken(): Promise<string | null> {
    if (this.refreshToken) {
      return this.refreshToken;
    }
    return this.loadRefreshToken();
  }

  /**
   * Clear all tokens. Called on logout and on first launch after install.
   */
  async clearAllTokens(): Promise<void> {
    this.accessToken = null;
    this.accessTokenExpiry = 0;
    this.refreshToken = null;
    await this.clearRefreshToken();
  }

  /**
   * Clear refresh token from secure storage.
   */
  async clearRefreshToken(): Promise<void> {
    try {
      await Keychain.resetGenericPassword({
        service: REFRESH_TOKEN_SERVICE,
      });
    } catch (error) {
      // Token may not exist - safe to ignore
    }
  }

  /**
   * Check if a refresh token exists in secure storage.
   * Used on app launch to determine if session can be restored.
   */
  async hasStoredSession(): Promise<boolean> {
    const token = await this.loadRefreshToken();
    return token !== null;
  }

  /**
   * Wipe session on first launch after install.
   * iOS Keychain persists across uninstalls, so we need a flag to detect fresh installs.
   * This flag is NOT sensitive data - it's just an install marker.
   */
  async handleFirstLaunchAfterInstall(): Promise<void> {
    // SECURITY: Using a non-sensitive install marker in AsyncStorage is acceptable
    // because it contains no credentials or PII - it only tracks install state.
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    
    const INSTALL_MARKER_KEY = 'app_install_marker_v1';
    
    try {
      const marker = await AsyncStorage.getItem(INSTALL_MARKER_KEY);
      
      if (!marker) {
        // First launch after install - clear any lingering Keychain data
        await this.clearAllTokens();
        await AsyncStorage.setItem(INSTALL_MARKER_KEY, 'installed');
      }
    } catch (error) {
      // If we can't verify install state, be safe and clear tokens
      await this.clearAllTokens();
    }
  }
}

export default AuthService.getInstance();
export type { TokenPair };