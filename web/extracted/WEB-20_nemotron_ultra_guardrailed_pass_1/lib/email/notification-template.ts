// lib/email/notification-template.ts
import { escapeHtml } from '@/lib/security/html-escape';
import { z } from 'zod';

// User profile schema - only allow known safe fields
const UserProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string().max(100),
  lastName: z.string().max(100),
  displayName: z.string().max(100).optional(),
  preferences: z.object({
    language: z.enum(['en', 'es', 'fr', 'de']).default('en'),
    timezone: z.string().max(50).default('UTC'),
  }).optional(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

// Template definition schema
const TemplateSchema = z.object({
  subject: z.string().max(200),
  htmlBody: z.string().max(50000),
  textBody: z.string().max(50000).optional(),
});

export type EmailTemplate = z.infer<typeof TemplateSchema>;

// Pre-defined safe templates (allowlist approach)
const TEMPLATES: Record<string, EmailTemplate> = {
  welcome: {
    subject: 'Welcome to {{appName}}, {{firstName}}!',
    htmlBody: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #f8f9fa; border-radius: 8px; padding: 30px;">
            <h1 style="color: #2c3e50; margin-top: 0;">Welcome to {{appName}}, {{firstName}}!</h1>
            <p>Hi {{firstName}},</p>
            <p>Thank you for joining {{appName}}. We're excited to have you on board!</p>
            <p>Your account has been created with email: <strong>{{email}}</strong></p>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
              <p style="color: #6c757d; font-size: 14px; margin: 0;">
                If you have any questions, reply to this email or visit our <a href="{{supportUrl}}" style="color: #007bff;">help center</a>.
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
    textBody: `
Welcome to {{appName}}, {{firstName}}!

Hi {{firstName}},

Thank you for joining {{appName}}. We're excited to have you on board!

Your account has been created with email: {{email}}

If you have any questions, reply to this email or visit our help center at {{supportUrl}}.
    `,
  },
  passwordReset: {
    subject: 'Reset your {{appName}} password',
    htmlBody: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #f8f9fa; border-radius: 8px; padding: 30px;">
            <h1 style="color: #2c3e50; margin-top: 0;">Reset Your Password</h1>
            <p>Hi {{firstName}},</p>
            <p>You requested a password reset for your {{appName}} account ({{email}}).</p>
            <p>Click the button below to set a new password. This link expires in 1 hour.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{resetUrl}}" style="background: #007bff; color: white; padding: 14px 28px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a>
            </div>
            <p style="color: #6c757d; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
              <p style="color: #6c757d; font-size: 14px; margin: 0;">
                Need help? Contact our <a href="{{supportUrl}}" style="color: #007bff;">support team</a>.
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
    textBody: `
Reset your {{appName}} password

Hi {{firstName}},

You requested a password reset for your {{appName}} account ({{email}}).

Click the link below to set a new password. This link expires in 1 hour:
{{resetUrl}}

If you didn't request this, you can safely ignore this email.

Need help? Contact our support team at {{supportUrl}}.
    `,
  },
  notification: {
    subject: '{{appName}}: {{notificationTitle}}',
    htmlBody: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>{{notificationTitle}}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #f8f9fa; border-radius: 8px; padding: 30px;">
            <h1 style="color: #2c3e50; margin-top: 0;">{{notificationTitle}}</h1>
            <p>Hi {{firstName}},</p>
            <div style="white-space: pre-wrap;">{{notificationMessage}}</div>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
              <p style="color: #6c757d; font-size: 14px; margin: 0;">
                You're receiving this because you have notifications enabled. 
                <a href="{{preferencesUrl}}" style="color: #007bff;">Manage preferences</a>
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
    textBody: `
{{notificationTitle}}

Hi {{firstName}},

{{notificationMessage}}

You're receiving this because you have notifications enabled. Manage preferences at {{preferencesUrl}}.
    `,
  },
};

// Allowed interpolation keys - strict allowlist
const ALLOWED_KEYS = new Set([
  'appName',
  'firstName',
  'lastName',
  'displayName',
  'email',
  'supportUrl',
  'resetUrl',
  'preferencesUrl',
  'notificationTitle',
  'notificationMessage',
  'language',
  'timezone',
]);

// Configuration for the application
interface AppConfig {
  appName: string;
  supportUrl: string;
  baseUrl: string;
}

let appConfig: AppConfig = {
  appName: 'Application',
  supportUrl: 'https://example.com/support',
  baseUrl: 'https://example.com',
};

export function setAppConfig(config: Partial<AppConfig>): void {
  appConfig = { ...appConfig, ...config };
}

/**
 * Safely interpolates template variables with HTML escaping.
 * Only allows pre-defined keys and escapes all values.
 */
function interpolateTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    // Only allow keys from the allowlist
    if (!ALLOWED_KEYS.has(key)) {
      console.warn(`[email-template] Blocked interpolation of non-allowlisted key: ${key}`);
      return match; // Return original placeholder
    }
    
    const value = variables[key];
    if (value === undefined) {
      return match; // Keep placeholder if value not provided
    }
    
    // HTML escape all interpolated values
    return escapeHtml(value);
  });
}

/**
 * Generates a personalized email from a template name and user profile.
 * All user data is HTML-escaped before interpolation.
 */
export function generateEmail(
  templateName: string,
  userProfile: UserProfile,
  additionalVars: Record<string, string> = {}
): { subject: string; htmlBody: string; textBody: string } {
  // Validate user profile
  const validatedProfile = UserProfileSchema.parse(userProfile);
  
  // Get template
  const template = TEMPLATES[templateName];
  if (!template) {
    throw new Error(`Template not found: ${templateName}`);
  }
  
  // Build interpolation variables with defaults
  const variables: Record<string, string> = {
    appName: appConfig.appName,
    supportUrl: appConfig.supportUrl,
    firstName: validatedProfile.firstName,
    lastName: validatedProfile.lastName,
    displayName: validatedProfile.displayName || validatedProfile.firstName,
    email: validatedProfile.email,
    language: validatedProfile.preferences?.language || 'en',
    timezone: validatedProfile.preferences?.timezone || 'UTC',
    ...additionalVars,
  };
  
  // Validate additional vars only contain allowed keys
  for (const key of Object.keys(additionalVars)) {
    if (!ALLOWED_KEYS.has(key)) {
      throw new Error(`Invalid template variable: ${key}`);
    }
  }
  
  // Interpolate with escaping
  const subject = interpolateTemplate(template.subject, variables);
  const htmlBody = interpolateTemplate(template.htmlBody, variables);
  const textBody = template.textBody 
    ? interpolateTemplate(template.textBody, variables)
    : htmlBody.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  
  return { subject, htmlBody, textBody };
}

/**
 * Validates a custom template (for admin use only - server-side)
 * Ensures no dangerous patterns exist
 */
export function validateCustomTemplate(template: EmailTemplate): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check for dangerous patterns
  const dangerousPatterns = [
    /<script\b/i,
    /on\w+\s*=/i,           // Event handlers
    /javascript:/i,         // javascript: URLs
    /data:/i,               // data: URLs
    /vbscript:/i,           // vbscript: URLs
    /expression\s*\(/i,     // CSS expressions
    /@import/i,             // CSS imports
    /<iframe/i,             // iframes
    /<object/i,             // objects
    /<embed/i,              // embeds
    /<form/i,               // forms
    /<input/i,              // inputs
    /<textarea/i,           // textareas
    /<select/i,             // selects
    /<button/i,             // buttons
  ];
  
  const checkContent = (content: string, fieldName: string) => {
    for (const pattern of dangerousPatterns) {
      if (pattern.test(content)) {
        errors.push(`${fieldName}: Contains potentially dangerous pattern: ${pattern.source}`);
      }
    }
  };
  
  checkContent(template.subject, 'subject');
  checkContent(template.htmlBody, 'htmlBody');
  if (template.textBody) {
    checkContent(template.textBody, 'textBody');
  }
  
  // Validate subject length
  if (template.subject.length > 200) {
    errors.push('Subject exceeds 200 characters');
  }
  
  // Validate body lengths
  if (template.htmlBody.length > 50000) {
    errors.push('HTML body exceeds 50000 characters');
  }
  
  return { valid: errors.length === 0, errors };
}