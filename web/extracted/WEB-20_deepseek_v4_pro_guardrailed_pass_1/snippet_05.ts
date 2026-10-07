// src/email/README.md
# Email Template Generator

## Security Features

- **XSS Prevention**: All user-provided values are HTML-escaped before interpolation
- **Rich Text Sanitization**: Bio fields are sanitized with explicit tag/attribute allowlists
- **URL Validation**: Only http/https protocols are allowed for URLs
- **No Raw HTML**: User input is never interpolated as raw HTML
- **Plain Text Fallback**: Text version provided for non-HTML email clients

## Usage

```typescript
import { generateEmailTemplate } from './template-generator';

const template = generateEmailTemplate('welcome', {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  // ... other attributes
});

// Send email using your email service
await emailService.send({
  to: user.email,
  subject: template.subject,
  html: template.html,
  text: template.text
});