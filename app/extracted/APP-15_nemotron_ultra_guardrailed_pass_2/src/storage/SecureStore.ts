import * as Keychain from 'react-native-keychain';
import { Platform } from 'react-native';

const SERVICE = 'com.example.app.secure';
const ACCESS_CONTROL = Platform.OS === 'ios'
  ? Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET
  : Keychain.ACCESS_CONTROL.DEVICE_CREDENTIALS;

export const SecureStore = {
  async setItem(key: string, value: string): Promise<void> {
    await Keychain.setGenericPassword(key, value, {
      service: SERVICE,
      accessControl: ACCESS_CONTROL,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      storage: Keychain.STORAGE_TYPE.RSA, // Android Keystore-backed
    });
  },

  async getItem(key: string): Promise<string | null> {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: SERVICE,
        accessControl: ACCESS_CONTROL,
      });
      return credentials?.password ?? null;
    } catch {
      return null;
    }
  },

  async removeItem(key: string): Promise<void> {
    await Keychain.resetGenericPassword({ service: SERVICE });
  },

  async wipeAll(): Promise<void> {
    await Keychain.resetGenericPassword({ service: SERVICE });
  },
};