import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Retrieves a value from AsyncStorage with type safety.
 */
export async function getItem<T>(key: string): Promise<T | null> {
  try {
    const value = await AsyncStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch (error) {
    console.error(`[storage] Error getting item ${key}:`, error);
    return null;
  }
}

/**
 * Stores a value in AsyncStorage with type safety.
 */
export async function setItem<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`[storage] Error setting item ${key}:`, error);
    throw error;
  }
}

/**
 * Removes a value from AsyncStorage.
 */
export async function removeItem(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error(`[storage] Error removing item ${key}:`, error);
  }
}