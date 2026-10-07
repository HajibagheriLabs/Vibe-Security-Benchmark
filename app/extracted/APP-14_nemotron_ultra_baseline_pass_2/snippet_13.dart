final controller = ref.read(chatControllerProvider.notifier);
await controller.sendMessageStream('Tell me a story');