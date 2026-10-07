import 'package:shared_preferences/shared_preferences.dart';

class SessionStorageUtil {
  static const String _tokenKey = 'auth_token';

  /// Stores the authentication token in local device storage.
  static Future<void> storeToken(String token) async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
  }

  /// Retrieves the stored authentication token.
  /// Returns null if no token is stored.
  static Future<String?> getToken() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    return prefs.getString(_tokenKey);
  }

  /// Clears the stored authentication token.
  static Future<void> clearToken() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
  }
}