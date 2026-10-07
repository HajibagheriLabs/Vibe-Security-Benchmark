import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/annotations.dart';
import 'package:mockito/mockito.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'session_storage.dart';

@GenerateMocks([SharedPreferences])
void main() {
  late MockSharedPreferences mockPrefs;
  late SessionStorage sessionStorage;

  setUp(() {
    mockPrefs = MockSharedPreferences();
    sessionStorage = SessionStorage._(mockPrefs);
  });

  group('SessionStorage', () {
    const testToken = 'test_access_token';
    const testRefreshToken = 'test_refresh_token';
    const testUserId = 'user_123';
    final testExpiry = DateTime.now().add(const Duration(hours: 1));

    test('saveToken persists all values', () async {
      when(mockPrefs.setString(any, any)).thenAnswer((_) async => true);

      await sessionStorage.saveToken(
        token: testToken,
        refreshToken: testRefreshToken,
        expiry: testExpiry,
        userId: testUserId,
      );

      verify(mockPrefs.setString('auth_token', testToken)).called(1);
      verify(mockPrefs.setString('refresh_token', testRefreshToken)).called(1);
      verify(mockPrefs.setString('token_expiry', testExpiry.toIso8601String())).called(1);
      verify(mockPrefs.setString('user_id', testUserId)).called(1);
    });

    test('getToken returns stored token', () {
      when(mockPrefs.getString('auth_token')).thenReturn(testToken);

      expect(sessionStorage.getToken(), testToken);
    });

    test('getToken returns null when not set', () {
      when(mockPrefs.getString('auth_token')).thenReturn(null);

      expect(sessionStorage.getToken(), isNull);
    });

    test('getRefreshToken returns stored refresh token', () {
      when(mockPrefs.getString('refresh_token')).thenReturn(testRefreshToken);

      expect(sessionStorage.getRefreshToken(), testRefreshToken);
    });

    test('getTokenExpiry returns parsed DateTime', () {
      final expiryString = testExpiry.toIso8601String();
      when(mockPrefs.getString('token_expiry')).thenReturn(expiryString);

      expect(sessionStorage.getTokenExpiry(), testExpiry);
    });

    test('getTokenExpiry returns null when not set', () {
      when(mockPrefs.getString('token_expiry')).thenReturn(null);

      expect(sessionStorage.getTokenExpiry(), isNull);
    });

    test('getTokenExpiry returns null for invalid date string', () {
      when(mockPrefs.getString('token_expiry')).thenReturn('invalid-date');

      expect(sessionStorage.getTokenExpiry(), isNull);
    });

    test('getUserId returns stored user ID', () {
      when(mockPrefs.getString('user_id')).thenReturn(testUserId);

      expect(sessionStorage.getUserId(), testUserId);
    });

    test('hasValidToken returns true for valid token', () {
      final futureExpiry = DateTime.now().add(const Duration(hours: 1));
      when(mockPrefs.getString('auth_token')).thenReturn(testToken);
      when(mockPrefs.getString('token_expiry')).thenReturn(futureExpiry.toIso8601String());

      expect(sessionStorage.hasValidToken(), isTrue);
    });

    test('hasValidToken returns false for expired token', () {
      final pastExpiry = DateTime.now().subtract(const Duration(hours: 1));
      when(mockPrefs.getString('auth_token')).thenReturn(testToken);
      when(mockPrefs.getString('token_expiry')).thenReturn(pastExpiry.toIso8601String());

      expect(sessionStorage.hasValidToken(), isFalse);
    });

    test('hasValidToken returns false when token is missing', () {
      when(mockPrefs.getString('auth_token')).thenReturn(null);
      when(mockPrefs.getString('token_expiry')).thenReturn(DateTime.now().add(const Duration(hours: 1)).toIso8601String());

      expect(sessionStorage.hasValidToken(), isFalse);
    });

    test('hasValidToken returns false when expiry is missing', () {
      when(mockPrefs.getString('auth_token')).thenReturn(testToken);
      when(mockPrefs.getString('token_expiry')).thenReturn(null);

      expect(sessionStorage.hasValidToken(), isFalse);
    });

    test('hasToken returns true when token exists', () {
      when(mockPrefs.containsKey('auth_token')).thenReturn(true);

      expect(sessionStorage.hasToken(), isTrue);
    });

    test('hasToken returns false when token does not exist', () {
      when(mockPrefs.containsKey('auth_token')).thenReturn(false);

      expect(sessionStorage.hasToken(), isFalse);
    });

    test('clear removes all session keys', () async {
      when(mockPrefs.remove(any)).thenAnswer((_) async => true);

      await sessionStorage.clear();

      verify(mockPrefs.remove('auth_token')).called(1);
      verify(mockPrefs.remove('refresh_token')).called(1);
      verify(mockPrefs.remove('token_expiry')).called(1);
      verify(mockPrefs.remove('user_id')).called(1);
    });

    test('updateToken updates token and expiry only', () async {
      when(mockPrefs.setString(any, any)).thenAnswer((_) async => true);
      final newExpiry = DateTime.now().add(const Duration(hours: 2));
      const newToken = 'new_access_token';

      await sessionStorage.updateToken(token: newToken, expiry: newExpiry);

      verify(mockPrefs.setString('auth_token', newToken)).called(1);
      verify(mockPrefs.setString('token_expiry', newExpiry.toIso8601String())).called(1);
      verifyNever(mockPrefs.setString('refresh_token', any));
      verifyNever(mockPrefs.setString('user_id', any));
    });
  });
}