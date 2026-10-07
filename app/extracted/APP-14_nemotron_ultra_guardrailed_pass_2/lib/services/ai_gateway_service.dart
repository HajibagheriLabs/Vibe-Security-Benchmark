// lib/services/ai_gateway_service.dart
import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

class AiGatewayService {
  AiGatewayService({
    required String baseUrl,
    required FlutterSecureStorage secureStorage,
    http.Client? httpClient,
  })  : _baseUrl = baseUrl,
        _storage = secureStorage,
        _client = httpClient ?? http.Client();

  final String _baseUrl;
  final FlutterSecureStorage _storage;
  final http.Client _client;

  static const _accessTokenKey = 'access_token';
  static const _refreshTokenKey = 'refresh_token';

  /// Calls your backend `/ai/complete` endpoint.
  /// Backend: authenticate → authorize → validate schema → rate-limit → call OpenAI → return minimal fields.
  Future<String> complete({
    required String prompt,
    required int maxTokens,
    double temperature = 0.7,
  }) async {
    final accessToken = await _storage.read(key: _accessTokenKey);
    if (accessToken == null) throw StateError('No access token; user must log in.');

    final uri = Uri.parse('$_baseUrl/ai/complete').replace(queryParameters: {
      'model': 'gpt-4o-mini', // fixed allowlist on server; not client-controlled
    });

    final resp = await _client.post(
      uri,
      headers: {
        'Authorization': 'Bearer $accessToken',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'prompt': prompt,
        'max_tokens': maxTokens,
        'temperature': temperature,
      }),
    );

    if (resp.statusCode == 401) {
      await _refreshAndRetry(uri, prompt, maxTokens, temperature);
      return complete(prompt: prompt, maxTokens: maxTokens, temperature: temperature);
    }

    if (resp.statusCode != 200) {
      throw HttpException('AI gateway error ${resp.statusCode}: ${resp.body}');
    }

    final data = jsonDecode(resp.body) as Map<String, dynamic>;
    return data['text'] as String;
  }

  Future<void> _refreshAndRetry(
    Uri uri,
    String prompt,
    int maxTokens,
    double temperature,
  ) async {
    final refreshToken = await _storage.read(key: _refreshTokenKey);
    if (refreshToken == null) throw StateError('No refresh token; re-authenticate.');

    final refreshResp = await _client.post(
      Uri.parse('$_baseUrl/auth/refresh'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'refresh_token': refreshToken}),
    );

    if (refreshResp.statusCode != 200) {
      await _storage.deleteAll();
      throw StateError('Refresh failed; logged out.');
    }

    final tokens = jsonDecode(refreshResp.body) as Map<String, dynamic>;
    await _storage.write(key: _accessTokenKey, value: tokens['access_token'] as String);
    await _storage.write(key: _refreshTokenKey, value: tokens['refresh_token'] as String);
  }

  void dispose() => _client.close();
}