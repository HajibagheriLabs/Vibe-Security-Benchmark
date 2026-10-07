import 'dart:convert';
import 'package:http/http.dart' as http;

/// A service class that handles communication with the OpenAI API.
///
/// This service is designed for use in a mobile client, handling
/// authentication via Bearer token and providing methods to interact
/// with the Chat Completions endpoint.
class OpenAIService {
  final String apiKey;
  final String baseUrl;

  /// Creates an instance of [OpenAIService].
  ///
  /// [apiKey] is required for authentication.
  /// [baseUrl] defaults to the standard OpenAI API endpoint.
  OpenAIService({
    required this.apiKey,
    this.baseUrl = 'https://api.openai.com/v1',
  });

  /// Sends a chat completion request to the OpenAI API.
  ///
  /// [model] specifies the model to use (e.g., 'gpt-3.5-turbo').
  /// [messages] is a list of message objects containing 'role' and 'content'.
  /// [temperature] controls randomness (0.0 to 1.0).
  /// [maxTokens] limits the length of the generated response.
  ///
  /// Returns the content of the assistant's response.
  ///
  /// Throws [Exception] if the API request fails.
  Future<String> chatCompletion({
    required String model,
    required List<Map<String, dynamic>> messages,
    double temperature = 0.7,
    int maxTokens = 1000,
  }) async {
    final url = Uri.parse('$baseUrl/chat/completions');

    final headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $apiKey',
    };

    final body = jsonEncode({
      'model': model,
      'messages': messages,
      'temperature': temperature,
      'max_tokens': maxTokens,
    });

    try {
      final response = await http.post(
        url,
        headers: headers,
        body: body,
      );

      if (response.statusCode == 200) {
        final jsonResponse = jsonDecode(response.body) as Map<String, dynamic>;
        final choices = jsonResponse['choices'] as List<dynamic>;
        
        if (choices.isEmpty) {
          throw Exception('No choices returned from OpenAI API');
        }

        final message = choices[0]['message'] as Map<String, dynamic>;
        return message['content'] as String;
      } else {
        throw Exception(
          'Failed to complete chat: ${response.statusCode} ${response.body}',
        );
      }
    } catch (e) {
      // In a real app, you might want to distinguish between network errors
      // and API errors.
      throw Exception('Network error or API failure: $e');
    }
  }

  /// Sends a text completion request to the OpenAI API.
  ///
  /// [model] specifies the model to use.
  /// [prompt] is the text prompt to complete.
  /// [maxTokens] limits the length of the generated response.
  ///
  /// Returns the generated text.
  ///
  /// Throws [Exception] if the API request fails.
  Future<String> textCompletion({
    required String model,
    required String prompt,
    int maxTokens = 1000,
  }) async {
    final url = Uri.parse('$baseUrl/completions');

    final headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $apiKey',
    };

    final body = jsonEncode({
      'model': model,
      'prompt': prompt,
      'max_tokens': maxTokens,
    });

    try {
      final response = await http.post(
        url,
        headers: headers,
        body: body,
      );

      if (response.statusCode == 200) {
        final jsonResponse = jsonDecode(response.body) as Map<String, dynamic>;
        final choices = jsonResponse['choices'] as List<dynamic>;
        
        if (choices.isEmpty) {
          throw Exception('No choices returned from OpenAI API');
        }

        final text = choices[0]['text'] as String;
        return text;
      } else {
        throw Exception(
          'Failed to complete text: ${response.statusCode} ${response.body}',
        );
      }
    } catch (e) {
      throw Exception('Network error or API failure: $e');
    }
  }
}