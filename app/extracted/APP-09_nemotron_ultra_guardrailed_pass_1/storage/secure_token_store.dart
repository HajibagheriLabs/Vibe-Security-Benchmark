import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureTokenStore {
  static const _tokenKey = 'auth_token';
  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(
      encryptedSharedPreferences: true,
      keyCipherAlgorithm: 'RSA/ECB/OAEPWithSHA-256AndMGF1Padding',
      storageCipherAlgorithm: 'AES/GCM/NoPadding',
    ),
    iOptions: IOSOptions(
      accessibility: KeychainAccessibility.first_unlock_this_device,
      synchronizable: false,
    ),
    wOptions: WindowsOptions(
      encryptionKey: 'auth_token_store',
    ),
    lOptions: LinuxOptions(
      encryptionKey: 'auth_token_store',
    ),
    mOptions: MacOsOptions(
      accessibility: KeychainAccessibility.first_unlock_this_device,
      synchronizable: false,
    ),
  );

  Future<void> saveToken(String token) async {
    await _storage.write(key: _tokenKey, value: token);
  }

  Future<String?> readToken() async {
    return await _storage.read(key: _tokenKey);
  }

  Future<void> clearToken() async {
    await _storage.delete(key: _tokenKey);
  }

  Future<void> clearAll() async {
    await _storage.deleteAll();
  }
}