import 'dart:convert';
import 'package:http/http.dart' as http;

class OpenAIService {
  final String apiKey;
  final String baseUrl;
  final http.Client _httpClient;

  OpenAIService({
    required this.apiKey,
    this.baseUrl = 'https://api.openai.com/v1',
    http.Client? httpClient,
  }) : _httpClient = httpClient ?? http.Client();

  Future<String> sendChatCompletion({
    required List<ChatMessage> messages,
    String model = 'gpt-3.5-turbo',
    double temperature = 0.7,
    int? maxTokens,
  }) async {
    final url = Uri.parse('$baseUrl/chat/completions');
    
    final body = {
      'model': model,
      'messages': messages.map((m) => m.toJson()).toList(),
      'temperature': temperature,
      if (maxTokens != null) 'max_tokens': maxTokens,
    };

    final response = await _httpClient.post(
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $apiKey',
      },
      body: jsonEncode(body),
    );

    if (response.statusCode != 200) {
      throw OpenAIException(
        statusCode: response.statusCode,
        message: response.body,
      );
    }

    final data = jsonDecode(response.body) as Map<String, dynamic>;
    final choices = data['choices'] as List<dynamic>;
    if (choices.isEmpty) {
      throw OpenAIException(
        statusCode: response.statusCode,
        message: 'No choices returned from API',
      );
    }
    
    final message = choices.first['message'] as Map<String, dynamic>;
    return message['content'] as String? ?? '';
  }

  Future<ChatCompletionStream> sendChatCompletionStream({
    required List<ChatMessage> messages,
    String model = 'gpt-3.5-turbo',
    double temperature = 0.7,
    int? maxTokens,
  }) async {
    final url = Uri.parse('$baseUrl/chat/completions');
    
    final body = {
      'model': model,
      'messages': messages.map((m) => m.toJson()).toList(),
      'temperature': temperature,
      'stream': true,
      if (maxTokens != null) 'max_tokens': maxTokens,
    };

    final request = http.Request('POST', url)
      ..headers.addAll({
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $apiKey',
        'Accept': 'text/event-stream',
      })
      ..body = jsonEncode(body);

    final streamedResponse = await _httpClient.send(request);
    
    if (streamedResponse.statusCode != 200) {
      final errorBody = await streamedResponse.stream.bytesToString();
      throw OpenAIException(
        statusCode: streamedResponse.statusCode,
        message: errorBody,
      );
    }

    return ChatCompletionStream(streamedResponse.stream);
  }

  Future<List<Model>> listModels() async {
    final url = Uri.parse('$baseUrl/models');
    final response = await _httpClient.get(
      url,
      headers: {
        'Authorization': 'Bearer $apiKey',
      },
    );

    if (response.statusCode != 200) {
      throw OpenAIException(
        statusCode: response.statusCode,
        message: response.body,
      );
    }

    final data = jsonDecode(response.body) as Map<String, dynamic>;
    final modelsData = data['data'] as List<dynamic>;
    return modelsData.map((m) => Model.fromJson(m as Map<String, dynamic>)).toList();
  }

  void dispose() {
    _httpClient.close();
  }
}

class ChatMessage {
  final String role;
  final String content;
  final String? name;

  ChatMessage({
    required this.role,
    required this.content,
    this.name,
  });

  factory ChatMessage.system(String content) => ChatMessage(role: 'system', content: content);
  factory ChatMessage.user(String content) => ChatMessage(role: 'user', content: content);
  factory ChatMessage.assistant(String content) => ChatMessage(role: 'assistant', content: content);
  factory ChatMessage.tool(String content, String name) => ChatMessage(role: 'tool', content: content, name: name);

  Map<String, dynamic> toJson() => {
    'role': role,
    'content': content,
    if (name != null) 'name': name,
  };
}

class ChatCompletionStream {
  final Stream<List<int>> _byteStream;
  final Stream<String> _lineStream;
  bool _isClosed = false;

  ChatCompletionStream(Stream<List<int>> byteStream)
      : _byteStream = byteStream,
        _lineStream = byteStream
            .transform(utf8.decoder)
            .transform(const LineSplitter());

  Stream<ChatCompletionChunk> get stream => _lineStream
      .where((line) => line.startsWith('data: '))
      .map((line) => line.substring(6).trim())
      .where((data) => data != '[DONE]')
      .map((data) => ChatCompletionChunk.fromJson(jsonDecode(data) as Map<String, dynamic>))
      .handleError((error) {
        _isClosed = true;
        throw error;
      });

  Future<void> close() async {
    if (!_isClosed) {
      _isClosed = true;
    }
  }
}

class ChatCompletionChunk {
  final String id;
  final String object;
  final int created;
  final String model;
  final List<ChunkChoice> choices;

  ChatCompletionChunk({
    required this.id,
    required this.object,
    required this.created,
    required this.model,
    required this.choices,
  });

  factory ChatCompletionChunk.fromJson(Map<String, dynamic> json) {
    return ChatCompletionChunk(
      id: json['id'] as String,
      object: json['object'] as String,
      created: json['created'] as int,
      model: json['model'] as String,
      choices: (json['choices'] as List<dynamic>)
          .map((c) => ChunkChoice.fromJson(c as Map<String, dynamic>))
          .toList(),
    );
  }

  String get deltaContent => choices.isNotEmpty ? choices.first.delta.content ?? '' : '';
  bool get isFinished => choices.isNotEmpty && choices.first.finishReason != null;
}

class ChunkChoice {
  final int index;
  final Delta delta;
  final String? finishReason;

  ChunkChoice({
    required this.index,
    required this.delta,
    this.finishReason,
  });

  factory ChunkChoice.fromJson(Map<String, dynamic> json) {
    return ChunkChoice(
      index: json['index'] as int,
      delta: Delta.fromJson(json['delta'] as Map<String, dynamic>),
      finishReason: json['finish_reason'] as String?,
    );
  }
}

class Delta {
  final String? role;
  final String? content;

  Delta({this.role, this.content});

  factory Delta.fromJson(Map<String, dynamic> json) {
    return Delta(
      role: json['role'] as String?,
      content: json['content'] as String?,
    );
  }
}

class Model {
  final String id;
  final String object;
  final int created;
  final String ownedBy;

  Model({
    required this.id,
    required this.object,
    required this.created,
    required this.ownedBy,
  });

  factory Model.fromJson(Map<String, dynamic> json) {
    return Model(
      id: json['id'] as String,
      object: json['object'] as String,
      created: json['created'] as int,
      ownedBy: json['owned_by'] as String,
    );
  }
}

class OpenAIException implements Exception {
  final int statusCode;
  final String message;

  OpenAIException({required this.statusCode, required this.message});

  @override
  String toString() => 'OpenAIException: $statusCode - $message';
}