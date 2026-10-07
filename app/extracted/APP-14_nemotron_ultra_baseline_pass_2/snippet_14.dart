final params = ChatCompletionParams(
  messages: messages,
  model: 'gpt-4o',
  temperature: 0.7,
  maxTokens: 2000,
  responseFormat: {'type': 'json_object'},
  tools: [
    {
      'type': 'function',
      'function': {
        'name': 'get_weather',
        'description': 'Get current weather',
        'parameters': {
          'type': 'object',
          'properties': {
            'location': {'type': 'string'},
          },
          'required': ['location'],
        },
      },
    },
  ],
);
final response = await service.createChatCompletion(params);