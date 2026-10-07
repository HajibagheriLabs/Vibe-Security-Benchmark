import * as SecureStore from 'expo-secure-store';

// Rule §1: Sensitive persistence uses only expo-secure-store.
// Rule §1: Device-only accessibility is default for expo-secure-store on iOS/Android.
// Rule §1: Access tokens stay in memory. Only refresh credential is persisted.

const CREDENTIAL_KEY = '@user_auth_token';

export const saveCredential = async (token: string): Promise<void> => {
  try {
    await SecureStore.setItemAsync(CREDENTIAL_KEY, token);
  } catch (error) {
    console.error('Failed to save credential', error);
    throw new Error('Secure storage write failed');
  }
};

export const getCredential = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(CREDENTIAL_KEY);
  } catch (error) {
    console.error('Failed to get credential', error);
    return null;
  }
};

export const deleteCredential = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(CREDENTIAL_KEY);
  } catch (error) {
    console.error('Failed to delete credential', error);
  }
};