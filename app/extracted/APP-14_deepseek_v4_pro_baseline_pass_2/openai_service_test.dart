import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'openai_service.dart';

void main() {
  group('OpenAIService', () {
    late MockClient mockClient;
    late OpenAIService service;

    setUp(() {
      mockClient = MockClient((request) async {
        return http.Response('{}', 500);
      });
      service = OpenAIService(
        apiKey: 'test-api-key',
        httpClient: mockClient,
      );
    });

    tearDown(() {
      service.dispose();
    });

    test('createChatCompletion returns parsed response on success', () async {
      final mockResponse = {
        'id': 'chatcmpl-123',
        'object': 'chat.completion',
        'created': 1677652288,
        'model': 'gpt-4o-mini',
        'choices': [
          {
            'index': 0,
            'message': {
              'role': 'assistant',
              'content': 'Hello! How can I help you?',
            },
            'finish_reason': 'stop',
          }
        ],
        'usage': {
          'prompt_tokens': 10,
          'completion_tokens': 8,
          'total_tokens': 18,
        },
      };

      mockClient = MockClient((request) async {
        expect(request.url.path, '/v1/chat/completions');
        expect(request.headers['Authorization'], 'Bearer test-api-key');
        expect(request.headers['Content-Type'], 'application/json');

        final body = jsonDecode(request.body) as Map<String, dynamic>;
        expect(body['model'], 'gpt-4o-mini');
        expect(body['messages'], isA<List<dynamic>>());

        return http.Response(
          jsonEncode(mockResponse),
          200,
          headers: {'Content-Type': 'application/json'},
        );
      });

      service = OpenAIService(
        apiKey: 'test-api-key',
        httpClient: mockClient,
      );

      final response = await service.createChatCompletion(
        const ChatCompletionRequest(
          model: 'gpt-4o-mini',
          messages: [
            ChatMessage(role: 'user', content: 'Hi there!'),
          ],
        ),
      );

      expect(response.id, 'chatcmpl-123');
      expect(response.choices.length, 1);
      expect(response.choices.first.message.content,
          'Hello! How can I help you?');
      expect(response.usage?.totalTokens, 18);
    });

    test('createChatCompletion throws OpenAIException on API error', () async {
      mockClient = MockClient((request) async {
        return http.Response(
          jsonEncode({
            'error': {
              'message': 'Invalid API key provided',
              'type': 'invalid_request_error',
            }
          }),
          401,
          headers: {'Content-Type': 'application/json'},
        );
      });

      service = OpenAIService(
        apiKey: 'invalid-key',
        httpClient: mockClient,
      );

      expect(
        () => service.createChatCompletion(
          const ChatCompletionRequest(
            model: 'gpt-4o-mini',
            messages: [
              ChatMessage(role: 'user', content: 'Hello'),
            ],
          ),
        ),
        throwsA(
          isA<OpenAIException>()
              .having((e) => e.statusCode, 'statusCode', 401)
              .having((e) => e.message, 'message', 'Invalid API key provided')
              .having(
                  (e) => e.errorType, 'errorType', 'invalid_request_error'),
        ),
      );
    });

    test('completeText returns assistant response string', () async {
      mockClient = MockClient((request) async {
        final mockResponse = {
          'id': 'chatcmpl-456',
          'object': 'chat.completion',
          'created': 1677652288,
          'model': 'gpt-4o-mini',
          'choices': [
            {
              'index': 0,
              'message': {
                'role': 'assistant',
                'content': 'The capital of France is Paris.',
              },
              'finish_reason': 'stop',
            }
          ],
        };

        return http.Response(
          jsonEncode(mockResponse),
          200,
          headers: {'Content-Type': 'application/json'},
        );
      });

      service = OpenAIService(
        apiKey: 'test-api-key',
        httpClient: mockClient,
      );

      final result = await service.completeText(
        'What is the capital of France?',
      );

      expect(result, 'The capital of France is Paris.');
    });

    test('listModels returns model IDs', () async {
      mockClient = MockClient((request) async {
        expect(request.url.path, '/v1/models');
        expect(request.method, 'GET');

        return http.Response(
          jsonEncode({
            'object': 'list',
            'data': [
              {'id': 'gpt-4o-mini', 'object': 'model', 'created': 1677610602},
              {'id': 'gpt-4', 'object': 'model', 'created': 1677610602},
              {'id': 'gpt-3.5-turbo', 'object': 'model', 'created': 1677610602},
            ],
          }),
          200,
          headers: {'Content-Type': 'application/json'},
        );
      });

      service = OpenAIService(
        apiKey: 'test-api-key',
        httpClient: mockClient,
      );

      final models = await service.listModels();

      expect(models, ['gpt-4o-mini', 'gpt-4', 'gpt-3.5-turbo']);
    });

    test('includes organization header when organizationId is provided',
        () async {
      mockClient = MockClient((request) async {
        expect(
          request.headers['OpenAI-Organization'],
          'org-test-123',
        );

        return http.Response(
          jsonEncode({
            'id': 'chatcmpl-789',
            'object': 'chat.completion',
            'created': 1677652288,
            'model': 'gpt-4o-mini',
            'choices': [],
          }),
          200,
          headers: {'Content-Type': 'application/json'},
        );
      });

      service = OpenAIService(
        apiKey: 'test-api-key',
        organizationId: 'org-test-123',
        httpClient: mockClient,
      );

      await service.createChatCompletion(
        const ChatCompletionRequest(
          model: 'gpt-4o-mini',
          messages: [
            ChatMessage(role: 'user', content: 'Test'),
          ],
        ),
      );
    });

    test('throws OpenAIException when response body is not valid JSON',
        () async {
      mockClient = MockClient((request) async {
        return http.Response('Not JSON', 200);
      });

      service = OpenAIService(
        apiKey: 'test-api-key',
        httpClient: mockClient,
      );

      expect(
        () => service.createChatCompletion(
          const ChatCompletionRequest(
            model: 'gpt-4o-mini',
            messages: [
              ChatMessage(role: 'user', content: 'Test'),
            ],
          ),
        ),
        throwsA(
          isA<OpenAIException>()
              .having((e) => e.statusCode, 'statusCode', 200)
              .having((e) => e.errorType, 'errorType', 'invalid_json'),
        ),
      );
    });

    test('throws OpenAIException on network error', () async {
      mockClient = MockClient((request) async {
        throw http.ClientException('Connection refused');
      });

      service = OpenAIService(
        apiKey: 'test-api-key',
        httpClient: mockClient,
      );

      expect(
        () => service.createChatCompletion(
          const ChatCompletionRequest(
            model: 'gpt-4o-mini',
            messages: [
              ChatMessage(role: 'user', content: 'Test'),
            ],
          ),
        ),
        throwsA(
          isA<OpenAIException>()
              .having((e) => e.statusCode, 'statusCode', 0)
              .having((e) => e.errorType, 'errorType', 'network_error'),
        ),
      );
    });
  });
}