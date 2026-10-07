final service = ref.read(openAIServiceProvider);
final response = await service.sendMessage(
  messages: [
    ChatMessage.system('You are a helpful assistant.'),
    ChatMessage.user('Hello!'),
  ],
);
print(response); // Assistant's reply