import 'package:flutter/foundation.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

import '../services/openai_service.dart';

part 'chat_session.freezed.dart';
part 'chat_session.g.dart';

/// Represents a chat session with message history and metadata.
@freezed
class ChatSession with _$ChatSession {
  const factory ChatSession({
    required String id,
    required String title,
    required List<ChatMessage> messages,
    required DateTime createdAt,
    required DateTime updatedAt,
    @Default({}) Map<String, dynamic> metadata,
  }) = _ChatSession;

  factory ChatSession.fromJson(Map<String, dynamic> json) => _$ChatSessionFromJson(json);

  /// Creates a new empty chat session.
  factory ChatSession.create({String? title}) => ChatSession(
        id: UniqueKey().toString(),
        title: title ?? 'New Chat',
        messages: [],
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );
}

/// Extension methods for ChatSession.
extension ChatSessionX on ChatSession {
  /// Returns a new session with the user message added.
  ChatSession addUserMessage(String content) => copyWith(
        messages: [...messages, ChatMessage.user(content)],
        updatedAt: DateTime.now(),
      );

  /// Returns a new session with the assistant message added.
  ChatSession addAssistantMessage(String content) => copyWith(
        messages: [...messages, ChatMessage.assistant(content)],
        updatedAt: DateTime.now(),
      );

  /// Returns a new session with a streaming delta appended to the last assistant message.
  ChatSession appendStreamingDelta(String delta) {
    if (messages.isEmpty || messages.last.role != 'assistant') {
      return addAssistantMessage(delta);
    }
    final lastMessage = messages.last;
    final updatedMessages = [
      ...messages.sublist(0, messages.length - 1),
      ChatMessage.assistant(lastMessage.content + delta),
    ];
    return copyWith(messages: updatedMessages, updatedAt: DateTime.now());
  }

  /// Returns the message history formatted for the API (excluding metadata-only messages).
  List<ChatMessage> get apiMessages => messages.where((m) => m.content.isNotEmpty).toList();

  /// Generates a title from the first user message.
  String generateTitle({int maxLength = 50}) {
    final firstUserMessage = messages.firstWhere(
      (m) => m.role == 'user',
      orElse: () => ChatMessage.user(''),
    );
    if (firstUserMessage.content.isEmpty) return title;
    final truncated = firstUserMessage.content.length > maxLength
        ? '${firstUserMessage.content.substring(0, maxLength)}...'
        : firstUserMessage.content;
    return truncated.replaceAll('\n', ' ').trim();
  }
}