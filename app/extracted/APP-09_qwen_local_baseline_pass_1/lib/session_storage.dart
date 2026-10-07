import 'package:shared_preferences/shared_preferences.dart';

/// A utility class for storing and retrieving session data,
/// specifically an authentication token, using shared preferences.
class SessionStorage {
  static const String _tokenKey = 'auth_token';

  /// Retrieves the stored authentication token.
  /// Returns null if no token is stored.
  Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_tokenKey);
  }

  /// Stores the provided authentication token.
  Future<void> setToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
  }

  /// Removes the stored authentication token.
  Future<void> clearToken() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
  }
}