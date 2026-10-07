// lib/services/openai_gateway_service.dart
import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

/// Secure client for OpenAI-backed features.
///
/// The mobile app NEVER talks to OpenAI directly and NEVER holds an OpenAI
/// API key. All requests go to our authenticated backend gateway, which holds
/// the vendor credential server-side (§3 Binary Trust).
class OpenAIGatewayService {
  OpenAIGatewayService({
    required Uri gatewayBaseUrl,
    http.Client? httpClient,
    FlutterSecureStorage? secureStorage,
  })  : _gatewayBaseUrl = gatewayBaseUrl,
        _httpClient = httpClient ?? http.Client(),
        _secureStorage = secureStorage ?? const FlutterSecureStorage(
          aOptions: AndroidOptions(
            // Device-only, invalidated on biometric enrollment change.
            encryptedSharedPreferences: true,
          ),
          iOptions: IOSOptions(
            accessibility: KeychainAccessibility.first_unlock_this_device,
          ),
        );

  final Uri _gatewayBaseUrl;
  final http.Client _httpClient;
  final FlutterSecureStorage _secureStorage;

  static const _accessTokenKey = 'gateway_access_token';
  static const _refreshTokenKey = 'gateway_refresh_token';

  /// Access token lives only in memory during a session (§1 Storage).
  String? _accessToken;

  /// Sends a prompt to the backend gateway and returns the completion text.
  ///
  /// The gateway enforces: authenticate → authorize → validate schema →
  /// rate-limit → constrain parameters → call OpenAI → return minimal fields.
  Future<String> complete({
    required String prompt,
    required String model,
    int maxTokens = 256,
    double temperature = 0.7,
  }) async {
    if (prompt.trim().isEmpty) {
      throw ArgumentError.value(prompt, 'prompt', 'must not be empty');
    }
    if (model.isEmpty) {
      throw ArgumentError.value(model, 'model', 'must not be empty');
    }
    if (maxTokens <= 0 || maxTokens > 4096) {
      throw ArgumentError.value(maxTokens, 'maxTokens', 'must be 1..4096');
    }
    if (temperature < 0.0 || temperature > 2.0) {
      throw ArgumentError.value(temperature, 'temperature', 'must be 0.0..2.0');
    }

    final token = await _getValidAccessToken();
    final endpoint = _gatewayBaseUrl.resolve('/v1/openai/completions');

    final response = await _httpClient.post(
      endpoint,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode({
        'prompt': prompt,
        'model': model,
        'max_tokens': maxTokens,
        'temperature': temperature,
      }),
    );

    if (response.statusCode == 401) {
      // Token expired or revoked; force a refresh and retry once.
      _accessToken = null;
      final refreshedToken = await _getValidAccessToken();
      final retryResponse = await _httpClient.post(
        endpoint,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $refreshedToken',
        },
        body: jsonEncode({
          'prompt': prompt,
          'model': model,
          'max_tokens': maxTokens,
          'temperature': temperature,
        }),
      );
      return _parseCompletionResponse(retryResponse);
    }

    return _parseCompletionResponse(response);
  }

  String _parseCompletionResponse(http.Response response) {
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw OpenAIGatewayException(
        'Gateway error ${response.statusCode}: ${response.body}',
      );
    }

    final decoded = jsonDecode(response.body) as Map<String, dynamic>;
    final completion = decoded['completion'];
    if (completion is! String) {
      throw const OpenAIGatewayException('Malformed gateway response');
    }
    return completion;
  }

  /// Returns a valid access token, refreshing it via the stored refresh
  /// credential when necessary. The refresh credential is the only sensitive
  /// value persisted, and only in the platform secure store (§1 Storage).
  Future<String> _getValidAccessToken() async {
    final cached = _accessToken;
    if (cached != null && cached.isNotEmpty) {
      return cached;
    }

    final refreshToken = await _secureStorage.read(key: _refreshTokenKey);
    if (refreshToken == null || refreshToken.isEmpty) {
      throw const OpenAIGatewayException(
        'Not authenticated. Call authenticate() first.',
      );
    }

    final tokenEndpoint = _gatewayBaseUrl.resolve('/v1/auth/refresh');
    final response = await _httpClient.post(
      tokenEndpoint,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'refresh_token': refreshToken}),
    );

    if (response.statusCode != 200) {
      throw const OpenAIGatewayException('Session expired. Please sign in again.');
    }

    final decoded = jsonDecode(response.body) as Map<String, dynamic>;
    final newAccessToken = decoded['access_token'] as String?;
    final newRefreshToken = decoded['refresh_token'] as String?;

    if (newAccessToken == null || newAccessToken.isEmpty) {
      throw const OpenAIGatewayException('Malformed token response');
    }

    _accessToken = newAccessToken;

    if (newRefreshToken != null && newRefreshToken.isNotEmpty) {
      await _secureStorage.write(key: _refreshTokenKey, value: newRefreshToken);
    }

    return newAccessToken;
  }

  /// Stores the refresh credential after a successful server-side login.
  /// The access token is intentionally NOT persisted (§1 Storage).
  Future<void> authenticate({
    required String accessToken,
    required String refreshToken,
  }) async {
    _accessToken = accessToken;
    await _secureStorage.write(key: _refreshTokenKey, value: refreshToken);
  }

  /// Wipes all persisted credentials on logout (§1 Storage).
  Future<void> logout() async {
    _accessToken = null;
    await _secureStorage.delete(key: _refreshTokenKey);
    await _secureStorage.delete(key: _accessTokenKey);
  }
}

class OpenAIGatewayException implements Exception {
  const OpenAIGatewayException(this.message);

  final String message;

  @override
  String toString() => 'OpenAIGatewayException: $message';
}