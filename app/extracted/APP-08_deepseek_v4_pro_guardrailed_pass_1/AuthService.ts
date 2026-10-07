import * as Keychain from 'react-native-keychain';
import { Platform } from 'react-native';

/**
 * Authentication service for secure token management.
 * 
 * Security decisions:
 * - Refresh token persisted in react-native-keychain (hardware-backed secure storage)
 * - Access token kept in memory only
 * - Device-only accessibility (no iCloud/Google backup sync)
 * - Biometric invalidation on enrollment changes
 * - Full secure store wipe on logout
 */

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface SecureTokenStorage {
  getRefreshToken(): Promise<string | null>;
  saveRefreshToken(token: string): Promise<void>;
  clearRefreshToken(): Promise<void>;
  wipeAll(): Promise<void>;
}

class AuthService {
  private static instance: AuthService;
  private accessToken: string | null = null;
  private readonly SERVICE_NAME = 'com.example.app.auth';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';

  private constructor() {
    // Private constructor for singleton pattern
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Initialize the auth service and restore session from secure storage
   */
  async initialize(): Promise<void> {
    try {
      const refreshToken = await this.getStoredRefreshToken();
      if (refreshToken) {
        // Attempt to refresh the access token
        await this.refreshAccessToken(refreshToken);
      }
    } catch (error) {
      // If refresh fails, clear invalid tokens
      await this.logout();
      console.warn('Failed to restore session:', error);
    }
  }

  /**
   * Store tokens after successful login
   */
  async setTokens(tokens: TokenPair): Promise<void> {
    // Access token stays in memory only
    this.accessToken = tokens.accessToken;

    // Refresh token goes to secure storage
    await this.saveRefreshTokenToKeychain(tokens.refreshToken);
  }

  /**
   * Get current access token (from memory)
   */
  getAccessToken(): string | null {
    return this.accessToken;
  }

  /**
   * Refresh the access token using stored refresh token
   */
  async refreshAccessToken(refreshToken?: string): Promise<string> {
    const token = refreshToken || await this.getStoredRefreshToken();
    
    if (!token) {
      throw new Error('No refresh token available');
    }

    // TODO: Implement actual API call to refresh endpoint
    // This is a placeholder - replace with your actual refresh logic
    const response = await this.callRefreshEndpoint(token);
    
    // Update access token in memory
    this.accessToken = response.accessToken;
    
    // If a new refresh token is provided, update it
    if (response.refreshToken) {
      await this.saveRefreshTokenToKeychain(response.refreshToken);
    }

    return this.accessToken!;
  }

  /**
   * Logout - clear all tokens
   */
  async logout(): Promise<void> {
    this.accessToken = null;
    await this.wipeSecureStorage();
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.accessToken !== null;
  }

  // Private methods for secure storage operations

  private async getStoredRefreshToken(): Promise<string | null> {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: this.SERVICE_NAME,
        authenticationPrompt: {
          title: 'Authentication Required',
          subtitle: 'Unlock to restore your session',
          description: 'Your session needs to be restored securely',
        },
      });

      if (credentials) {
        return credentials.password;
      }
      return null;
    } catch (error) {
      console.error('Failed to retrieve refresh token:', error);
      return null;
    }
  }

  private async saveRefreshTokenToKeychain(token: string): Promise<void> {
    const options: Keychain.Options = {
      service: this.SERVICE_NAME,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
      securityLevel: Keychain.SECURITY_LEVEL.SECURE_HARDWARE,
    };

    // On iOS, use Secure Enclave if available
    if (Platform.OS === 'ios') {
      options.accessible = Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY;
      options.accessControl = Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET;
    }

    await Keychain.setGenericPassword('auth', token, options);
  }

  private async wipeSecureStorage(): Promise<void> {
    try {
      await Keychain.resetGenericPassword({
        service: this.SERVICE_NAME,
      });
    } catch (error) {
      console.error('Failed to wipe secure storage:', error);
      throw error;
    }
  }

  private async callRefreshEndpoint(refreshToken: string): Promise<TokenPair> {
    // TODO: Implement actual API call
    // This should call your backend refresh endpoint
    // Never store the refresh token in any other storage
    throw new Error('Refresh endpoint not implemented');
  }
}

export default AuthService.getInstance();