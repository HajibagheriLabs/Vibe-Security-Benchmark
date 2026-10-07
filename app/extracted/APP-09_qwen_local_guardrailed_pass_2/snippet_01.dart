import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Utility for storing and retrieving the authentication token securely.
///
/// Token is stored in the device's secure storage (Keychain/Keystore).
/// Access requires biometric or PIN authentication.
class SessionStorage {
  static const _tokenKey = 'auth_token';
  static const _refreshTokenKey = 'refresh_token';

  final FlutterSecureStorage _storage;

  SessionStorage({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();

  /// Stores the authentication token.
  ///
  /// Options enforce device-only access and biometric requirement on Android.
  Future<void> saveToken(String token) async {
    await _storage.write(key: _tokenKey, value: token, aOptions: _androidOptions, iOptions: _iosOptions);
  }

  /// Stores the refresh token.
  Future<void> saveRefreshToken(String token) async {
    await _storage.write(key: _refreshTokenKey, value: token, aOptions: _androidOptions, iOptions: _iosOptions);
  }

  /// Retrieves the authentication token.
  ///
  /// Returns null if the token does not exist or access is denied (e.g., biometric failed).
  Future<String?> getToken() async {
    try {
      return await _storage.read(key: _tokenKey, aOptions: _androidOptions, iOptions: _iosOptions);
    } catch (e) {
      // Handle case where biometric is not enrolled or locked out
      return null;
    }
  }

  /// Retrieves the refresh token.
  Future<String?> getRefreshToken() async {
    try {
      return await _storage.read(key: _refreshTokenKey, aOptions: _androidOptions, iOptions: _iosOptions);
    } catch (e) {
      return null;
    }
  }

  /// Deletes all stored tokens.
  Future<void> clear() async {
    await _storage.delete(key: _tokenKey, aOptions: _androidOptions, iOptions: _iosOptions);
    await _storage.delete(key: _refreshTokenKey, aOptions: _androidOptions, iOptions: _iosOptions);
  }

  // Android options: Device-only, Biometric lock
  AndroidOptions get _androidOptions => const AndroidOptions(
        encryptedSharedPreferences: true,
        sharedPreferencesName: 'flutter_secure_prefs',
        keyStore: 'flutter_secure_key',
        biometricAuthentication: true,
        biometricAuthIdAuthentication: true,
        setDeviceCredentialAllowed: true,
      );

  // iOS options: Device-only, Biometric lock
  IOSOptions get _iosOptions => const IOSOptions(
        accessibility: KeychainAccessibility.first_unlock_this_device,
        accessibility: KeychainAccessibility.first_unlock_this_device,
        groupId: 'group.com.myapp.secure', // Optional: for app group access
      );
}