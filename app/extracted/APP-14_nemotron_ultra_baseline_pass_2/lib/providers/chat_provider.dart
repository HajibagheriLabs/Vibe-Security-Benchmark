import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/chat_session.dart';
import '../services/openai_service.dart';

/// State for the chat controller.
@immutable
class ChatState {
  final ChatSession session;
  final bool isLoading;
  final String? error;
  final String? streamingContent;

  const ChatState({
    required this.session,
    this.isLoading = false,
    this.error,
    this.streamingContent,
  });

  ChatState copyWith({
    ChatSession? session,
    bool? isLoading,
    String? error,
    String? streamingContent,
  }) => ChatState(
        session: session ?? this.session,
        isLoading: isLoading ?? this.isLoading,
        error: error,
        streamingContent: streamingContent,
      );
}

/// Controller for managing a chat session with OpenAI.
class ChatController extends StateNotifier<ChatState> {
  final OpenAIService _service;

  ChatController(this._service, ChatSession initialSession)
      : super(ChatState(session: initialSession));

  /// Sends a user message and gets a complete response (non-streaming).
  Future<void> sendMessage(String content) async {
    if (content.trim().isEmpty) return;

    state = state.copyWith(
      session: state.session.addUserMessage(content),
      isLoading: true,
      error: null,
    );

    try {
      final response = await _service.sendMessage(messages: state.session.apiMessages);
      state = state.copyWith(
        session: state.session.addAssistantMessage(response),
        isLoading: false,
      );
    } on OpenAIException catch (e) {
      state = state.copyWith(isLoading: false, error: e.message);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  /// Sends a user message and streams the response.
  Future<void> sendMessageStream(String content) async {
    if (content.trim().isEmpty) return;

    state = state.copyWith(
      session: state.session.addUserMessage(content),
      isLoading: true,
      error: null,
      streamingContent: '',
    );

    try {
      final params = ChatCompletionParams(
        messages: state.session.apiMessages,
        stream: true,
      );

      await for (final chunk in _service.createChatCompletionStream(params)) {
        if (chunk.contentDelta.isNotEmpty) {
          state = state.copyWith(
            streamingContent: (state.streamingContent ?? '') + chunk.contentDelta,
            session: state.session.appendStreamingDelta(chunk.contentDelta),
          );
        }
        if (chunk.isDone) break;
      }

      state = state.copyWith(isLoading: false, streamingContent: null);
    } on OpenAIException catch (e) {
      state = state.copyWith(isLoading: false, error: e.message, streamingContent: null);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString(), streamingContent: null);
    }
  }

  /// Clears the current error.
  void clearError() => state = state.copyWith(error: null);

  /// Resets the chat session.
  void resetSession(ChatSession newSession) => state = ChatState(session: newSession);
}

/// Provider for the chat controller.
final chatControllerProvider = StateNotifierProvider<ChatController, ChatState>((ref) {
  final service = ref.watch(openAIServiceProvider);
  final initialSession = ChatSession.create();
  return ChatController(service, initialSession);
});