import AsyncStorage from '@react-native-async-storage/async-storage';

const PKCE_VERIFIER_KEY = '@auth/pkce_code_verifier';

/**
 * Stores the PKCE code verifier during the authorization request.
 * This is a single-use value that must be cleared after token exchange.
 */
export async function storeCodeVerifier(verifier: string): Promise<void> {
  await AsyncStorage.setItem(PKCE_VERIFIER_KEY, verifier);
}

export async function getStoredCodeVerifier(): Promise<string | null> {
  return AsyncStorage.getItem(PKCE_VERIFIER_KEY);
}

export async function clearStoredCodeVerifier(): Promise<void> {
  await AsyncStorage.removeItem(PKCE_VERIFIER_KEY);
}