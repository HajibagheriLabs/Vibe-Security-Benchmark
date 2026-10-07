import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/annotations.dart';
import 'package:mockito/mockito.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_session_storage/flutter_session_storage.dart';

@GenerateMocks([FlutterSecureStorage])
import 'flutter_session_storage_test.mocks.dart';

void main() {
  group('SessionStorage', () {
    late MockFlutterSecureStorage mockStorage;
    late SessionStorage sessionStorage;

    setUp(() {
      mockStorage = MockFlutterSecureStorage();
      sessionStorage = SessionStorage(storage: mockStorage);
    });

    group('storeToken', () {
      test('returns true on successful write', () async {
        when(mockStorage.write(key: 'auth_token', value: 'test_token'))
            .thenAnswer((_) async {});

        final result = await sessionStorage.storeToken('test_token');

        expect(result, isTrue);
        verify(mockStorage.write(key: 'auth_token', value: 'test_token'))
            .called(1);
      });

      test('returns false when write throws', () async {
        when(mockStorage.write(key: 'auth_token', value: 'test_token'))
            .thenThrow(Exception('Storage error'));

        final result = await sessionStorage.storeToken('test_token');

        expect(result, isFalse);
      });
    });

    group('getToken', () {
      test('returns token when stored', () async {
        when(mockStorage.read(key: 'auth_token'))
            .thenAnswer((_) async => 'stored_token');

        final result = await sessionStorage.getToken();

        expect(result, equals('stored_token'));
      });

      test('returns null when not stored', () async {
        when(mockStorage.read(key: 'auth_token'))
            .thenAnswer((_) async => null);

        final result = await sessionStorage.getToken();

        expect(result, isNull);
      });

      test('returns null on error', () async {
        when(mockStorage.read(key: 'auth_token'))
            .thenThrow(Exception('Read error'));

        final result = await sessionStorage.getToken();

        expect(result, isNull);
      });
    });

    group('storeRefreshToken', () {
      test('stores and retrieves refresh token', () async {
        when(mockStorage.write(key: 'refresh_token', value: 'refresh_123'))
            .thenAnswer((_) async {});
        when(mockStorage.read(key: 'refresh_token'))
            .thenAnswer((_) async => 'refresh_123');

        await sessionStorage.storeRefreshToken('refresh_123');
        final result = await sessionStorage.getRefreshToken();

        expect(result, equals('refresh_123'));
      });
    });

    group('storeTokenExpiry', () {
      test('stores expiry as milliseconds string', () async {
        when(mockStorage.write(key: 'token_expiry', value: '1700000000000'))
            .thenAnswer((_) async {});

        await sessionStorage.storeTokenExpiry(1700000000000);

        verify(mockStorage.write(key: 'token_expiry', value: '1700000000000'))
            .called(1);
      });

      test('parses expiry correctly', () async {
        when(mockStorage.read(key: 'token_expiry'))
            .thenAnswer((_) async => '1700000000000');

        final result = await sessionStorage.getTokenExpiry();

        expect(result, equals(1700000000000));
      });

      test('returns null for invalid expiry format', () async {
        when(mockStorage.read(key: 'token_expiry'))
            .thenAnswer((_) async => 'invalid');

        final result = await sessionStorage.getTokenExpiry();

        expect(result, isNull);
      });
    });

    group('isTokenExpired', () {
      test('returns true when expiry is in the past', () async {
        final pastExpiry = DateTime.now().millisecondsSinceEpoch - 10000;
        when(mockStorage.read(key: 'token_expiry'))
            .thenAnswer((_) async => pastExpiry.toString());

        final result = await sessionStorage.isTokenExpired();

        expect(result, isTrue);
      });

      test('returns false when expiry is in the future', () async {
        final futureExpiry = DateTime.now().millisecondsSinceEpoch + 10000;
        when(mockStorage.read(key: 'token_expiry'))
            .thenAnswer((_) async => futureExpiry.toString());

        final result = await sessionStorage.isTokenExpired();

        expect(result, isFalse);
      });

      test('returns true when no expiry stored', () async {
        when(mockStorage.read(key: 'token_expiry'))
            .thenAnswer((_) async => null);

        final result = await sessionStorage.isTokenExpired();

        expect(result, isTrue);
      });
    });

    group('clear', () {
      test('deletes all auth keys and returns true', () async {
        when(mockStorage.delete(key: 'auth_token')).thenAnswer((_) async {});
        when(mockStorage.delete(key: 'refresh_token')).thenAnswer((_) async {});
        when(mockStorage.delete(key: 'token_expiry')).thenAnswer((_) async {});

        final result = await sessionStorage.clear();

        expect(result, isTrue);
        verify(mockStorage.delete(key: 'auth_token')).called(1);
        verify(mockStorage.delete(key: 'refresh_token')).called(1);
        verify(mockStorage.delete(key: 'token_expiry')).called(1);
      });

      test('returns false on error', () async {
        when(mockStorage.delete(key: 'auth_token'))
            .thenThrow(Exception('Delete error'));

        final result = await sessionStorage.clear();

        expect(result, isFalse);
      });
    });

    group('hasToken', () {
      test('returns true when token exists and is not empty', () async {
        when(mockStorage.read(key: 'auth_token'))
            .thenAnswer((_) async => 'valid_token');

        final result = await sessionStorage.hasToken();

        expect(result, isTrue);
      });

      test('returns false when token is null', () async {
        when(mockStorage.read(key: 'auth_token'))
            .thenAnswer((_) async => null);

        final result = await sessionStorage.hasToken();

        expect(result, isFalse);
      });

      test('returns false when token is empty string', () async {
        when(mockStorage.read(key: 'auth_token'))
            .thenAnswer((_) async => '');

        final result = await sessionStorage.hasToken();

        expect(result, isFalse);
      });

      test('returns false on error', () async {
        when(mockStorage.read(key: 'auth_token'))
            .thenThrow(Exception('Read error'));

        final result = await sessionStorage.hasToken();

        expect(result, isFalse);
      });
    });
  });
}