# OpenAI Flutter Client

A production-ready Flutter service for querying the OpenAI Chat Completions API from a mobile client.

## Features

- **Chat Completions**: Full support for OpenAI's `/v1/chat/completions` endpoint
- **Streaming Responses**: Real-time token streaming via Server-Sent Events (SSE)
- **Type-Safe Models**: Freezed/JSON-serializable models for requests and responses
- **Riverpod Integration**: Reactive state management with providers
- **Error Handling**: Comprehensive error types with status codes and error details
- **Secure Configuration**: API key via `--dart-define` at build time

## Setup

1. Add dependencies:
   ```bash
   flutter pub add flutter_riverpod http freezed_annotation json_annotation
   flutter pub add --dev build_runner freezed json_serializable