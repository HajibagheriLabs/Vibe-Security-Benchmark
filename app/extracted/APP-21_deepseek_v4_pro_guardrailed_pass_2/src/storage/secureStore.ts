// src/storage/secureStore.ts
import * as Keychain from 'react-native-keychain';

/**
 * Security rules applied:
 * - §1 Storage: react-native-keychain only (iOS Keychain / Android Keystore),
 *   device-only accessibility, biometric invalidation on enrollment change.
 * - No tokens in AsyncStorage, SharedPreferences, or plain files.
 */

const SERVICE_NAME = 'com.example.app.auth';
const REFRESH_CREDENTIAL_KEY = 'refresh_credential';
const PKCE_VERIFIER_KEY = 'pkce_verifier';

export const secureStore = {
  async saveRefreshCredential(credential: string): Promise<void> {
    await Keychain.setGenericPassword(REFRESH_CREDENTIAL_KEY, credential, {
      service: SERVICE_NAME,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      // Invalidate on biometric enrollment change — prevents attacker
      // enrolling their own biometric to access stored credentials
      securityLevel: Keychain.SECURITY_LEVEL.SECURE_HARDWARE,
      rules: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE,
    });
  },

  async getRefreshCredential(): Promise<string | null> {
    const result = await Keychain.getGenericPassword({
      service: SERVICE_NAME,
      authenticationPrompt: {
        title: 'Authentication Required',
        subtitle: 'Unlock to access your session',
      },
    });

    if (!result || result.username !== REFRESH_CREDENTIAL_KEY) {
      return null;
    }

    return result.password;
  },

  async savePkceVerifier(verifier: string): Promise<void> {
    await Keychain.setGenericPassword(PKCE_VERIFIER_KEY, verifier, {
      service: SERVICE_NAME,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  },

  async getPkceVerifier(): Promise<string | null> {
    const result = await Keychain.getGenericPassword({
      service: SERVICE_NAME,
    });

    if (!result || result.username !== PKCE_VERIFIER_KEY) {
      return null;
    }

    return result.password;
  },

  async clearPkceVerifier(): Promise<void> {
    await Keychain.resetGenericPassword({
      service: SERVICE_NAME,
    });
  },

  async clearAll(): Promise<void> {
    await Keychain.resetGenericPassword({
      service: SERVICE_NAME,
    });
  },
};