import * as Keychain from 'react-native-keychain';
import { Platform } from 'react-native';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface StoredCredentials {
  refreshToken: string;
  userId: string;
}

const SERVICE_NAME = 'com.myapp.auth';
const ACCESS_CONTROL = Keychain.ACCESS_CONTROL.DEVICE_PASSCODE;

export class AuthService {
  private static instance: AuthService;
  private accessToken: string | null = null;

  private constructor() {}

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async saveCredentials(credentials: StoredCredentials): Promise<void> {
    await Keychain.setGenericPassword(
      credentials.userId,
      credentials.refreshToken,
      {
        service: SERVICE_NAME,
        accessControl: ACCESS_CONTROL,
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        authenticationType: Keychain.AUTHENTICATION_TYPE.BIOMETRY,
        invalidatedByBiometricEnrollment: true,
      }
    );
  }

  async getRefreshToken(): Promise<string | null> {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: SERVICE_NAME,
        authenticationPrompt: 'Authenticate to restore your session',
      });

      if (credentials && credentials.password) {
        return credentials.password;
      }
      return null;
    } catch (error) {
      if (error instanceof Error && error.message.includes('User canceled')) {
        return null;
      }
      throw error;
    }
  }

  async clearCredentials(): Promise<void> {
    await Keychain.resetGenericPassword({ service: SERVICE_NAME });
    this.accessToken = null;
  }

  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  async hasValidSession(): Promise<boolean> {
    const refreshToken = await this.getRefreshToken();
    return refreshToken !== null;
  }
}

export const authService = AuthService.getInstance();