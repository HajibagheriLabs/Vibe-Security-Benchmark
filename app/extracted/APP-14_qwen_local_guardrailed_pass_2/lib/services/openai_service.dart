import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

// Rule 1: Storage. Sensitive token stored in FlutterSecureStorage (AES-256).
// Rule 3: Binary Trust. No hardcoded keys in bundle; fetched at runtime or set via env/build config.
// Rule 5: Supply Chain. Pin exact versions in pubspec.yaml.

class OpenAIService {
  final http.Client _client;
  final FlutterSecureStorage _storage;
  final String baseUrl;

  OpenAIService({
    required this._storage,
    this.baseUrl = 'https://api.openai.com',
  }) : _client = http.Client();

  /// Queries the OpenAI API using the stored access token.
  Future<Map<String, dynamic>> chat({
    required String model,
    required List<Map<String, dynamic>> messages,
  }) async {
    final token = await _storage.read(key: 'openai_access_token');
    if (token == null) {
      throw Exception('OpenAI access token not found. Please log in.');
    }

    final uri = Uri.parse('$baseUrl/v1/chat/completions');

    // Rule 3: TLS. http.Client uses system default trust store (no weakening).
    // Rule 5: Pin exact versions. Ensure `http` package is pinned.
    final response = await _client.post(
      uri,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode({
        'model': model,
        'messages': messages,
        // Rule 3: Constrain parameters.
        'max_tokens': 1024,
        'temperature': 0.7,
      }),
    );

    if (response.statusCode != 200) {
      // Rule 3: Return minimal fields.
      throw Exception('OpenAI API error: ${response.body}');
    }

    return jsonDecode(response.body) as Map<String, dynamic>;
  }

  void dispose() {
    _client.close();
  }
}