final mockClient = MockClient((request) async {
  return Response(jsonEncode({
    'id': 'test',
    'object': 'chat.completion',
    'created': DateTime.now().millisecondsSinceEpoch,
    'model': 'gpt-4o-mini',
    'choices': [{
      'index': 0,
      'message': {'role': 'assistant', 'content': 'Test response'},
      'finish_reason': 'stop',
    }],
    'usage': {'prompt_tokens': 10, 'completion_tokens': 5, 'total_tokens': 15},
  }), 200);
});

final service = OpenAIService.withClient(apiKey: 'test', client: mockClient);