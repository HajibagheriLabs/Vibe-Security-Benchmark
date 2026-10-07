import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../flutter_session_storage.dart';

/// Implementation details for platform-specific secure storage configuration.
class SessionStorageImpl {
  /// Creates a [FlutterSecureStorage] instance with recommended options.
  static FlutterSecureStorage createSecureStorage({
    AndroidOptions? androidOptions,
    IOSOptions? iosOptions,
    LinuxOptions? linuxOptions,
    MacOsOptions? macOsOptions,
    WebOptions? webOptions,
  }) {
    return FlutterSecureStorage(
      aOptions: androidOptions ?? _defaultAndroidOptions(),
      iOptions: iosOptions ?? _defaultIOSOptions(),
      lOptions: linuxOptions ?? _defaultLinuxOptions(),
      mOptions: macOsOptions ?? _defaultMacOsOptions(),
      wOptions: webOptions ?? _defaultWebOptions(),
    );
  }

  static AndroidOptions _defaultAndroidOptions() => const AndroidOptions(
        encryptedSharedPreferences: true,
        keyCipherAlgorithm: 'AES/GCM/NoPadding',
        storageCipherAlgorithm: 'AES/GCM/NoPadding',
        prefName: 'flutter_session_storage_prefs',
        keyAlias: 'flutter_session_storage_key',
      );

  static IOSOptions _defaultIOSOptions() => const IOSOptions(
        accessibility: KeychainAccessibility.first_unlock_this_device,
        accountName: 'flutter_session_storage',
        synchronizable: false,
      );

  static LinuxOptions _defaultLinuxOptions() => const LinuxOptions(
        libSecretSchemaName: 'flutter_session_storage',
        libSecretCollectionName: 'flutter_session_storage_collection',
        libSecretLabel: 'Flutter Session Storage',
        libSecretAttributes: {
          'application': 'flutter_session_storage',
        },
      );

  static MacOsOptions _defaultMacOsOptions() => const MacOsOptions(
        accessibility: KeychainAccessibility.first_unlock_this_device,
        accountName: 'flutter_session_storage',
        synchronizable: false,
      );

  static WebOptions _defaultWebOptions() => const WebOptions(
        dbName: 'flutter_session_storage_db',
        psName: 'flutter_session_storage_ps',
      );
}