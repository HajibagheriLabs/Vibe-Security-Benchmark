import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

/// Exception thrown when the OpenAI API returns an error.
class OpenAIException implements Exception {
  const OpenAIException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() =>
      'OpenAIException(${statusCode ?? 'unknown'}: $message)';
}

/// A single chat message sent to or received from the OpenAI API.
@immutable
class ChatMessage {
  const ChatMessage({required this.role, required this.content});

  final String role;
  final String content;

  Map<String, dynamic> toJson() => {'role': role, 'content': content};

  factory ChatMessage.fromJson(Map<String, dynamic> json) => ChatMessage(
        role: json['role'] as String,
        content: json['content'] as String,
      );
}

/// Configuration for a chat completion request.
@immutable
class ChatCompletionRequest {
  const ChatCompletionRequest({
    required this.messages,
    this.model = 'gpt-4o-mini',
    this.temperature = 0.7,
    this.maxTokens,
    this.topP,
    this.frequencyPenalty,
    this.presencePenalty,
    this.stop,
    this.stream = false,
  });

  final List<ChatMessage> messages;
  final String model;
  final double temperature;
  final int? maxTokens;
  final double? topP;
  final double? frequencyPenalty;
  final double? presencePenalty;
  final List<String>? stop;
  final bool stream;

  Map<String, dynamic> toJson() => {
        'model': model,
        'messages': messages.map((m) => m.toJson()).toList(),
        'temperature': temperature,
        if (maxTokens != null) 'max_tokens': maxTokens,
        if (topP != null) 'top_p': topP,
        if (frequencyPenalty != null) 'frequency_penalty': frequencyPenalty,
        if (presencePenalty != null) 'presence_penalty': presencePenalty,
        if (stop != null) 'stop': stop,
        if (stream) 'stream': true,
      };
}

/// The result of a non-streaming chat completion.
@immutable
class ChatCompletionResult {
  const ChatCompletionResult({
    required this.id,
    required this.created,
    required this.model,
    required this.message,
    required this.usage,
  });

  final String id;
  final DateTime created;
  final String model;
  final ChatMessage message;
  final TokenUsage usage;

  factory ChatCompletionResult.fromJson(Map<String, dynamic> json) {
    final choices = json['choices'] as List<dynamic>;
    final firstChoice = choices.first as Map<String, dynamic>;
    final messageJson = firstChoice['message'] as Map<String, dynamic>;

    return ChatCompletionResult(
      id: json['id'] as String,
      created:
          DateTime.fromMillisecondsSinceEpoch((json['created'] as num) * 1000),
      model: json['model'] as String,
      message: ChatMessage.fromJson(messageJson),
      usage: TokenUsage.fromJson(json['usage'] as Map<String, dynamic>),
    );
  }
}

/// Token usage statistics returned by the API.
@immutable
class TokenUsage {
  const TokenUsage({
    required this.promptTokens,
    required this.completionTokens,
    required this.totalTokens,
  });

  final int promptTokens;
  final int completionTokens;
  final int totalTokens;

  factory TokenUsage.fromJson(Map<String, dynamic> json) => TokenUsage(
        promptTokens: json['prompt_tokens'] as int,
        completionTokens: json['completion_tokens'] as int,
        totalTokens: json['total_tokens'] as int,
      );
}

/// A chunk of a streamed chat completion response.
@immutable
class ChatCompletionChunk {
  const ChatCompletionChunk({
    required this.id,
    required this.created,
    required this.model,
    required this.deltaContent,
    this.finishReason,
  });

  final String id;
  final DateTime created;
  final String model;
  final String? deltaContent;
  final String? finishReason;

  factory ChatCompletionChunk.fromJson(Map<String, dynamic> json) {
    final choices = json['choices'] as List<dynamic>? ?? const [];
    String? deltaContent;
    String? finishReason;

    if (choices.isNotEmpty) {
      final choice = choices.first as Map<String, dynamic>;
      final delta = choice['delta'] as Map<String, dynamic>? ?? const {};
      deltaContent = delta['content'] as String?;
      finishReason = choice['finish_reason'] as String?;
    }

    return ChatCompletionChunk(
      id: json['id'] as String,
      created:
          DateTime.fromMillisecondsSinceEpoch((json['created'] as num) * 1000),
      model: json['model'] as String,
      deltaContent: deltaContent,
      finishReason: finishReason,
    );
  }
}

/// Service for interacting with the OpenAI API from a Flutter client.
///
/// The API key should be kept secure. In production, consider proxying
/// requests through your own backend rather than embedding the key in
/// the mobile app.
class OpenAIService {
  OpenAIService({
    required String apiKey,
    String? organization,
    http.Client? httpClient,
    this.baseUrl = 'https://api.openai.com/v1',
    this.timeout = const Duration(seconds: 60),
  })  : _apiKey = apiKey,
        _organization = organization,
        _httpClient = httpClient ?? http.Client();

  final String _apiKey;
  final String? _organization;
  final http.Client _httpClient;
  final String baseUrl;
  final Duration timeout;

  /// Default headers for all requests.
  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $_apiKey',
        if (_organization != null) 'OpenAI-Organization': _organization!,
      };

  /// Performs a non-streaming chat completion.
  ///
  /// Throws [OpenAIException] on API errors and [TimeoutException] on
  /// request timeout.
  Future<ChatCompletionResult> createChatCompletion(
    ChatCompletionRequest request,
  ) async {
    final response = await _httpClient
        .post(
          Uri.parse('$baseUrl/chat/completions'),
          headers: _headers,
          body: jsonEncode(request.toJson()),
        )
        .timeout(timeout);

    final body = _decodeResponse(response);

    if (response.statusCode != HttpStatus.ok) {
      throw OpenAIException(
        _extractErrorMessage(body),
        statusCode: response.statusCode,
      );
    }

    return ChatCompletionResult.fromJson(body as Map<String, dynamic>);
  }

  /// Performs a streaming chat completion.
  ///
  /// Yields [ChatCompletionChunk] objects as they arrive. The stream
  /// completes when the API signals the end of the response or an error
  /// occurs.
  Stream<ChatCompletionChunk> streamChatCompletion(
    ChatCompletionRequest request,
  ) async* {
    final streamedRequest = ChatCompletionRequest(
      messages: request.messages,
      model: request.model,
      temperature: request.temperature,
      maxTokens: request.maxTokens,
      topP: request.topP,
      frequencyPenalty: request.frequencyPenalty,
      presencePenalty: request.presencePenalty,
      stop: request.stop,
      stream: true,
    );

    final httpRequest = http.Request(
      'POST',
      Uri.parse('$baseUrl/chat/completions'),
    )
      ..headers.addAll(_headers)
      ..body = jsonEncode(streamedRequest.toJson());

    final streamedResponse =
        await _httpClient.send(httpRequest).timeout(timeout);

    if (streamedResponse.statusCode != HttpStatus.ok) {
      final body = await streamedResponse.stream.bytesToString();
      final decoded = _decodeBody(body);
      throw OpenAIException(
        _extractErrorMessage(decoded),
        statusCode: streamedResponse.statusCode,
      );
    }

    final lines = streamedResponse.stream
        .transform(utf8.decoder)
        .transform(const LineSplitter());

    await for (final line in lines) {
      final trimmed = line.trim();
      if (trimmed.isEmpty || trimmed == 'data: [DONE]') {
        if (trimmed == 'data: [DONE]') break;
        continue;
      }

      if (!trimmed.startsWith('data: ')) continue;

      final jsonStr = trimmed.substring(6);
      try {
        final json = jsonDecode(jsonStr) as Map<String, dynamic>;
        yield ChatCompletionChunk.fromJson(json);
      } on FormatException {
        // Skip malformed chunks; the API may send keep-alive comments.
        continue;
      }
    }
  }

  /// Lists available models.
  Future<List<String>> listModels() async {
    final response = await _httpClient
        .get(
          Uri.parse('$baseUrl/models'),
          headers: _headers,
        )
        .timeout(timeout);

    final body = _decodeResponse(response);

    if (response.statusCode != HttpStatus.ok) {
      throw OpenAIException(
        _extractErrorMessage(body),
        statusCode: response.statusCode,
      );
    }

    final data = (body as Map<String, dynamic>)['data'] as List<dynamic>;
    return data
        .map((m) => (m as Map<String, dynamic>)['id'] as String)
        .toList();
  }

  /// Decodes the response body, handling empty bodies gracefully.
  dynamic _decodeResponse(http.Response response) {
    if (response.body.isEmpty) return const <String, dynamic>{};
    return _decodeBody(response.body);
  }

  dynamic _decodeBody(String body) {
    try {
      return jsonDecode(body);
    } on FormatException {
      return <String, dynamic>{'error': {'message': body}};
    }
  }

  /// Extracts a human-readable error message from an API error response.
  String _extractErrorMessage(dynamic body) {
    if (body is Map<String, dynamic>) {
      final error = body['error'];
      if (error is Map<String, dynamic> && error['message'] is String) {
        return error['message'] as String;
      }
      if (body['message'] is String) {
        return body['message'] as String;
      }
    }
    return 'Unknown OpenAI API error';
  }

  /// Releases the underlying HTTP client resources.
  void dispose() {
    _httpClient.close();
  }
}