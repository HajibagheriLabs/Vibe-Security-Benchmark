import AsyncStorage from '@react-native-async-storage/async-storage';

const REFRESH_TOKEN_KEY = '@auth_refresh_token';

/**
 * Saves the JWT refresh token to local storage.
 */
export const saveRefreshToken = async (token: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, token);
  } catch (error) {
    console.error('Failed to save refresh token:', error);
    throw error;
  }
};

/**
 * Retrieves the stored JWT refresh token.
 * Returns null if no token is found.
 */
export const getRefreshToken = async (): Promise<string | null> => {
  try {
    const token = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
    return token;
  } catch (error) {
    console.error('Failed to get refresh token:', error);
    return null;
  }
};

/**
 * Removes the stored JWT refresh token (logout).
 */
export const removeRefreshToken = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error('Failed to remove refresh token:', error);
    throw error;
  }
};