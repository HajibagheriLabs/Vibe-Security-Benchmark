import { z } from 'zod';
import { sanitize } from 'dompurify'; // Assuming DOMPurify is available or a similar lib
import { createFilter } from './html-filter'; // Internal filter based on §3 (XSS)

// Schema for user profile attributes (Source: §2 - Client is hostile)
const UserProfileSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  company: z.string().max(100).optional(),
  joinDate: z.coerce.date().optional(),
  avatarUrl: z.string().url().optional(),
});

// HTML Template String
// Uses {{key}} syntax for interpolation.
// Values are expected to be HTML-safe strings.
const DEFAULT_TEMPLATE = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome</title>
</head>
<body style="font-family: sans-serif; line-height: 1.5; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1>Welcome, {{name}}!</h1>
    <p>Thank you for joining <strong>{{company}}</strong>.</p>
    <p>Your account was created on {{joinDate}}.</p>
    {{#if avatarUrl}}
      <img src="{{avatarUrl}}" alt="Profile" style="border-radius: 50%; width: 50px; height: 50px;">
    {{/if}}
    <hr>
    <p style="font-size: 0.8em; color: #666;">
      Sent to {{email}}
    </p>
  </div>
</body>
</html>
`;

/**
 * Sanitizes a string for HTML attribute or text context.
 * Strips control chars (CRLF) and escapes dangerous entities.
 */
function sanitizeValue(value) {
  if (typeof value !== 'string') return String(value ?? '');
  
  // Strip \r, \n, U+2028, U+2029 (Source: §3 - Logging/XSS)
  return value
    .replace(/\r/g, '')
    .replace(/\n/g, '')
    .replace(/\u2028/g, '')
    .replace(/\u2029/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Generates an email notification by interpolating user profile attributes
 * into an HTML template.
 *
 * @param {Object} template - The raw HTML template string.
 * @param {Object} profile - The validated user profile object.
 * @returns {string} The interpolated HTML string.
 */
export function generateEmailNotification(template, profile) {
  // 1. Validate Schema (Source: §3 - Injection)
  const parsedProfile = UserProfileSchema.parse(profile);

  // 2. Prepare Context
  // We only interpolate known safe fields.
  const context = {
    name: sanitizeValue(parsedProfile.name),
    email: sanitizeValue(parsedProfile.email),
    company: sanitizeValue(parsedProfile.company ?? 'Company'),
    joinDate: parsedProfile.joinDate 
      ? parsedProfile.joinDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : 'N/A',
    avatarUrl: parsedProfile.avatarUrl 
      ? sanitizeValue(parsedProfile.avatarUrl) 
      : null,
  };

  // 3. Interpolate
  // Simple regex replacement for {{key}}
  // Note: For complex logic (if/else), a template engine like handlebars is preferred,
  // but for this spec, we implement the interpolation logic manually to avoid dependency bloat (§4).
  
  let html = template;

  // Replace simple variables
  Object.keys(context).forEach(key => {
    const placeholder = `{{${key}}}`;
    const value = context[key] ?? '';
    html = html.split(placeholder).join(value);
  });

  // Handle simple conditional blocks: {{#if key}}...{{/if}}
  // This is a basic implementation; production apps should use a proper parser.
  html = html.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, key, content) => {
    if (context[key] && context[key] !== '' && context[key] !== 'N/A') {
      return content;
    }
    return '';
  });

  // 4. Final Sanitization (Source: §3 - XSS)
  // Ensure no innerHTML vulnerabilities or script injection via attributes.
  // We use DOMPurify if available, otherwise a basic filter.
  try {
    html = sanitize(html, {
      ADD_ATTR: ['src', 'alt'], // Allow img attributes
      ALLOWED_TAGS: ['h1', 'h2', 'h3', 'p', 'strong', 'em', 'hr', 'img', 'div', 'span', 'body', 'html', 'head', 'meta', 'title'],
      ALLOWED_PROTOCOLS: ['http', 'https'],
    });
  } catch (e) {
    // Fallback if DOMPurify fails or is missing
    html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  }

  return html;
}

// Example Usage (Self-Audit: Negative Path Test)
const testProfile = {
  name: '<script>alert("xss")</script>',
  email: 'user@example.com',
  company: "Acme Corp",
  joinDate: new Date(),
  avatarUrl: 'https://example.com/avatar.jpg'
};

// Output will have <script> tags escaped in the name field
const result = generateEmailNotification(DEFAULT_TEMPLATE, testProfile);
console.log(result);