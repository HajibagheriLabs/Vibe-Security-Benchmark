import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Calls YOUR backend /ai/complete endpoint.
/// The backend validates the session, enforces rate limits, calls OpenAI, and returns minimal fields.
class AiGatewayService {
  AiGatewayService({
    required String baseUrl,
    http.Client? client,
    FlutterSecureStorage? secureStorage,
  })  : _baseUrl = baseUrl,
        _client = client ?? http.Client(),
        _storage = secureStorage ?? const FlutterSecureStorage(
          aOptions: AndroidOptions(encryptedSharedPreferences: true),
          iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock_this_device),
        );

  final String _baseUrl;
  final http.Client _client;
  final FlutterSecureStorage _storage;

  /// Sends a prompt to the backend gateway. Returns the model response text.
  Future<String> complete({
    required String prompt,
    required int maxTokens,
    double temperature = 0.7,
  }) async {
    final accessToken = await _storage.read(key: 'access_token');
    if (accessToken == null) {
      throw StateError('No access token; user must sign in.');
    }

    final uri = Uri.parse('$_baseUrl/ai/complete');
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
      await _storage.delete(key: 'access_token');
      throw StateError('Session expired; please sign in again.');
    }
    if (resp.statusCode != 200) {
      throw Exception('Gateway error ${resp.statusCode}: ${resp.body}');
    }

    final data = jsonDecode(resp.body) as Map<String, dynamic>;
    return data['text'] as String;
  }

  void dispose() => _client.close();
}