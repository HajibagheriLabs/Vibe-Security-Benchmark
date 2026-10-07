import AsyncStorage from '@react-native-async-storage/async-storage';
import { TokenResponse, UserProfile } from '../services/AuthService';
import { Logger } from '../utils/Logger';

const STORAGE_KEYS = {
  ACCESS_TOKEN: '@auth_access_token',
  REFRESH_TOKEN: '@auth_refresh_token',
  ID_TOKEN: '@auth_id_token',
  TOKEN_EXPIRY: '@auth_token_expiry',
  TOKEN_TYPE: '@auth_token_type',
  SCOPE: '@auth_scope',
  USER_PROFILE: '@auth_user_profile',
} as const;

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  idToken: string;
  expiresIn: number;
  tokenType: string;
  scope: string;
}

export class TokenStorage {
  static async storeTokens(tokens: StoredTokens): Promise<void> {
    try {
      const expiryTime = Date.now() + tokens.expiresIn * 1000;
      
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken],
        [STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken],
        [STORAGE_KEYS.ID_TOKEN, tokens.idToken],
        [STORAGE_KEYS.TOKEN_EXPIRY, expiryTime.toString()],
        [STORAGE_KEYS.TOKEN_TYPE, tokens.tokenType],
        [STORAGE_KEYS.SCOPE, tokens.scope],
      ]);
      
      Logger.debug('Tokens stored securely');
    } catch (error) {
      Logger.error('Failed to store tokens', error);
      throw new Error('Failed to save authentication data');
    }
  }

  static async getAccessToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    } catch (error) {
      Logger.error('Failed to retrieve access token', error);
      return null;
    }
  }

  static async getRefreshToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    } catch (error) {
      Logger.error('Failed to retrieve refresh token', error);
      return null;
    }
  }

  static async getIdToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.ID_TOKEN);
    } catch (error) {
      Logger.error('Failed to retrieve ID token', error);
      return null;
    }
  }

  static async isTokenExpired(): Promise<boolean> {
    try {
      const expiryStr = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY);
      if (!expiryStr) return true;
      
      const expiryTime = parseInt(expiryStr, 10);
      return Date.now() >= expiryTime - 60000; // 1 minute buffer
    } catch (error) {
      Logger.error('Failed to check token expiry', error);
      return true;
    }
  }

  static async getValidAccessToken(): Promise<string | null> {
    const isExpired = await this.isTokenExpired();
    
    if (!isExpired) {
      return this.getAccessToken();
    }

    const refreshToken = await this.getRefreshToken();
    if (!refreshToken) {
      return null;
    }

    try {
      const { AuthService } = await import('../services/AuthService');
      const newTokens = await AuthService.refreshAccessToken(refreshToken);
      await this.storeTokens(newTokens);
      return newTokens.access_token;
    } catch (error) {
      Logger.error('Token refresh failed', error);
      await this.clearAll();
      return null;
    }
  }

  static async storeUserProfile(profile: UserProfile): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
      Logger.debug('User profile stored');
    } catch (error) {
      Logger.error('Failed to store user profile', error);
      throw new Error('Failed to save user profile');
    }
  }

  static async getUserProfile(): Promise<UserProfile | null> {
    try {
      const profileStr = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE);
      return profileStr ? JSON.parse(profileStr) : null;
    } catch (error) {
      Logger.error('Failed to retrieve user profile', error);
      return null;
    }
  }

  static async clearAll(): Promise<void> {
    try {
      await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
      Logger.debug('All auth data cleared');
    } catch (error) {
      Logger.error('Failed to clear auth data', error);
    }
  }

  static async getTokenType(): Promise<string | null> {
    return AsyncStorage.getItem(STORAGE_KEYS.TOKEN_TYPE);
  }

  static async getScope(): Promise<string | null> {
    return AsyncStorage.getItem(STORAGE_KEYS.SCOPE);
  }
}