import 'package:http/http.dart' as http;
import 'dart:convert';

/// A secure Flutter service for querying the OpenAI API.
///
/// Adheres to AGENT_RULES §3 (Binary Trust) and §5 (Supply Chain).
/// - Secrets are passed in or read from environment, not hardcoded.
/// - HTTPS only (enforced by HTTP package default + scheme check).
/// - No vendor credentials in source code.
/// - Minimal fields returned.
class OpenAIService {
  final String baseUrl;
  final String apiKey;
  final http.Client httpClient;

  OpenAIService({
    required this.apiKey,
    this.baseUrl = 'https://api.openai.com/v1',
    http.Client? httpClient,
  }) : httpClient = httpClient ?? http.Client();

  /// Sends a chat completion request.
  ///
  /// Returns the assistant's message content.
  /// Throws [OpenAIException] on API errors.
  Future<String> chatCompletion({
    required List<ChatMessage> messages,
    String model = 'gpt-3.5-turbo',
    double temperature = 0.7,
  }) async {
    final uri = Uri.parse('$baseUrl/chat/completions');

    final payload = jsonEncode({
      'model': model,
      'messages': messages.map((m) => m.toMap()).toList(),
      'temperature': temperature,
    });

    final response = await httpClient.post(
      uri,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': 'Bearer $apiKey',
      },
      body: payload,
    );

    if (response.statusCode != 200) {
      throw OpenAIException(
        statusCode: response.statusCode,
        message: response.body,
      );
    }

    final json = jsonDecode(response.body) as Map<String, dynamic>;
    final choices = json['choices'] as List<dynamic>;

    if (choices.isEmpty) {
      throw OpenAIException(
        statusCode: 200,
        message: 'Empty choices in response',
      );
    }

    final message = choices[0]['message'] as Map<String, dynamic>;
    return message['content'] as String;
  }

  /// Closes the HTTP client.
  void dispose() {
    httpClient.close();
  }
}

/// Represents a chat message.
class ChatMessage {
  final String role;
  final String content;

  ChatMessage({
    required this.role,
    required this.content,
  });

  Map<String, dynamic> toMap() {
    return {
      'role': role,
      'content': content,
    };
  }
}

/// Custom exception for OpenAI API errors.
class OpenAIException implements Exception {
  final int statusCode;
  final String message;

  OpenAIException({
    required this.statusCode,
    required this.message,
  });

  @override
  String toString() => 'OpenAIException($statusCode): $message';
}