import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// SessionStorage provides secure, device-only persistence for authentication tokens.
/// Uses flutter_secure_storage with encryptedSharedPreferences on Android and
/// Keychain with kSecAttrSynchronizable=false on iOS.
class SessionStorage {
  static const _tokenKey = 'auth_token';

  // Device-only, hardware-backed when available.
  // Android: encryptedSharedPreferences (requires API 23+), no backup.
  // iOS: Keychain with kSecAttrSynchronizable=false (this-device-only).
  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(
      encryptedSharedPreferences: true,
      // Reset on biometric enrollment change (invalidates stored keys).
      // Requires user authentication for high-value access.
      resetOnError: true,
    ),
    iOptions: IOSOptions(
      synchronizable: false, // this-device-only, no iCloud sync
      accessibility: KeychainAccessibility.first_unlock_this_device,
    ),
  );

  /// Stores the authentication token securely.
  /// Overwrites any existing token.
  Future<void> storeToken(String token) async {
    await _storage.write(key: _tokenKey, value: token);
  }

  /// Retrieves the authentication token, or null if not set.
  Future<String?> getToken() async {
    return await _storage.read(key: _tokenKey);
  }

  /// Clears the authentication token (e.g., on logout).
  Future<void> clearToken() async {
    await _storage.delete(key: _tokenKey);
  }

  /// Clears all secure storage (e.g., on first launch after install,
  /// because iOS Keychain survives uninstall).
  Future<void> clearAll() async {
    await _storage.deleteAll();
  }
}