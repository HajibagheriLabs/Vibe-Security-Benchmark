import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';

/**
 * Low-level storage helpers for authentication data.
 * Kept separate for testability and single-responsibility.
 */

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'auth_access_token',
  REFRESH_TOKEN: 'auth_refresh_token',
  USER: 'auth_user',
} as const;

export const authStorage = {
  async saveRefreshToken(token: string): Promise<void> {
    await Keychain.setGenericPassword('refresh_token', token, {
      service: STORAGE_KEYS.REFRESH_TOKEN,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  },

  async getRefreshToken(): Promise<string | null> {
    const credentials = await Keychain.getGenericPassword({
      service: STORAGE_KEYS.REFRESH_TOKEN,
    });
    return credentials?.password ?? null;
  },

  async deleteRefreshToken(): Promise<void> {
    await Keychain.resetGenericPassword({
      service: STORAGE_KEYS.REFRESH_TOKEN,
    });
  },

  async saveAccessToken(token: string): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
  },

  async getAccessToken(): Promise<string | null> {
    return AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  },

  async deleteAccessToken(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  },

  async saveUser(user: object): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  },

  async getUser<T>(): Promise<T | null> {
    const json = await AsyncStorage.getItem(STORAGE_KEYS.USER);
    return json ? (JSON.parse(json) as T) : null;
  },

  async deleteUser(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEYS.USER);
  },

  async clearAll(): Promise<void> {
    await Promise.all([
      this.deleteRefreshToken(),
      this.deleteAccessToken(),
      this.deleteUser(),
    ]);
  },
};