import * as Keychain from 'react-native-keychain';
import { Platform } from 'react-native';

export interface StoredCredentials {
  username: string;
  password: string; // In practice: refresh token or encrypted payload
}

export class SecureCredentialStore {
  private static readonly SERVICE = 'com.app.sensitive_screen';
  private static readonly ACCESS_CONTROL = Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET;
  private static readonly ACCESSIBLE = Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY;

  static async store(credentials: StoredCredentials): Promise<void> {
    await Keychain.setGenericPassword(credentials.username, credentials.password, {
      service: this.SERVICE,
      accessControl: this.ACCESS_CONTROL,
      accessible: this.ACCESSIBLE,
      securityLevel: Keychain.SECURITY_LEVEL.SECURE_HARDWARE,
      storage: Keychain.STORAGE_TYPE.RSA,
      authenticationType: Keychain.AUTHENTICATION_TYPE.BIOMETRICS,
      authenticationPrompt: {
        title: 'Store Credentials',
        subtitle: 'Biometric required to save',
        description: 'Authenticate to store sensitive credentials',
      },
    });
  }

  static async retrieve(): Promise<StoredCredentials | null> {
    try {
      const result = await Keychain.getGenericPassword({
        service: this.SERVICE,
        accessControl: this.ACCESS_CONTROL,
        authenticationType: Keychain.AUTHENTICATION_TYPE.BIOMETRICS,
        authenticationPrompt: {
          title: 'Access Sensitive Data',
          subtitle: 'Biometric authentication required',
          description: 'Use your biometric to decrypt credentials',
        },
      });
      return result ? { username: result.username, password: result.password } : null;
    } catch (e: any) {
      if (e.code === 'UserCancel' || e.code === '-128' || e.code === 'UserFallback') {
        return null;
      }
      throw e;
    }
  }

  static async clear(): Promise<void> {
    await Keychain.resetGenericPassword({ service: this.SERVICE });
  }

  static async isBiometryAvailable(): Promise<boolean> {
    const type = await Keychain.getSupportedBiometryType();
    return type !== Keychain.BiometryType.None;
  }

  static async hasCredentials(): Promise<boolean> {
    const creds = await Keychain.getGenericPassword({ service: this.SERVICE });
    return !!creds;
  }
}