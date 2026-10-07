import 'package:shared_preferences/shared_preferences.dart';

/// A utility class for managing session-related data persistence.
/// Uses [SharedPreferences] as the underlying storage mechanism.
class SessionStorage {
  static const String _tokenKey = 'auth_token';
  static const String _refreshTokenKey = 'refresh_token';
  static const String _tokenExpiryKey = 'token_expiry';
  static const String _userIdKey = 'user_id';

  final SharedPreferences _prefs;

  SessionStorage._(this._prefs);

  /// Initializes the [SessionStorage] instance.
  /// Must be called once before accessing the instance via [instance].
  static Future<SessionStorage> init() async {
    final prefs = await SharedPreferences.getInstance();
    return SessionStorage._(prefs);
  }

  /// Saves the authentication token and its expiry time.
  Future<void> saveToken({
    required String token,
    required String refreshToken,
    required DateTime expiry,
    required String userId,
  }) async {
    await Future.wait([
      _prefs.setString(_tokenKey, token),
      _prefs.setString(_refreshTokenKey, refreshToken),
      _prefs.setString(_tokenExpiryKey, expiry.toIso8601String()),
      _prefs.setString(_userIdKey, userId),
    ]);
  }

  /// Retrieves the stored authentication token.
  /// Returns `null` if no token is stored.
  String? getToken() {
    return _prefs.getString(_tokenKey);
  }

  /// Retrieves the stored refresh token.
  /// Returns `null` if no refresh token is stored.
  String? getRefreshToken() {
    return _prefs.getString(_refreshTokenKey);
  }

  /// Retrieves the stored token expiry time.
  /// Returns `null` if no expiry is stored.
  DateTime? getTokenExpiry() {
    final expiryString = _prefs.getString(_tokenExpiryKey);
    if (expiryString == null) return null;
    return DateTime.tryParse(expiryString);
  }

  /// Retrieves the stored user ID.
  /// Returns `null` if no user ID is stored.
  String? getUserId() {
    return _prefs.getString(_userIdKey);
  }

  /// Checks if a valid (non-expired) token exists.
  bool hasValidToken() {
    final token = getToken();
    final expiry = getTokenExpiry();
    if (token == null || expiry == null) return false;
    return DateTime.now().isBefore(expiry);
  }

  /// Checks if a token exists (regardless of expiry).
  bool hasToken() {
    return _prefs.containsKey(_tokenKey);
  }

  /// Clears all session data.
  Future<void> clear() async {
    await Future.wait([
      _prefs.remove(_tokenKey),
      _prefs.remove(_refreshTokenKey),
      _prefs.remove(_tokenExpiryKey),
      _prefs.remove(_userIdKey),
    ]);
  }

  /// Updates only the access token and its expiry (e.g., after a refresh).
  Future<void> updateToken({
    required String token,
    required DateTime expiry,
  }) async {
    await Future.wait([
      _prefs.setString(_tokenKey, token),
      _prefs.setString(_tokenExpiryKey, expiry.toIso8601String()),
    ]);
  }
}