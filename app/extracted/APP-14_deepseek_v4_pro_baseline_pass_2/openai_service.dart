import 'dart:convert';
import 'dart:async';

import 'package:http/http.dart' as http;

/// Exception thrown when the OpenAI API returns an error response.
class OpenAIException implements Exception {
  final int statusCode;
  final String message;
  final String? errorType;

  OpenAIException({
    required this.statusCode,
    required this.message,
    this.errorType,
  });

  @override
  String toString() =>
      'OpenAIException($statusCode${errorType != null ? ', $errorType' : ''}): $message';
}

/// Represents a single chat message in the OpenAI conversation format.
class ChatMessage {
  final String role;
  final String content;

  const ChatMessage({
    required this.role,
    required this.content,
  });

  Map<String, dynamic> toJson() => {
        'role': role,
        'content': content,
      };

  factory ChatMessage.fromJson(Map<String, dynamic> json) => ChatMessage(
        role: json['role'] as String,
        content: json['content'] as String,
      );
}

/// Represents a choice returned by the OpenAI chat completion API.
class ChatChoice {
  final int index;
  final ChatMessage message;
  final String? finishReason;

  const ChatChoice({
    required this.index,
    required this.message,
    this.finishReason,
  });

  factory ChatChoice.fromJson(Map<String, dynamic> json) => ChatChoice(
        index: json['index'] as int,
        message: ChatMessage.fromJson(json['message'] as Map<String, dynamic>),
        finishReason: json['finish_reason'] as String?,
      );
}

/// Represents token usage statistics from the API response.
class Usage {
  final int promptTokens;
  final int completionTokens;
  final int totalTokens;

  const Usage({
    required this.promptTokens,
    required this.completionTokens,
    required this.totalTokens,
  });

  factory Usage.fromJson(Map<String, dynamic> json) => Usage(
        promptTokens: json['prompt_tokens'] as int,
        completionTokens: json['completion_tokens'] as int,
        totalTokens: json['total_tokens'] as int,
      );
}

/// Represents a complete chat completion response from the OpenAI API.
class ChatCompletionResponse {
  final String id;
  final String object;
  final int created;
  final String model;
  final List<ChatChoice> choices;
  final Usage? usage;

  const ChatCompletionResponse({
    required this.id,
    required this.object,
    required this.created,
    required this.model,
    required this.choices,
    this.usage,
  });

  factory ChatCompletionResponse.fromJson(Map<String, dynamic> json) =>
      ChatCompletionResponse(
        id: json['id'] as String,
        object: json['object'] as String,
        created: json['created'] as int,
        model: json['model'] as String,
        choices: (json['choices'] as List<dynamic>)
            .map((e) => ChatChoice.fromJson(e as Map<String, dynamic>))
            .toList(),
        usage: json['usage'] != null
            ? Usage.fromJson(json['usage'] as Map<String, dynamic>)
            : null,
      );
}

/// Configuration options for a chat completion request.
class ChatCompletionRequest {
  final String model;
  final List<ChatMessage> messages;
  final double? temperature;
  final double? topP;
  final int? maxTokens;
  final bool? stream;
  final List<String>? stop;
  final double? frequencyPenalty;
  final double? presencePenalty;
  final Map<String, dynamic>? logitBias;
  final String? user;

  const ChatCompletionRequest({
    required this.model,
    required this.messages,
    this.temperature,
    this.topP,
    this.maxTokens,
    this.stream,
    this.stop,
    this.frequencyPenalty,
    this.presencePenalty,
    this.logitBias,
    this.user,
  });

  Map<String, dynamic> toJson() {
    final json = <String, dynamic>{
      'model': model,
      'messages': messages.map((m) => m.toJson()).toList(),
    };

    if (temperature != null) json['temperature'] = temperature;
    if (topP != null) json['top_p'] = topP;
    if (maxTokens != null) json['max_tokens'] = maxTokens;
    if (stream != null) json['stream'] = stream;
    if (stop != null) json['stop'] = stop;
    if (frequencyPenalty != null) {
      json['frequency_penalty'] = frequencyPenalty;
    }
    if (presencePenalty != null) json['presence_penalty'] = presencePenalty;
    if (logitBias != null) json['logit_bias'] = logitBias;
    if (user != null) json['user'] = user;

    return json;
  }
}

/// Service for interacting with the OpenAI API from a Flutter mobile client.
///
/// This service handles authentication, request construction, response
/// parsing, and error handling for chat completions and other OpenAI
/// endpoints. It is designed to be instantiated once and reused across
/// the application.
class OpenAIService {
  final String apiKey;
  final String? organizationId;
  final http.Client _httpClient;
  final Duration _timeout;

  static const String _baseUrl = 'https://api.openai.com/v1';

  /// Creates an [OpenAIService] instance.
  ///
  /// [apiKey] is the OpenAI API key used for authentication.
  /// [organizationId] is optional and specifies the organization for
  /// multi-org accounts.
  /// [httpClient] allows injecting a custom HTTP client (useful for testing).
  /// [timeout] controls how long to wait for API responses.
  OpenAIService({
    required this.apiKey,
    this.organizationId,
    http.Client? httpClient,
    Duration timeout = const Duration(seconds: 60),
  })  : _httpClient = httpClient ?? http.Client(),
        _timeout = timeout;

  /// Builds the standard headers required for OpenAI API requests.
  Map<String, String> _buildHeaders() {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $apiKey',
    };

    if (organizationId != null && organizationId!.isNotEmpty) {
      headers['OpenAI-Organization'] = organizationId!;
    }

    return headers;
  }

  /// Sends a chat completion request to the OpenAI API.
  ///
  /// Throws [OpenAIException] on API errors and [TimeoutException] on
  /// network timeouts.
  Future<ChatCompletionResponse> createChatCompletion(
    ChatCompletionRequest request,
  ) async {
    final uri = Uri.parse('$_baseUrl/chat/completions');

    try {
      final response = await _httpClient
          .post(
            uri,
            headers: _buildHeaders(),
            body: jsonEncode(request.toJson()),
          )
          .timeout(_timeout);

      return _handleResponse(response);
    } on TimeoutException {
      rethrow;
    } on http.ClientException catch (e) {
      throw OpenAIException(
        statusCode: 0,
        message: 'Network error: ${e.message}',
        errorType: 'network_error',
      );
    }
  }

  /// Sends a simple text prompt to the OpenAI API using the default
  /// chat completion endpoint.
  ///
  /// This is a convenience method for single-turn conversations.
  Future<String> completeText(
    String prompt, {
    String model = 'gpt-4o-mini',
    double temperature = 0.7,
    int? maxTokens,
    String systemPrompt = 'You are a helpful assistant.',
  }) async {
    final request = ChatCompletionRequest(
      model: model,
      messages: [
        ChatMessage(role: 'system', content: systemPrompt),
        ChatMessage(role: 'user', content: prompt),
      ],
      temperature: temperature,
      maxTokens: maxTokens,
    );

    final response = await createChatCompletion(request);

    if (response.choices.isEmpty) {
      throw OpenAIException(
        statusCode: 200,
        message: 'No choices returned from the API',
        errorType: 'empty_response',
      );
    }

    return response.choices.first.message.content;
  }

  /// Sends a multi-turn conversation to the OpenAI API.
  ///
  /// [messages] should include the full conversation history in order.
  Future<ChatCompletionResponse> chat(
    List<ChatMessage> messages, {
    String model = 'gpt-4o-mini',
    double temperature = 0.7,
    int? maxTokens,
  }) async {
    final request = ChatCompletionRequest(
      model: model,
      messages: messages,
      temperature: temperature,
      maxTokens: maxTokens,
    );

    return createChatCompletion(request);
  }

  /// Lists available models from the OpenAI API.
  Future<List<String>> listModels() async {
    final uri = Uri.parse('$_baseUrl/models');

    try {
      final response = await _httpClient
          .get(uri, headers: _buildHeaders())
          .timeout(_timeout);

      final json = _handleResponse(response);

      final data = json['data'] as List<dynamic>? ?? [];
      return data
          .map((e) => (e as Map<String, dynamic>)['id'] as String)
          .toList();
    } on TimeoutException {
      rethrow;
    } on http.ClientException catch (e) {
      throw OpenAIException(
        statusCode: 0,
        message: 'Network error: ${e.message}',
        errorType: 'network_error',
      );
    }
  }

  /// Processes an HTTP response and returns the parsed JSON body.
  ///
  /// Throws [OpenAIException] for non-2xx status codes.
  Map<String, dynamic> _handleResponse(http.Response response) {
    final statusCode = response.statusCode;
    final body = response.body;

    Map<String, dynamic>? jsonBody;
    try {
      jsonBody = jsonDecode(body) as Map<String, dynamic>;
    } catch (_) {
      // Body is not valid JSON; will be handled below if status is error.
    }

    if (statusCode >= 200 && statusCode < 300) {
      if (jsonBody == null) {
        throw OpenAIException(
          statusCode: statusCode,
          message: 'Invalid JSON response from API',
          errorType: 'invalid_json',
        );
      }
      return jsonBody;
    }

    // Parse error details from the response body if available.
    String errorMessage = 'Unknown error';
    String? errorType;

    if (jsonBody != null && jsonBody.containsKey('error')) {
      final error = jsonBody['error'] as Map<String, dynamic>?;
      if (error != null) {
        errorMessage = error['message'] as String? ?? errorMessage;
        errorType = error['type'] as String?;
      }
    } else if (body.isNotEmpty) {
      errorMessage = body;
    }

    throw OpenAIException(
      statusCode: statusCode,
      message: errorMessage,
      errorType: errorType,
    );
  }

  /// Closes the underlying HTTP client.
  ///
  /// Call this when the service is no longer needed to free resources.
  void dispose() {
    _httpClient.close();
  }
}