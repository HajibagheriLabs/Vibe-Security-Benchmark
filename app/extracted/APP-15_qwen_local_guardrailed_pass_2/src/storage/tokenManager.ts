import * as Keychain from 'react-native-keychain';

// Rule §1: Sensitive persistence uses only react-native-keychain.
// Rule §1: Device-only accessibility.
const ACCESSIBLE = Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY;

export async function getSecureToken(): Promise<string | null> {
  try {
    const credentials = await Keychain.getGenericPassword({
      accessible: ACCESSIBLE,
    });
    if (credentials) {
      return credentials.password;
    }
    return null;
  } catch {
    return null;
  }
}

export async function saveToken(token: string): Promise<void> {
  await Keychain.setGenericPassword('auth_token', token, {
    accessible: ACCESSIBLE,
  });
}

export async function clearToken(): Promise<void> {
  await Keychain.resetGenericPassword();
}