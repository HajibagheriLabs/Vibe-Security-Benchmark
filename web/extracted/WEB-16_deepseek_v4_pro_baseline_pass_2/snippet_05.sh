curl -X POST http://localhost:3000/api/test-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "targetUrl": "https://webhook.site/your-unique-id",
    "method": "POST",
    "headers": {
      "X-Custom-Header": "test-value"
    },
    "payload": {
      "message": "Hello Webhook!"
    }
  }'