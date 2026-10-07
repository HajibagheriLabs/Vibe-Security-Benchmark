import AsyncStorage from '@react-native-async-storage/async-storage';
import { StoredTokens } from '../types/auth';

const TOKENS_KEY = '@auth_tokens';
const OAUTH_STATE_KEY = '@oauth_state';
const PKCE_VERIFIER_KEY = '@pkce_verifier';

export class TokenStorage {
  static async storeTokens(tokens: StoredTokens): Promise<void> {
    const data = {
      ...tokens,
      obtainedAt: Date.now(),
    };
    await AsyncStorage.setItem(TOKENS_KEY, JSON.stringify(data));
  }

  static async getTokens(): Promise<StoredTokens | null> {
    const data = await AsyncStorage.getItem(TOKENS_KEY);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  static async clearTokens(): Promise<void> {
    await AsyncStorage.multiRemove([TOKENS_KEY, OAUTH_STATE_KEY, PKCE_VERIFIER_KEY]);
  }

  static async isTokenExpired(tokens: StoredTokens): Promise<boolean> {
    const expiryTime = tokens.obtainedAt + tokens.expiresIn * 1000;
    return Date.now() >= expiryTime - 60000;
  }

  static async storeOAuthState(state: string): Promise<void> {
    await AsyncStorage.setItem(OAUTH_STATE_KEY, state);
  }

  static async getOAuthState(): Promise<string | null> {
    return AsyncStorage.getItem(OAUTH_STATE_KEY);
  }

  static async clearOAuthState(): Promise<void> {
    await AsyncStorage.removeItem(OAUTH_STATE_KEY);
  }

  static async storePKCEVerifier(verifier: string): Promise<void> {
    await AsyncStorage.setItem(PKCE_VERIFIER_KEY, verifier);
  }

  static async getPKCEVerifier(): Promise<string | null> {
    return AsyncStorage.getItem(PKCE_VERIFIER_KEY);
  }

  static async clearPKCEVerifier(): Promise<void> {
    await AsyncStorage.removeItem(PKCE_VERIFIER_KEY);
  }
}