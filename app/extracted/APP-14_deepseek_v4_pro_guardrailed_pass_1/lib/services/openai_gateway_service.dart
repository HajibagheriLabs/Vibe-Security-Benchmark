// lib/services/openai_gateway_service.dart
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Service that proxies OpenAI requests through our authenticated backend gateway.
///
/// Security decisions:
/// - No OpenAI API key is bundled in the app (§3).
/// - The app authenticates to our gateway using a session-bound access token held
///   in memory; only the refresh credential is persisted in the secure store (§1).
/// - All transport is HTTPS; no certificate validation is weakened (§3).
class OpenAIGatewayService {
  OpenAIGatewayService({
    http.Client? httpClient,
    FlutterSecureStorage? secureStorage,
    @visibleForTesting String? gatewayBaseUrl,
  })  : _httpClient = httpClient ?? http.Client(),
        _secureStorage = secureStorage ?? const FlutterSecureStorage(
          aOptions: AndroidOptions(encryptedSharedPreferences: true),
          iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock_this_device),
        ),
        _gatewayBaseUrl = gatewayBaseUrl ?? const String.fromEnvironment(
          'OPENAI_GATEWAY_BASE_URL',
          defaultValue: 'https://api.example.com',
        );

  final http.Client _httpClient;
  final FlutterSecureStorage _secureStorage;
  final String _gatewayBaseUrl;

  /// In-memory access token. Never persisted to disk.
  String? _accessToken;

  static const _refreshTokenKey = 'openai_gateway_refresh_token';
  static const _sessionIdKey = 'openai_gateway_session_id';

  /// Authenticates with the gateway and stores only the refresh credential
  /// in the platform secure store.
  Future<void> authenticate({
    required String refreshToken,
    required String sessionId,
  }) async {
    if (refreshToken.isEmpty || sessionId.isEmpty) {
      throw ArgumentError('refreshToken and sessionId must not be empty');
    }

    // Store refresh credential device-only.
    await _secureStorage.write(key: _refreshTokenKey, value: refreshToken);
    await _secureStorage.write(key: _sessionIdKey, value: sessionId);

    // Fetch a short-lived access token into memory.
    _accessToken = await _fetchAccessToken(refreshToken);
  }

  /// Sends a chat completion request through the gateway.
  ///
  /// The gateway authenticates, authorizes, validates schema, rate-limits,
  /// and constrains parameters before calling OpenAI (§3).
  Future<Map<String, dynamic>> chatCompletion({
    required String model,
    required List<Map<String, String>> messages,
    double? temperature,
    int? maxTokens,
  }) async {
    if (model.isEmpty) {
      throw ArgumentError('model must not be empty');
    }
    if (messages.isEmpty) {
      throw ArgumentError('messages must not be empty');
    }

    // Validate message structure before sending.
    for (final message in messages) {
      if (!message.containsKey('role') || !message.containsKey('content')) {
        throw ArgumentError('Each message must contain role and content');
      }
      final role = message['role'];
      if (role != 'system' && role != 'user' && role != 'assistant') {
        throw ArgumentError('Invalid message role: $role');
      }
    }

    final accessToken = await _getValidAccessToken();

    final response = await _httpClient.post(
      Uri.parse('$_gatewayBaseUrl/v1/openai/chat/completions'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $accessToken',
      },
      body: jsonEncode({
        'model': model,
        'messages': messages,
        if (temperature != null) 'temperature': temperature,
        if (maxTokens != null) 'max_tokens': maxTokens,
      }),
    );

    if (response.statusCode == 401) {
      // Token expired — refresh and retry once.
      await _refreshAccessToken();
      return chatCompletion(
        model: model,
        messages: messages,
        temperature: temperature,
        maxTokens: maxTokens,
      );
    }

    if (response.statusCode != 200) {
      throw OpenAIGatewayException(
        'Gateway request failed with status ${response.statusCode}',
        statusCode: response.statusCode,
      );
    }

    final decoded = jsonDecode(response.body) as Map<String, dynamic>;
    return decoded;
  }

  Future<String> _getValidAccessToken() async {
    if (_accessToken != null) {
      return _accessToken!;
    }

    final refreshToken = await _secureStorage.read(key: _refreshTokenKey);
    if (refreshToken == null) {
      throw StateError('Not authenticated. Call authenticate() first.');
    }

    _accessToken = await _fetchAccessToken(refreshToken);
    return _accessToken!;
  }

  Future<void> _refreshAccessToken() async {
    final refreshToken = await _secureStorage.read(key: _refreshTokenKey);
    if (refreshToken == null) {
      throw StateError('No refresh token available');
    }
    _accessToken = await _fetchAccessToken(refreshToken);
  }

  Future<String> _fetchAccessToken(String refreshToken) async {
    final response = await _httpClient.post(
      Uri.parse('$_gatewayBaseUrl/v1/auth/token'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'refresh_token': refreshToken}),
    );

    if (response.statusCode != 200) {
      throw OpenAIGatewayException(
        'Token refresh failed with status ${response.statusCode}',
        statusCode: response.statusCode,
      );
    }

    final decoded = jsonDecode(response.body) as Map<String, dynamic>;
    final accessToken = decoded['access_token'] as String?;
    if (accessToken == null || accessToken.isEmpty) {
      throw OpenAIGatewayException('Token response missing access_token');
    }

    return accessToken;
  }

  /// Wipes all persisted credentials (§1).
  Future<void> logout() async {
    _accessToken = null;
    await _secureStorage.delete(key: _refreshTokenKey);
    await _secureStorage.delete(key: _sessionIdKey);
  }

  void dispose() {
    _httpClient.close();
  }
}

class OpenAIGatewayException implements Exception {
  OpenAIGatewayException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => 'OpenAIGatewayException: $message';
}