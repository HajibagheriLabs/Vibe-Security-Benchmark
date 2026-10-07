lib/
├── main.dart                      # App entry point
├── models/
│   └── chat_session.dart          # Chat session state (Freezed)
├── providers/
│   └── chat_provider.dart         # Riverpod state management
└── services/
    ├── openai_service.dart        # Core API client
    └── openai_service_provider.dart # Riverpod providers