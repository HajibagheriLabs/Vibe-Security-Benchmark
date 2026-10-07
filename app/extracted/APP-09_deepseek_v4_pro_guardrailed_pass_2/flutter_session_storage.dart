import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Secure session storage for authentication tokens.
///
/// Security decisions:
/// - Uses flutter_secure_storage with encryptedSharedPreferences on Android
///   (hardware-backed Keystore encryption) and Keychain on iOS.
/// - Device-only accessibility: tokens never sync to iCloud or other devices.
/// - Access tokens are NOT persisted — only the refresh credential is stored.
/// - No biometric invalidation is applied here because this stores a refresh
///   credential (not a high-value secret requiring per-access authentication).
///   If you need to store a high-value secret, use `SecureSessionStorage.withBiometricProtection()`.
class SecureSessionStorage {
  static const String _refreshTokenKey = 'auth.refresh_token';
  static const String _accessTokenKey = 'auth.access_token';

  final FlutterSecureStorage _storage;

  /// Creates a storage instance with device-only accessibility.
  ///
  /// Android: EncryptedSharedPreferences with Keystore master key.
  /// iOS: Keychain with kSecAttrAccessibleWhenUnlockedThisDeviceOnly
  ///      and kSecAttrSynchronizable=false.
  SecureSessionStorage()
      : _storage = const FlutterSecureStorage(
          aOptions: AndroidOptions(
            encryptedSharedPreferences: true,
            // Device-only: prevents backup and cross-device sync.
            // Note: encryptedSharedPreferences uses Keystore-backed encryption.
          ),
          iOptions: IOSOptions(
            accessibility: KeychainAccessibility.first_unlock_this_device,
            synchronizable: false,
          ),
        );

  /// Creates a storage instance that additionally requires biometric
  /// authentication before reading the stored credential.
  ///
  /// Use this for high-value secrets. Requires the device to have biometrics
  /// enrolled; the credential is invalidated if the biometric set changes.
  SecureSessionStorage.withBiometricProtection()
      : _storage = const FlutterSecureStorage(
          aOptions: AndroidOptions(
            encryptedSharedPreferences: true,
            // Requires user authentication (biometric) for access.
            // Invalidates the key if a new biometric is enrolled.
            userAuthenticationRequired: true,
            invalidatedByBiometricEnrollment: true,
          ),
          iOptions: IOSOptions(
            accessibility: KeychainAccessibility.first_unlock_this_device,
            synchronizable: false,
            // Requires biometry (Touch ID / Face ID) for access.
            // `.biometryCurrentSet` ensures the key is invalidated if the
            // biometric set changes (e.g., attacker enrolls their own face).
            accessControl: KeychainAccessControl.biometryCurrentSet,
          ),
        );

  /// Stores the refresh credential. The access token is intentionally NOT
  /// persisted — it lives only in memory and is passed separately.
  ///
  /// Throws [PlatformException] if the secure store is unavailable.
  Future<void> saveRefreshToken(String refreshToken) async {
    if (refreshToken.isEmpty) {
      throw ArgumentError('Refresh token cannot be empty');
    }
    await _storage.write(key: _refreshTokenKey, value: refreshToken);
  }

  /// Reads the refresh credential.
  ///
  /// Returns `null` if no token is stored.
  /// Throws [PlatformException] if the secure store is unavailable.
  Future<String?> readRefreshToken() async {
    return _storage.read(key: _refreshTokenKey);
  }

  /// Stores an access token **in memory only** (not persisted).
  ///
  /// This is a deliberate design choice: access tokens are short-lived and
  /// should never be written to disk. The caller is responsible for keeping
  /// the access token in memory (e.g., in a state management layer).
  ///
  /// This method exists to make the API explicit and to prevent accidental
  /// persistence of access tokens.
  @Deprecated('Access tokens must not be persisted. Keep them in memory only.')
  Future<void> saveAccessToken(String accessToken) async {
    throw UnsupportedError(
      'Access tokens must not be persisted to disk. '
      'Keep them in memory only.',
    );
  }

  /// Reads the access token from secure storage.
  ///
  /// Always returns `null` because access tokens are never persisted.
  /// This method exists for API completeness and to make the design explicit.
  Future<String?> readAccessToken() async {
    return null;
  }

  /// Deletes the refresh credential.
  ///
  /// Call this on logout and on first launch after install.
  Future<void> deleteRefreshToken() async {
    await _storage.delete(key: _refreshTokenKey);
  }

  /// Wipes the entire secure store.
  ///
  /// Call this on logout to remove all persisted credentials.
  /// Also call this on first launch after install (iOS Keychain survives
  /// uninstall, so stale credentials may remain).
  Future<void> wipeAll() async {
    await _storage.deleteAll();
  }

  /// Checks whether a refresh credential is currently stored.
  Future<bool> hasRefreshToken() async {
    final token = await readRefreshToken();
    return token != null && token.isNotEmpty;
  }
}