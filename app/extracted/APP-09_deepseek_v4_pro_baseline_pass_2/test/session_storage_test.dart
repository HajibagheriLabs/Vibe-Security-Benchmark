import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:session_storage/session_storage.dart';

class _MockSecureStorage implements FlutterSecureStorage {
  final Map<String, String> _store = {};

  @override
  Future<void> write({
    required String key,
    required String? value,
    IOSOptions? iOptions,
    AndroidOptions? aOptions,
    LinuxOptions? lOptions,
    WebOptions? webOptions,
    MacOsOptions? mOptions,
    WindowsOptions? wOptions,
  }) async {
    if (value == null) {
      _store.remove(key);
    } else {
      _store[key] = value;
    }
  }

  @override
  Future<String?> read({
    required String key,
    IOSOptions? iOptions,
    AndroidOptions? aOptions,
    LinuxOptions? lOptions,
    WebOptions? webOptions,
    MacOsOptions? mOptions,
    WindowsOptions? wOptions,
  }) async {
    return _store[key];
  }

  @override
  Future<void> delete({
    required String key,
    IOSOptions? iOptions,
    AndroidOptions? aOptions,
    LinuxOptions? lOptions,
    WebOptions? webOptions,
    MacOsOptions? mOptions,
    WindowsOptions? wOptions,
  }) async {
    _store.remove(key);
  }

  @override
  Future<void> deleteAll({
    IOSOptions? iOptions,
    AndroidOptions? aOptions,
    LinuxOptions? lOptions,
    WebOptions? webOptions,
    MacOsOptions? mOptions,
    WindowsOptions? wOptions,
  }) async {
    _store.clear();
  }

  @override
  Future<bool> containsKey({
    required String key,
    IOSOptions? iOptions,
    AndroidOptions? aOptions,
    LinuxOptions? lOptions,
    WebOptions? webOptions,
    MacOsOptions? mOptions,
    WindowsOptions? wOptions,
  }) async {
    return _store.containsKey(key);
  }

  @override
  Future<Map<String, String>> readAll({
    IOSOptions? iOptions,
    AndroidOptions? aOptions,
    LinuxOptions? lOptions,
    WebOptions? webOptions,
    MacOsOptions? mOptions,
    WindowsOptions? wOptions,
  }) async {
    return Map.unmodifiable(_store);
  }

  @override
  bool get isCupertinoSecureStorageAvailable => true;

  @override
  Future<bool> isEncryptionSupported() async => true;
}

void main() {
  group('SessionStorage', () {
    late SessionStorage sessionStorage;
    late _MockSecureStorage mockStorage;

    setUp(() {
      mockStorage = _MockSecureStorage();
      sessionStorage = SessionStorage(secureStorage: mockStorage);
    });

    test('saveToken stores the token and returns true', () async {
      final result = await sessionStorage.saveToken('abc123');
      expect(result, isTrue);
      expect(await sessionStorage.getToken(), 'abc123');
    });

    test('getToken returns null when no token is stored', () async {
      expect(await sessionStorage.getToken(), isNull);
    });

    test('hasToken returns true when a token exists', () async {
      await sessionStorage.saveToken('token-value');
      expect(await sessionStorage.hasToken(), isTrue);
    });

    test('hasToken returns false when no token exists', () async {
      expect(await sessionStorage.hasToken(), isFalse);
    });

    test('hasToken returns false when token is empty', () async {
      await sessionStorage.saveToken('');
      expect(await sessionStorage.hasToken(), isFalse);
    });

    test('deleteToken removes the token and returns true', () async {
      await sessionStorage.saveToken('token-to-delete');
      final result = await sessionStorage.deleteToken();
      expect(result, isTrue);
      expect(await sessionStorage.getToken(), isNull);
    });

    test('clearAll removes all stored values', () async {
      await sessionStorage.saveToken('token-1');
      await sessionStorage.clearAll();
      expect(await sessionStorage.getToken(), isNull);
    });
  });
}