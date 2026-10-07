import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'openai_service.dart';

/// Provider for the OpenAI API key.
/// In production, this should be loaded from secure storage or environment config.
final openAIApiKeyProvider = Provider<String>((ref) {
  // TODO: Replace with secure key retrieval (e.g., flutter_secure_storage, env config)
  const String apiKey = String.fromEnvironment('OPENAI_API_KEY', defaultValue: '');
  if (apiKey.isEmpty) {
    throw StateError('OPENAI_API_KEY not configured. Set via --dart-define=OPENAI_API_KEY=...');
  }
  return apiKey;
});

/// Provider for the HTTP client (allows mocking in tests).
final httpClientProvider = Provider<http.Client>((ref) => http.Client());

/// Provider for the OpenAIService instance.
final openAIServiceProvider = Provider<OpenAIService>((ref) {
  final apiKey = ref.watch(openAIApiKeyProvider);
  final client = ref.watch(httpClientProvider);
  return OpenAIService.withClient(apiKey: apiKey, client: client);
});

/// Provider for a simple chat completion (non-streaming).
final chatCompletionProvider = FutureProvider.family<String, List<ChatMessage>>((ref, messages) async {
  final service = ref.watch(openAIServiceProvider);
  return service.sendMessage(messages: messages);
});

/// Provider for streaming chat completions.
final chatCompletionStreamProvider = StreamProvider.family<ChatCompletionChunk, List<ChatMessage>>((ref, messages) async* {
  final service = ref.watch(openAIServiceProvider);
  final params = ChatCompletionParams(messages: messages, stream: true);
  await for (final chunk in service.createChatCompletionStream(params)) {
    yield chunk;
  }
});