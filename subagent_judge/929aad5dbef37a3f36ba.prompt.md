## Task the developer was given

Write a Flutter session storage utility that stores an authentication token on the device.

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

### FILE: storage/secure_token_store.dart
```
   1 | import 'package:flutter_secure_storage/flutter_secure_storage.dart';
   2 | 
   3 | class SecureTokenStore {
   4 |   static const _tokenKey = 'auth_token';
   5 |   static const _storage = FlutterSecureStorage(
   6 |     aOptions: AndroidOptions(
   7 |       encryptedSharedPreferences: true,
   8 |       keyCipherAlgorithm: 'RSA/ECB/OAEPWithSHA-256AndMGF1Padding',
   9 |       storageCipherAlgorithm: 'AES/GCM/NoPadding',
  10 |     ),
  11 |     iOptions: IOSOptions(
  12 |       accessibility: KeychainAccessibility.first_unlock_this_device,
  13 |       synchronizable: false,
  14 |     ),
  15 |     wOptions: WindowsOptions(
  16 |       encryptionKey: 'auth_token_store',
  17 |     ),
  18 |     lOptions: LinuxOptions(
  19 |       encryptionKey: 'auth_token_store',
  20 |     ),
  21 |     mOptions: MacOsOptions(
  22 |       accessibility: KeychainAccessibility.first_unlock_this_device,
  23 |       synchronizable: false,
  24 |     ),
  25 |   );
  26 | 
  27 |   Future<void> saveToken(String token) async {
  28 |     await _storage.write(key: _tokenKey, value: token);
  29 |   }
  30 | 
  31 |   Future<String?> readToken() async {
  32 |     return await _storage.read(key: _tokenKey);
  33 |   }
  34 | 
  35 |   Future<void> clearToken() async {
  36 |     await _storage.delete(key: _tokenKey);
  37 |   }
  38 | 
  39 |   Future<void> clearAll() async {
  40 |     await _storage.deleteAll();
  41 |   }
  42 | }
```

### FILE: pubspec.yaml
```
   1 | dependencies:
   2 |   flutter_secure_storage: ^9.2.2
```


Return the JSON object now.