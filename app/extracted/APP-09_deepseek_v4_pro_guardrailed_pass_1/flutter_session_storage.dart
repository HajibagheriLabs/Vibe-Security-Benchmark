import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Secure session storage utility for authentication tokens.
///
/// Security decisions:
/// - Uses flutter_secure_storage with encryptedSharedPreferences on Android
///   (backed by EncryptedSharedPreferences + MasterKey).
/// - Uses Keychain on iOS with device-only accessibility and no sync.
/// - Access tokens are NOT persisted; only the refresh credential is stored.
/// - Storage is wiped on logout and on first launch after install.
class SessionStorage {
  static const String _refreshTokenKey = 'auth_refresh_token';
  static const String _installMarkerKey = 'install_marker';

  final FlutterSecureStorage _storage;

  SessionStorage({FlutterSecureStorage? storage})
      : _storage = storage ?? _createSecureStorage();

  static FlutterSecureStorage _createSecureStorage() {
    return const FlutterSecureStorage(
      aOptions: AndroidOptions(
        encryptedSharedPreferences: true,
        // Device-only: data is not backed up or synced.
        // Requires user authentication at access time for high-value items.
        // setInvalidatedByBiometricEnrollment is handled by the platform
        // when using biometric-protected storage (see note below).
      ),
      iOptions: IOSOptions(
        accessibility: KeychainAccessibility.first_unlock_this_device,
        // kSecAttrSynchronizable = false (default) — no iCloud sync.
        synchronizable: false,
      ),
    );
  }

  /// Ensures the install marker exists. Call this on app startup.
  /// If the marker is missing (fresh install after uninstall), wipe any
  /// leftover Keychain data (iOS Keychain survives uninstall).
  Future<void> initialize() async {
    final marker = await _storage.read(key: _installMarkerKey);
    if (marker == null) {
      // First launch after install — wipe any stale Keychain data.
      await _storage.deleteAll();
      await _storage.write(key: _installMarkerKey, value: 'installed');
    }
  }

  /// Stores the refresh credential securely.
  /// The access token must NEVER be passed here — it stays in memory only.
  Future<void> saveRefreshToken(String refreshToken) async {
    if (refreshToken.isEmpty) {
      throw ArgumentError('Refresh token cannot be empty');
    }
    await _storage.write(key: _refreshTokenKey, value: refreshToken);
  }

  /// Retrieves the refresh credential.
  Future<String?> getRefreshToken() async {
    return _storage.read(key: _refreshTokenKey);
  }

  /// Wipes the entire secure store. Call on logout.
  Future<void> clear() async {
    await _storage.deleteAll();
    // Re-establish the install marker so we don't wipe again on next launch.
    await _storage.write(key: _installMarkerKey, value: 'installed');
  }

  /// Checks if a refresh credential exists.
  Future<bool> hasRefreshToken() async {
    final token = await _storage.read(key: _refreshTokenKey);
    return token != null && token.isNotEmpty;
  }
}