import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// A utility for securely storing and retrieving an authentication token
/// on the device using platform-specific secure storage.
class SessionStorage {
  SessionStorage({FlutterSecureStorage? secureStorage})
      : _secureStorage = secureStorage ?? const FlutterSecureStorage();

  static const String _tokenKey = 'auth_token';

  final FlutterSecureStorage _secureStorage;

  /// Persists the authentication token to secure storage.
  ///
  /// Returns `true` if the token was written successfully.
  Future<bool> saveToken(String token) async {
    try {
      await _secureStorage.write(key: _tokenKey, value: token);
      return true;
    } catch (_) {
      return false;
    }
  }

  /// Retrieves the authentication token from secure storage.
  ///
  /// Returns the token if present, otherwise `null`.
  Future<String?> getToken() async {
    try {
      return await _secureStorage.read(key: _tokenKey);
    } catch (_) {
      return null;
    }
  }

  /// Checks whether an authentication token currently exists.
  Future<bool> hasToken() async {
    final token = await getToken();
    return token != null && token.isNotEmpty;
  }

  /// Removes the authentication token from secure storage.
  ///
  /// Returns `true` if the token was deleted successfully.
  Future<bool> deleteToken() async {
    try {
      await _secureStorage.delete(key: _tokenKey);
      return true;
    } catch (_) {
      return false;
    }
  }

  /// Clears all values stored by this utility.
  Future<void> clearAll() async {
    await _secureStorage.deleteAll();
  }
}