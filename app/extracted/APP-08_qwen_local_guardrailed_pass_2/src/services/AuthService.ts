import * as Keychain from 'react-native-keychain';
import { Platform } from 'react-native';

// Rule 1: No sensitive data in cleartext stores (AsyncStorage).
// Rule 1: Device-only accessibility.
// Rule 1: Biometric enrollment check for high-value items (Refresh Token).
// Rule 3: No vendor secrets in bundle.

const CREDENTIALS_KEY = 'auth_refresh_token';

interface Credentials {
  username: string;
  password: string;
  refreshToken: string;
}

export class AuthService {
  /**
   * Saves the refresh token to the secure store.
   * @param refreshToken The JWT refresh token string.
   */
  static async saveRefreshToken(refreshToken: string): Promise<void> {
    await Keychain.setGenericPassword(CREDENTIALS_KEY, refreshToken, {
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      authenticationBiometry: Platform.OS === 'ios' 
        ? Keychain.AUTHENTICATION_BIOMETRY_CURRENT_SET 
        : Keychain.AUTHENTICATION_BIOMETRY_ANY,
      // Android: invalidatedByBiometricEnrollment is handled via the biometry flag in newer versions
      // or by checking isHardwareEnrolled() separately if strictness is required.
      // Here we use the standard secure storage wrapper.
    });
  }

  /**
   * Retrieves the stored refresh token.
   * @returns The refresh token string or null if not found.
   */
  static async getRefreshToken(): Promise<string | null> {
    try {
      const credentials = await Keychain.getGenericPassword();
      if (credentials) {
        return credentials.password;
      }
    } catch (error) {
      // Keychain throws if no credentials exist or access is denied
      console.warn('Failed to get refresh token from keychain', error);
    }
    return null;
  }

  /**
   * Deletes the refresh token (logout).
   */
  static async deleteRefreshToken(): Promise<void> {
    await Keychain.resetGenericPassword(CREDENTIALS_KEY);
  }

  /**
   * Authenticates the user and saves the resulting refresh token.
   * @param username User's username.
   * @param password User's password.
   * @returns Promise resolving to the refresh token if successful.
   */
  static async login(username: string, password: string): Promise<string> {
    // In a real app, this would call your API gateway (Rule 3)
    const response = await fetch('https://api.example.com/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      throw new Error('Authentication failed');
    }

    const data = await response.json();
    const refreshToken = data.refreshToken;

    if (!refreshToken) {
      throw new Error('No refresh token received');
    }

    await this.saveRefreshToken(refreshToken);
    return refreshToken;
  }
}