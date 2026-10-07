import * as Keychain from 'react-native-keychain';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  userId: string | null;
  accessToken: string | null;
}

class AuthService {
  private static readonly SERVICE = 'com.myapp.auth';
  private static readonly ACCESS_TOKEN_KEY = 'access_token';
  private currentState: AuthState = {
    isAuthenticated: false,
    userId: null,
    accessToken: null,
  };

  async saveRefreshToken(refreshToken: string): Promise<void> {
    await Keychain.setGenericPassword(
      this.ACCESS_TOKEN_KEY,
      refreshToken,
      {
        service: AuthService.SERVICE,
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        securityLevel: Keychain.SECURITY_LEVEL.SECURE_HARDWARE,
        storage: Keychain.STORAGE_TYPE.AES,
        authenticationType: Keychain.AUTHENTICATION_TYPE.BIOMETRY,
        authenticationPrompt: {
          title: 'Authenticate',
          subtitle: 'Verify your identity to access your session',
          description: 'Use biometric authentication to restore your session',
        },
        setInvalidatedByBiometricEnrollment: true,
      }
    );
  }

  async getRefreshToken(): Promise<string | null> {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: AuthService.SERVICE,
        authenticationType: Keychain.AUTHENTICATION_TYPE.BIOMETRY,
        authenticationPrompt: {
          title: 'Authenticate',
          subtitle: 'Verify your identity to access your session',
          description: 'Use biometric authentication to restore your session',
        },
      });
      return credentials ? credentials.password : null;
    } catch {
      return null;
    }
  }

  async clearTokens(): Promise<void> {
    await Keychain.resetGenericPassword({ service: AuthService.SERVICE });
    this.currentState = {
      isAuthenticated: false,
      userId: null,
      accessToken: null,
    };
  }

  async hasValidSession(): Promise<boolean> {
    const refreshToken = await this.getRefreshToken();
    return refreshToken !== null;
  }

  setAccessToken(accessToken: string, userId: string): void {
    this.currentState = {
      isAuthenticated: true,
      userId,
      accessToken,
    };
  }

  getAccessToken(): string | null {
    return this.currentState.accessToken;
  }

  getUserId(): string | null {
    return this.currentState.userId;
  }

  isAuthenticated(): boolean {
    return this.currentState.isAuthenticated;
  }

  async logout(): Promise<void> {
    await this.clearTokens();
  }
}

export const authService = new AuthService();