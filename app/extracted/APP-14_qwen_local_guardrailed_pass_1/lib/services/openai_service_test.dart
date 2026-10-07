import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:mockito/annotations.dart';
import 'package:mockito/mockito';
import 'openai_service_test.mocks.dart';
import 'lib/services/openai_service.dart';

@GenerateMocks([http.Client])
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('OpenAIService', () {
    late MockHttpClient mockHttpClient;
    late OpenAIService service;

    setUp(() {
      mockHttpClient = MockHttpClient();
      service = OpenAIService(
        apiKey: 'test-api-key',
        httpClient: mockHttpClient,
      );
    });

    test('chatCompletion returns content on success', () async {
      final response = http.Response(
        '{"choices":[{"message":{"content":"Hello!"}}]}',
        200,
      );

      when(mockHttpClient.post(any, headers: anyNamed('headers'), body: anyNamed('body')))
          .thenAnswer((_) async => response);

      final result = await service.chatCompletion(
        messages: [
          ChatMessage(role: 'user', content: 'Hi'),
        ],
      );

      expect(result, 'Hello!');
      verify(mockHttpClient.post(
        any,
        headers: anyNamed('headers'),
        body: anyNamed('body'),
      )).called(1);
    });

    test('chatCompletion throws on API error', () async {
      final response = http.Response('{"error":"Invalid API key"}', 401);

      when(mockHttpClient.post(any, headers: anyNamed('headers'), body: anyNamed('body')))
          .thenAnswer((_) async => response);

      expect(
        () => service.chatCompletion(
          messages: [
            ChatMessage(role: 'user', content: 'Hi'),
          ],
        ),
        throwsA(isA<OpenAIException>()),
      );
    });

    test('chatCompletion throws on empty choices', () async {
      final response = http.Response('{"choices":[]}', 200);

      when(mockHttpClient.post(any, headers: anyNamed('headers'), body: anyNamed('body')))
          .thenAnswer((_) async => response);

      expect(
        () => service.chatCompletion(
          messages: [
            ChatMessage(role: 'user', content: 'Hi'),
          ],
        ),
        throwsA(isA<OpenAIException>()),
      );
    });
  });
}