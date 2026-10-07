import 'dart:convert';
import 'package:http/http.dart' as http;

/// Service class to interact with the OpenAI API.
class OpenAIService {
  final String apiKey;
  final String baseUrl;

  /// Creates a new instance of [OpenAIService].
  ///
  /// [apiKey] is the OpenAI API key.
  /// [baseUrl] is the OpenAI API endpoint. Defaults to the standard OpenAI URL.
  OpenAIService({
    required this.apiKey,
    this.baseUrl = 'https://api.openai.com/v1',
  });

  /// Sends a chat completion request to the OpenAI API.
  ///
  /// [model] is the ID of the model to use for the completion.
  /// [messages] is a list of message objects representing the conversation history.
  /// [temperature] controls the randomness of the output (0.0 to 1.0).
  /// [maxTokens] is the maximum number of tokens to generate.
  ///
  /// Returns the generated text from the model.
  Future<String> chatCompletion({
    required String model,
    required List<Map<String, String>> messages,
    double temperature = 0.7,
    int maxTokens = 1000,
  }) async {
    final url = Uri.parse('$baseUrl/chat/completions');

    final body = jsonEncode({
      'model': model,
      'messages': messages,
      'temperature': temperature,
      'max_tokens': maxTokens,
    });

    final response = await http.post(
      url,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': 'Bearer $apiKey',
      },
      body: body,
    );

    if (response.statusCode == 200) {
      final Map<String, dynamic> data = jsonDecode(response.body);
      final List<dynamic> choices = data['choices'];
      if (choices.isNotEmpty) {
        final Map<String, dynamic> message = choices[0]['message'];
        return message['content'] as String;
      } else {
        throw Exception('No choices found in response');
      }
    } else {
      throw Exception(
        'Failed to complete chat: ${response.statusCode} ${response.body}',
      );
    }
  }

  /// Sends an image generation request to the OpenAI API (DALL·E).
  ///
  /// [prompt] is the text description of the image to generate.
  /// [n] is the number of images to generate.
  /// [size] is the size of the images to generate (e.g., '256x256').
  ///
  /// Returns a list of URLs for the generated images.
  Future<List<String>> generateImages({
    required String prompt,
    int n = 1,
    String size = '256x256',
  }) async {
    final url = Uri.parse('$baseUrl/images/generations');

    final body = jsonEncode({
      'prompt': prompt,
      'n': n,
      'size': size,
    });

    final response = await http.post(
      url,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': 'Bearer $apiKey',
      },
      body: body,
    );

    if (response.statusCode == 200) {
      final Map<String, dynamic> data = jsonDecode(response.body);
      final List<dynamic> dataList = data['data'];
      return dataList.map((item) => item['url'] as String).toList();
    } else {
      throw Exception(
        'Failed to generate images: ${response.statusCode} ${response.body}',
      );
    }
  }
}