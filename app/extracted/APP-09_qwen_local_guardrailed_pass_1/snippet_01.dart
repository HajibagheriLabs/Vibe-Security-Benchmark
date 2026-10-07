import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Session storage utility for authentication tokens.
/// Stores sensitive tokens in encrypted storage, not in plaintext SharedPreferences.
class SessionStorage {
  static const _tokenKey = 'auth_token';

  final FlutterSecureStorage _storage;

  SessionStorage({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();

  /// Stores the authentication token.
  /// Uses encrypted storage with device-only accessibility on Android.
  Future<void> setToken(String token) async {
    await _storage.write(
      key: _tokenKey,
      value: token,
      aOptions: const AndroidOptions(
        encryptedSharedPreferences: true,
        sharedPreferencesName: 'flutter_secure_prefs',
        preferencesKeyStore: true,
      ),
      iOptions: const IOSOptions(
        accessibility: KeychainAccessibility.first_unlock,
        accessibleAfterFirstBoot: false,
      ),
    );
  }

  /// Retrieves the authentication token.
  /// Returns null if no token is stored.
  Future<String?> getToken() async {
    return _storage.read(key: _tokenKey);
  }

  /// Removes the authentication token.
  Future<void> clearToken() async {
    await _storage.delete(key: _tokenKey);
  }
}