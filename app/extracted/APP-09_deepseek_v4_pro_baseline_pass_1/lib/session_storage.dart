import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// A utility class for managing session storage, specifically for storing
/// authentication tokens securely on the device.
class SessionStorage {
  SessionStorage._();

  static final SessionStorage _instance = SessionStorage._();

  /// Singleton instance of [SessionStorage].
  static SessionStorage get instance => _instance;

  static const String _tokenKey = 'auth_token';
  static const String _tokenExpiryKey = 'auth_token_expiry';
  static const String _userDataKey = 'auth_user_data';

  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
    iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
  );

  /// Saves the authentication token to secure storage.
  ///
  /// Optionally accepts an expiry [DateTime] and additional [userData]
  /// that will be stored alongside the token.
  Future<void> saveToken(
    String token, {
    DateTime? expiry,
    Map<String, dynamic>? userData,
  }) async {
    await _secureStorage.write(key: _tokenKey, value: token);

    if (expiry != null) {
      await _secureStorage.write(
        key: _tokenExpiryKey,
        value: expiry.toIso8601String(),
      );
    }

    if (userData != null) {
      await _secureStorage.write(
        key: _userDataKey,
        value: jsonEncode(userData),
      );
    }
  }

  /// Retrieves the stored authentication token.
  ///
  /// Returns `null` if no token has been stored.
  Future<String?> getToken() async {
    return await _secureStorage.read(key: _tokenKey);
  }

  /// Retrieves the token expiry timestamp, if one was stored.
  Future<DateTime?> getTokenExpiry() async {
    final String? expiryString = await _secureStorage.read(
      key: _tokenExpiryKey,
    );
    if (expiryString == null) return null;
    return DateTime.tryParse(expiryString);
  }

  /// Retrieves the stored user data as a map, if any exists.
  Future<Map<String, dynamic>?> getUserData() async {
    final String? userDataString = await _secureStorage.read(
      key: _userDataKey,
    );
    if (userDataString == null) return null;
    try {
      return jsonDecode(userDataString) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  /// Checks whether a valid (non-expired) token exists.
  Future<bool> hasValidToken() async {
    final String? token = await getToken();
    if (token == null || token.isEmpty) return false;

    final DateTime? expiry = await getTokenExpiry();
    if (expiry == null) return true; // No expiry set means token is valid

    return expiry.isAfter(DateTime.now());
  }

  /// Clears all stored session data (token, expiry, and user data).
  Future<void> clearSession() async {
    await _secureStorage.delete(key: _tokenKey);
    await _secureStorage.delete(key: _tokenExpiryKey);
    await _secureStorage.delete(key: _userDataKey);
  }

  /// Deletes only the token and expiry, keeping user data if desired.
  Future<void> clearToken() async {
    await _secureStorage.delete(key: _tokenKey);
    await _secureStorage.delete(key: _tokenExpiryKey);
  }
}