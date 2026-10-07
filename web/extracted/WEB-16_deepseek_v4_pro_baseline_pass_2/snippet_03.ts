// app/api/test-webhook/README.md
# Webhook Tester API

## Endpoint
`POST /api/test-webhook`

## Request Body

```json
{
  "targetUrl": "https://example.com/webhook",
  "method": "POST",
  "headers": {
    "Authorization": "Bearer token123",
    "X-Custom-Header": "value"
  },
  "payload": {
    "event": "user.created",
    "data": {
      "id": 123,
      "name": "John Doe"
    }
  },
  "timeout": 10000
}