import * as SecureStore from 'expo-secure-store';

const BIOMETRIC_CREDENTIAL_KEY = 'biometric_credential_v1';
const BIOMETRIC_ENABLED_KEY = 'biometric_enabled_v1';

export async function storeBiometricCredential(credential: string): Promise<void> {
  await SecureStore.setItemAsync(BIOMETRIC_CREDENTIAL_KEY, credential, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    requireAuthentication: true,
    authenticationPrompt: 'Authenticate to access your secure credentials',
  });
}

export async function getBiometricCredential(): Promise<string | null> {
  return await SecureStore.getItemAsync(BIOMETRIC_CREDENTIAL_KEY, {
    requireAuthentication: true,
    authenticationPrompt: 'Authenticate to access your secure credentials',
  });
}

export async function deleteBiometricCredential(): Promise<void> {
  await SecureStore.deleteItemAsync(BIOMETRIC_CREDENTIAL_KEY);
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, String(enabled));
}

export async function isBiometricEnabled(): Promise<boolean> {
  const value = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
  return value === 'true';
}

export async function clearAllBiometricData(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(BIOMETRIC_CREDENTIAL_KEY),
    SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY),
  ]);
}