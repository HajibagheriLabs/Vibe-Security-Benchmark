import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:mocktail/mocktail.dart';
import 'package:openai_service_example/services/openai_service.dart';

class MockHttpClient extends Mock implements http.Client {}

class MockSecureStorage extends Mock implements FlutterSecureStorage {}

void main() {
  late OpenAIService service;
  late MockHttpClient mockClient;
  late MockSecureStorage mockStorage;

  setUp(() {
    mockClient = MockHttpClient();
    mockStorage = MockSecureStorage();
    service = OpenAIService(
      _storage: mockStorage,
      _client: mockClient,
    );
  });

  test('throws exception if token is missing', () async {
    when(() => mockStorage.read(key: any(named: 'key')))
        .thenAnswer((_) async => null);

    expect(
      () => service.chat(model: 'gpt-3.5-turbo', messages: []),
      throwsException,
    );
  });

  test('returns parsed response on success', () async {
    const token = 'sk-test-token';
    final responseJson = {
      'id': 'chatcmpl-123',
      'object': 'chat.completion',
      'created': 1677652288,
      'model': 'gpt-3.5-turbo',
      'choices': [
        {
          'index': 0,
          'message': {
            'role': 'assistant',
            'content': 'Hello!',
          },
          'finish_reason': 'stop',
        }
      ],
      'usage': {'prompt_tokens': 9, 'completion_tokens': 12, 'total_tokens': 21},
    };

    when(() => mockStorage.read(key: 'openai_access_token'))
        .thenAnswer((_) async => token);

    when(
      () => mockClient.post(
        any(),
        headers: any(named: 'headers'),
        body: any(named: 'body'),
      ),
    ).thenAnswer(
      (_) async => http.Response(jsonEncode(responseJson), 200),
    );

    final result = await service.chat(
      model: 'gpt-3.5-turbo',
      messages: [{'role': 'user', 'content': 'Hi'}],
    );

    expect(result, isA<Map<String, dynamic>>());
    expect(result['id'], 'chatcmpl-123');
    verify(() => mockClient.post(any(), headers: any(named: 'headers'))).called(1);
  });
}