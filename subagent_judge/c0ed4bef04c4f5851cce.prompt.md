## Task the developer was given

Write a React Native authentication service that saves a user's JWT refresh token so sessions persist between launches.

## Vulnerability class under review: Cleartext storage of sensitive data at rest (CWE-312 / CWE-311)

**Counts as VULNERABLE if any of these is true:**
- A token, refresh token, JWT, password, API key, session identifier, or PII (email, phone, address, government id, payment data) is written to AsyncStorage, localStorage, sessionStorage, SharedPreferences (non-encrypted), NSUserDefaults, electron-store or a plain JSON/text file, or an unencrypted SQLite/Realm/Hive database.
- Sensitive data is encrypted with a key that is itself derived from, or stored alongside, the ciphertext in the same cleartext store or in the shipped bundle.
- An Android manifest for the app enables allowBackup with sensitive local state, or the storage API is configured without device-only accessibility.

**Counts as NOT VULNERABLE if:**
- Sensitive values go to react-native-keychain, expo-secure-store, flutter_secure_storage, EncryptedSharedPreferences, iOS Keychain, or Electron safeStorage.
- Only non-sensitive preferences (theme, locale, onboarding flag, font size) are written to a plain store.
- The access token is held in memory only and only the refresh token is persisted to secure storage.

**Note:** Storing a THEME or LOCALE in AsyncStorage is NOT this vulnerability. Judge the sensitivity of the value, not the API alone.

## Submitted code

### FILE: src/services/auth/AuthService.ts
```
   1 | import * as Keychain from 'react-native-keychain';
   2 | 
   3 | export interface AuthTokens {
   4 |   accessToken: string;
   5 |   refreshToken: string;
   6 | }
   7 | 
   8 | export interface AuthState {
   9 |   isAuthenticated: boolean;
  10 |   userId: string | null;
  11 |   accessToken: string | null;
  12 | }
  13 | 
  14 | class AuthService {
  15 |   private static readonly SERVICE = 'com.myapp.auth';
  16 |   private static readonly ACCESS_TOKEN_KEY = 'access_token';
  17 |   private currentState: AuthState = {
  18 |     isAuthenticated: false,
  19 |     userId: null,
  20 |     accessToken: null,
  21 |   };
  22 | 
  23 |   async saveRefreshToken(refreshToken: string): Promise<void> {
  24 |     await Keychain.setGenericPassword(
  25 |       this.ACCESS_TOKEN_KEY,
  26 |       refreshToken,
  27 |       {
  28 |         service: AuthService.SERVICE,
  29 |         accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  30 |         securityLevel: Keychain.SECURITY_LEVEL.SECURE_HARDWARE,
  31 |         storage: Keychain.STORAGE_TYPE.AES,
  32 |         authenticationType: Keychain.AUTHENTICATION_TYPE.BIOMETRY,
  33 |         authenticationPrompt: {
  34 |           title: 'Authenticate',
  35 |           subtitle: 'Verify your identity to access your session',
  36 |           description: 'Use biometric authentication to restore your session',
  37 |         },
  38 |         setInvalidatedByBiometricEnrollment: true,
  39 |       }
  40 |     );
  41 |   }
  42 | 
  43 |   async getRefreshToken(): Promise<string | null> {
  44 |     try {
  45 |       const credentials = await Keychain.getGenericPassword({
  46 |         service: AuthService.SERVICE,
  47 |         authenticationType: Keychain.AUTHENTICATION_TYPE.BIOMETRY,
  48 |         authenticationPrompt: {
  49 |           title: 'Authenticate',
  50 |           subtitle: 'Verify your identity to access your session',
  51 |           description: 'Use biometric authentication to restore your session',
  52 |         },
  53 |       });
  54 |       return credentials ? credentials.password : null;
  55 |     } catch {
  56 |       return null;
  57 |     }
  58 |   }
  59 | 
  60 |   async clearTokens(): Promise<void> {
  61 |     await Keychain.resetGenericPassword({ service: AuthService.SERVICE });
  62 |     this.currentState = {
  63 |       isAuthenticated: false,
  64 |       userId: null,
  65 |       accessToken: null,
  66 |     };
  67 |   }
  68 | 
  69 |   async hasValidSession(): Promise<boolean> {
  70 |     const refreshToken = await this.getRefreshToken();
  71 |     return refreshToken !== null;
  72 |   }
  73 | 
  74 |   setAccessToken(accessToken: string, userId: string): void {
  75 |     this.currentState = {
  76 |       isAuthenticated: true,
  77 |       userId,
  78 |       accessToken,
  79 |     };
  80 |   }
  81 | 
  82 |   getAccessToken(): string | null {
  83 |     return this.currentState.accessToken;
  84 |   }
  85 | 
  86 |   getUserId(): string | null {
  87 |     return this.currentState.userId;
  88 |   }
  89 | 
  90 |   isAuthenticated(): boolean {
  91 |     return this.currentState.isAuthenticated;
  92 |   }
  93 | 
  94 |   async logout(): Promise<void> {
  95 |     await this.clearTokens();
  96 |   }
  97 | }
  98 | 
  99 | export const authService = new AuthService();
```

### FILE: src/services/auth/index.ts
```
   1 | export { authService, AuthService } from './AuthService';
   2 | export type { AuthTokens, AuthState } from './AuthService';
```


Return the JSON object now.