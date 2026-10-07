import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// A utility class for managing authentication token storage using
/// platform-secure storage (Keychain on iOS, Keystore on Android).
class SessionStorage {
  static const String _tokenKey = 'auth_token';
  static const String _refreshTokenKey = 'refresh_token';
  static const String _tokenExpiryKey = 'token_expiry';

  final FlutterSecureStorage _storage;

  /// Creates a [SessionStorage] instance with optional custom [storage] configuration.
  /// Uses default secure storage options if none provided.
  SessionStorage({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();

  /// Stores the authentication token securely.
  ///
  /// Returns `true` if the operation succeeds, `false` otherwise.
  Future<bool> storeToken(String token) async {
    try {
      await _storage.write(key: _tokenKey, value: token);
      return true;
    } catch (e) {
      return false;
    }
  }

  /// Retrieves the stored authentication token.
  ///
  /// Returns the token string if found, `null` if not set or on error.
  Future<String?> getToken() async {
    try {
      return await _storage.read(key: _tokenKey);
    } catch (e) {
      return null;
    }
  }

  /// Stores the refresh token securely.
  Future<bool> storeRefreshToken(String refreshToken) async {
    try {
      await _storage.write(key: _refreshTokenKey, value: refreshToken);
      return true;
    } catch (e) {
      return false;
    }
  }

  /// Retrieves the stored refresh token.
  Future<String?> getRefreshToken() async {
    try {
      return await _storage.read(key: _refreshTokenKey);
    } catch (e) {
      return null;
    }
  }

  /// Stores the token expiry timestamp (milliseconds since epoch).
  Future<bool> storeTokenExpiry(int expiryMs) async {
    try {
      await _storage.write(key: _tokenExpiryKey, value: expiryMs.toString());
      return true;
    } catch (e) {
      return false;
    }
  }

  /// Retrieves the token expiry timestamp.
  Future<int?> getTokenExpiry() async {
    try {
      final value = await _storage.read(key: _tokenExpiryKey);
      return value != null ? int.tryParse(value) : null;
    } catch (e) {
      return null;
    }
  }

  /// Checks if the stored token is expired.
  Future<bool> isTokenExpired() async {
    final expiry = await getTokenExpiry();
    if (expiry == null) return true;
    return DateTime.now().millisecondsSinceEpoch >= expiry;
  }

  /// Clears all authentication-related stored data.
  Future<bool> clear() async {
    try {
      await _storage.delete(key: _tokenKey);
      await _storage.delete(key: _refreshTokenKey);
      await _storage.delete(key: _tokenExpiryKey);
      return true;
    } catch (e) {
      return false;
    }
  }

  /// Checks if an authentication token exists in storage.
  Future<bool> hasToken() async {
    try {
      final token = await _storage.read(key: _tokenKey);
      return token != null && token.isNotEmpty;
    } catch (e) {
      return false;
    }
  }
}

/// A convenient singleton instance for app-wide usage.
final sessionStorage = SessionStorage();