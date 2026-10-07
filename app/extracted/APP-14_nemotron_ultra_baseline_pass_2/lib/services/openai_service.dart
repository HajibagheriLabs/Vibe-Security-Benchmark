import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

/// Configuration constants for the OpenAI service.
class OpenAIConfig {
  static const String baseUrl = 'https://api.openai.com/v1';
  static const String chatCompletionsEndpoint = '/chat/completions';
  static const String defaultModel = 'gpt-4o-mini';
  static const Duration defaultTimeout = Duration(seconds: 60);
}

/// Represents a single message in a chat conversation.
@immutable
class ChatMessage {
  final String role; // 'system', 'user', 'assistant', 'tool'
  final String content;
  final String? name;
  final Map<String, dynamic>? functionCall;
  final String? toolCallId;

  const ChatMessage({
    required this.role,
    required this.content,
    this.name,
    this.functionCall,
    this.toolCallId,
  });

  factory ChatMessage.system(String content) =>
      ChatMessage(role: 'system', content: content);

  factory ChatMessage.user(String content) =>
      ChatMessage(role: 'user', content: content);

  factory ChatMessage.assistant(String content) =>
      ChatMessage(role: 'assistant', content: content);

  factory ChatMessage.tool(String content, String toolCallId) =>
      ChatMessage(role: 'tool', content: content, toolCallId: toolCallId);

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{
      'role': role,
      'content': content,
    };
    if (name != null) map['name'] = name;
    if (functionCall != null) map['function_call'] = functionCall;
    if (toolCallId != null) map['tool_call_id'] = toolCallId;
    return map;
  }
}

/// Represents token usage statistics returned by the API.
@immutable
class TokenUsage {
  final int promptTokens;
  final int completionTokens;
  final int totalTokens;

  const TokenUsage({
    required this.promptTokens,
    required this.completionTokens,
    required this.totalTokens,
  });

  factory TokenUsage.fromJson(Map<String, dynamic> json) => TokenUsage(
        promptTokens: json['prompt_tokens'] as int,
        completionTokens: json['completion_tokens'] as int,
        totalTokens: json['total_tokens'] as int,
      );
}

/// Represents a single choice in the chat completion response.
@immutable
class ChatChoice {
  final int index;
  final ChatMessage message;
  final String finishReason;

  const ChatChoice({
    required this.index,
    required this.message,
    required this.finishReason,
  });

  factory ChatChoice.fromJson(Map<String, dynamic> json) => ChatChoice(
        index: json['index'] as int,
        message: ChatMessage(
          role: json['message']['role'] as String,
          content: json['message']['content'] as String? ?? '',
          functionCall: json['message']['function_call'] as Map<String, dynamic>?,
          toolCallId: json['message']['tool_call_id'] as String?,
        ),
        finishReason: json['finish_reason'] as String,
      );
}

/// Represents the complete chat completion response.
@immutable
class ChatCompletionResponse {
  final String id;
  final String object;
  final int created;
  final String model;
  final List<ChatChoice> choices;
  final TokenUsage usage;
  final String? systemFingerprint;

  const ChatCompletionResponse({
    required this.id,
    required this.object,
    required this.created,
    required this.model,
    required this.choices,
    required this.usage,
    this.systemFingerprint,
  });

  factory ChatCompletionResponse.fromJson(Map<String, dynamic> json) =>
      ChatCompletionResponse(
        id: json['id'] as String,
        object: json['object'] as String,
        created: json['created'] as int,
        model: json['model'] as String,
        choices: (json['choices'] as List)
            .map((e) => ChatChoice.fromJson(e as Map<String, dynamic>))
            .toList(),
        usage: TokenUsage.fromJson(json['usage'] as Map<String, dynamic>),
        systemFingerprint: json['system_fingerprint'] as String?,
      );

  String get content => choices.isNotEmpty ? choices.first.message.content : '';
}

/// Parameters for creating a chat completion request.
@immutable
class ChatCompletionParams {
  final List<ChatMessage> messages;
  final String model;
  final double? temperature;
  final double? topP;
  final int? maxTokens;
  final double? presencePenalty;
  final double? frequencyPenalty;
  final Map<String, dynamic>? responseFormat;
  final List<Map<String, dynamic>>? tools;
  final String? toolChoice;
  final bool stream;
  final String? user;

  const ChatCompletionParams({
    required this.messages,
    this.model = OpenAIConfig.defaultModel,
    this.temperature,
    this.topP,
    this.maxTokens,
    this.presencePenalty,
    this.frequencyPenalty,
    this.responseFormat,
    this.tools,
    this.toolChoice,
    this.stream = false,
    this.user,
  });

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{
      'model': model,
      'messages': messages.map((m) => m.toJson()).toList(),
      'stream': stream,
    };
    if (temperature != null) map['temperature'] = temperature;
    if (topP != null) map['top_p'] = topP;
    if (maxTokens != null) map['max_tokens'] = maxTokens;
    if (presencePenalty != null) map['presence_penalty'] = presencePenalty;
    if (frequencyPenalty != null) map['frequency_penalty'] = frequencyPenalty;
    if (responseFormat != null) map['response_format'] = responseFormat;
    if (tools != null) map['tools'] = tools;
    if (toolChoice != null) map['tool_choice'] = toolChoice;
    if (user != null) map['user'] = user;
    return map;
  }
}

/// Custom exception for OpenAI API errors.
class OpenAIException implements Exception {
  final String message;
  final int? statusCode;
  final String? type;
  final String? code;
  final Map<String, dynamic>? responseBody;

  const OpenAIException({
    required this.message,
    this.statusCode,
    this.type,
    this.code,
    this.responseBody,
  });

  factory OpenAIException.fromResponse(http.Response response) {
    Map<String, dynamic>? body;
    String message = 'OpenAI API error: ${response.statusCode}';
    String? type;
    String? code;

    try {
      body = jsonDecode(response.body) as Map<String, dynamic>;
      final error = body['error'] as Map<String, dynamic>?;
      if (error != null) {
        message = error['message'] as String? ?? message;
        type = error['type'] as String?;
        code = error['code'] as String?;
      }
    } catch (_) {
      message = response.body.isNotEmpty ? response.body : message;
    }

    return OpenAIException(
      message: message,
      statusCode: response.statusCode,
      type: type,
      code: code,
      responseBody: body,
    );
  }

  @override
  String toString() => 'OpenAIException: $message (status: $statusCode, type: $type, code: $code)';
}

/// Service for interacting with the OpenAI Chat Completions API.
class OpenAIService {
  final http.Client _client;
  final String _apiKey;
  final String _baseUrl;
  final Duration _timeout;

  OpenAIService({
    required String apiKey,
    http.Client? client,
    String? baseUrl,
    Duration? timeout,
  })  : _apiKey = apiKey,
        _client = client ?? http.Client(),
        _baseUrl = baseUrl ?? OpenAIConfig.baseUrl,
        _timeout = timeout ?? OpenAIConfig.defaultTimeout;

  /// Creates a service instance from an [http.Client] for testing.
  factory OpenAIService.withClient({
    required String apiKey,
    required http.Client client,
    String? baseUrl,
    Duration? timeout,
  }) = OpenAIService;

  /// Sends a chat completion request and returns the full response.
  Future<ChatCompletionResponse> createChatCompletion(
    ChatCompletionParams params,
  ) async {
    final uri = Uri.parse('$_baseUrl${OpenAIConfig.chatCompletionsEndpoint}');
    final headers = _buildHeaders();
    final body = jsonEncode(params.toJson());

    final request = http.Request('POST', uri)
      ..headers.addAll(headers)
      ..body = body;

    final streamedResponse = await _client.send(request).timeout(_timeout);
    final response = await http.Response.fromStream(streamedResponse);

    if (response.statusCode >= 200 && response.statusCode < 300) {
      final json = jsonDecode(response.body) as Map<String, dynamic>;
      return ChatCompletionResponse.fromJson(json);
    } else {
      throw OpenAIException.fromResponse(response);
    }
  }

  /// Sends a chat completion request and returns only the assistant's message content.
  Future<String> sendMessage({
    required List<ChatMessage> messages,
    String? model,
    double? temperature,
    int? maxTokens,
  }) async {
    final params = ChatCompletionParams(
      messages: messages,
      model: model ?? OpenAIConfig.defaultModel,
      temperature: temperature,
      maxTokens: maxTokens,
    );
    final response = await createChatCompletion(params);
    return response.content;
  }

  /// Streams chat completion responses as they arrive.
  Stream<ChatCompletionChunk> createChatCompletionStream(
    ChatCompletionParams params,
  ) async* {
    final streamingParams = ChatCompletionParams(
      messages: params.messages,
      model: params.model,
      temperature: params.temperature,
      topP: params.topP,
      maxTokens: params.maxTokens,
      presencePenalty: params.presencePenalty,
      frequencyPenalty: params.frequencyPenalty,
      responseFormat: params.responseFormat,
      tools: params.tools,
      toolChoice: params.toolChoice,
      stream: true,
      user: params.user,
    );

    final uri = Uri.parse('$_baseUrl${OpenAIConfig.chatCompletionsEndpoint}');
    final headers = _buildHeaders();
    final body = jsonEncode(streamingParams.toJson());

    final request = http.Request('POST', uri)
      ..headers.addAll(headers)
      ..body = body;

    final streamedResponse = await _client.send(request).timeout(_timeout);

    if (streamedResponse.statusCode >= 200 && streamedResponse.statusCode < 300) {
      await for (final chunk in _parseStream(streamedResponse.stream)) {
        yield chunk;
      }
    } else {
      final response = await http.Response.fromStream(streamedResponse);
      throw OpenAIException.fromResponse(response);
    }
  }

  /// Parses Server-Sent Events (SSE) stream from OpenAI.
  Stream<ChatCompletionChunk> _parseStream(Stream<List<int>> byteStream) async* {
    final decoder = utf8.decoder;
    String buffer = '';

    await for (final bytes in byteStream) {
      buffer += decoder.convert(bytes);
      final lines = buffer.split('\n');
      buffer = lines.removeLast(); // Keep incomplete line in buffer

      for (final line in lines) {
        final trimmed = line.trim();
        if (trimmed.isEmpty || !trimmed.startsWith('data: ')) continue;

        final data = trimmed.substring(6).trim();
        if (data == '[DONE]') return;

        try {
          final json = jsonDecode(data) as Map<String, dynamic>;
          yield ChatCompletionChunk.fromJson(json);
        } catch (e) {
          if (kDebugMode) {
            debugPrint('Failed to parse stream chunk: $data');
          }
        }
      }
    }
  }

  Map<String, String> _buildHeaders() => {
        'Authorization': 'Bearer $_apiKey',
        'Content-Type': 'application/json',
      };

  /// Closes the underlying HTTP client.
  void dispose() {
    _client.close();
  }
}

/// Represents a chunk of a streaming chat completion response.
@immutable
class ChatCompletionChunk {
  final String id;
  final String object;
  final int created;
  final String model;
  final List<ChatChoiceDelta> choices;
  final String? systemFingerprint;

  const ChatCompletionChunk({
    required this.id,
    required this.object,
    required this.created,
    required this.model,
    required this.choices,
    this.systemFingerprint,
  });

  factory ChatCompletionChunk.fromJson(Map<String, dynamic> json) =>
      ChatCompletionChunk(
        id: json['id'] as String,
        object: json['object'] as String,
        created: json['created'] as int,
        model: json['model'] as String,
        choices: (json['choices'] as List)
            .map((e) => ChatChoiceDelta.fromJson(e as Map<String, dynamic>))
            .toList(),
        systemFingerprint: json['system_fingerprint'] as String?,
      );

  String get contentDelta => choices.isNotEmpty ? choices.first.delta.content ?? '' : '';
  bool get isDone => choices.isNotEmpty && choices.first.finishReason != null;
}

/// Represents a delta (incremental update) in a streaming choice.
@immutable
class ChatChoiceDelta {
  final int index;
  final ChatMessageDelta delta;
  final String? finishReason;

  const ChatChoiceDelta({
    required this.index,
    required this.delta,
    this.finishReason,
  });

  factory ChatChoiceDelta.fromJson(Map<String, dynamic> json) => ChatChoiceDelta(
        index: json['index'] as int,
        delta: ChatMessageDelta.fromJson(json['delta'] as Map<String, dynamic>),
        finishReason: json['finish_reason'] as String?,
      );
}

/// Represents an incremental message update.
@immutable
class ChatMessageDelta {
  final String? role;
  final String? content;
  final Map<String, dynamic>? functionCall;
  final List<Map<String, dynamic>>? toolCalls;

  const ChatMessageDelta({
    this.role,
    this.content,
    this.functionCall,
    this.toolCalls,
  });

  factory ChatMessageDelta.fromJson(Map<String, dynamic> json) => ChatMessageDelta(
        role: json['role'] as String?,
        content: json['content'] as String?,
        functionCall: json['function_call'] as Map<String, dynamic>?,
        toolCalls: (json['tool_calls'] as List?)?.cast<Map<String, dynamic>>(),
      );
}