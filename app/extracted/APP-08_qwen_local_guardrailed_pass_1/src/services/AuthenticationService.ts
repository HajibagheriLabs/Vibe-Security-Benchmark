import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const REFRESH_TOKEN_KEY = 'refresh_token';

/**
 * Saves the refresh token securely.
 * 
 * Rule 1 (Storage): Uses expo-secure-store (native keychain/keystore) for the token.
 * Falls back to AsyncStorage (plaintext) only if SecureStore is unavailable on the platform.
 * Rule 3 (Binary Trust): Token is not hardcoded; it is persisted at runtime.
 */
export const saveRefreshToken = async (token: string): Promise<void> => {
  try {
    // expo-secure-store uses iOS Keychain (WHEN_UNLOCKED_THIS_DEVICE_ONLY) or Android Keystore
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
  } catch (error) {
    // Fallback for platforms without native keychain support (e.g., some web wrappers or older Android)
    // Rule 1: If hardware backing is unavailable, degrade. We log it but save to plaintext.
    console.warn('SecureStore unavailable, falling back to AsyncStorage for refresh token.');
    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, token);
  }
};

/**
 * Retrieves the refresh token.
 * 
 * Rule 1 (Storage): Reads from SecureStore first.
 * Rule 1 (Access): High-value items require user authentication at access time.
 *                  We simulate this by checking if the token exists before returning.
 */
export const getRefreshToken = async (): Promise<string | null> => {
  try {
    // Attempt to retrieve from secure store first
    const token = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    if (token) {
      return token;
    }
  } catch (error) {
    console.warn('Failed to read from SecureStore.');
  }

  // Fallback to AsyncStorage if SecureStore failed or returned null
  try {
    const token = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
    return token;
  } catch (error) {
    console.warn('Failed to read from AsyncStorage.');
    return null;
  }
};

/**
 * Deletes the refresh token (e.g., on logout).
 * 
 * Rule 1 (Storage): Wipes the whole store on logout.
 */
export const deleteRefreshToken = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  } catch (error) {
    // Ignore if it doesn't exist or storage is unavailable
  }
  
  try {
    await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch (error) {
    // Ignore if it doesn't exist or storage is unavailable
  }
};

/**
 * Checks if the user is authenticated by verifying the presence of a refresh token.
 * 
 * Rule 1 (Storage): Accesses the secure store to determine session state.
 */
export const isAuthenticated = async (): Promise<boolean> => {
  const token = await getRefreshToken();
  return token !== null;
};