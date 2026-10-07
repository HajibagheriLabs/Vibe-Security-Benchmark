// src/email/template-generator.ts
import { escapeHtml } from '../utils/escape-html';
import { sanitizeRichText } from '../utils/sanitize-rich-text';

/**
 * Email notification template generator.
 * 
 * Security decisions:
 * - All user-provided values are HTML-escaped before interpolation (XSS prevention)
 * - Rich text fields are sanitized with an explicit allowlist
 * - URL protocols are validated (http/https only)
 * - No raw HTML from user input is ever interpolated
 */

export interface UserProfileAttributes {
  firstName: string;
  lastName: string;
  email: string;
  displayName?: string;
  company?: string;
  jobTitle?: string;
  bio?: string; // Rich text field - sanitized separately
  websiteUrl?: string;
  avatarUrl?: string;
  preferences?: {
    timezone?: string;
    locale?: string;
    emailFrequency?: 'daily' | 'weekly' | 'monthly';
  };
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export type TemplateType = 'welcome' | 'notification' | 'digest' | 'password-reset';

const TEMPLATE_CONFIGS: Record<TemplateType, { subject: string; layout: string }> = {
  'welcome': {
    subject: 'Welcome to our platform, {firstName}!',
    layout: 'welcome-layout'
  },
  'notification': {
    subject: 'New notification for {firstName}',
    layout: 'notification-layout'
  },
  'digest': {
    subject: 'Your {emailFrequency} digest',
    layout: 'digest-layout'
  },
  'password-reset': {
    subject: 'Password reset requested',
    layout: 'password-reset-layout'
  }
};

/**
 * Validates and sanitizes URL protocols
 * Only allows http and https protocols
 */
function validateUrl(url: string | undefined): string {
  if (!url) return '';
  
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return ''; // Reject javascript:, data:, vbscript:, blob:, etc.
    }
    return url;
  } catch {
    return ''; // Invalid URL
  }
}

/**
 * Escapes all user-provided values for safe HTML interpolation
 */
function escapeUserValue(value: string | undefined): string {
  if (!value) return '';
  return escapeHtml(value);
}

/**
 * Generates an email template with user profile attributes safely interpolated
 */
export function generateEmailTemplate(
  templateType: TemplateType,
  user: UserProfileAttributes
): EmailTemplate {
  const config = TEMPLATE_CONFIGS[templateType];
  
  // Escape all user-provided values
  const escapedUser = {
    firstName: escapeUserValue(user.firstName),
    lastName: escapeUserValue(user.lastName),
    email: escapeUserValue(user.email),
    displayName: escapeUserValue(user.displayName || `${user.firstName} ${user.lastName}`),
    company: escapeUserValue(user.company),
    jobTitle: escapeUserValue(user.jobTitle),
    websiteUrl: validateUrl(user.websiteUrl),
    avatarUrl: validateUrl(user.avatarUrl),
    timezone: escapeUserValue(user.preferences?.timezone),
    locale: escapeUserValue(user.preferences?.locale),
    emailFrequency: escapeUserValue(user.preferences?.emailFrequency || 'daily')
  };
  
  // Sanitize rich text fields (if any)
  const sanitizedBio = user.bio ? sanitizeRichText(user.bio) : '';
  
  // Build subject with escaped values
  const subject = interpolateTemplate(config.subject, escapedUser);
  
  // Build HTML content
  const html = buildHtmlTemplate(templateType, escapedUser, sanitizedBio);
  
  // Build plain text version
  const text = buildTextTemplate(templateType, escapedUser);
  
  return {
    subject,
    html,
    text
  };
}

/**
 * Interpolates template variables with escaped values
 * Uses a safe replacement strategy - no eval or string concatenation of code
 */
function interpolateTemplate(
  template: string,
  values: Record<string, string>
): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return values[key] !== undefined ? values[key] : match;
  });
}

/**
 * Builds HTML template with proper escaping
 * All dynamic content is already escaped before interpolation
 */
function buildHtmlTemplate(
  templateType: TemplateType,
  user: Record<string, string>,
  bio: string
): string {
  // Template structure with safe interpolation
  const templates: Record<TemplateType, string> = {
    'welcome': `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #2c3e50;">Welcome, ${user.firstName}!</h1>
            <p>Hello ${user.displayName},</p>
            <p>Thank you for joining us. We're excited to have you on board.</p>
            ${user.company ? `<p>Company: ${user.company}</p>` : ''}
            ${user.jobTitle ? `<p>Role: ${user.jobTitle}</p>` : ''}
            ${bio ? `<div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 5px;">${bio}</div>` : ''}
            <p style="margin-top: 30px;">Best regards,<br>The Team</p>
          </div>
        </body>
      </html>
    `,
    'notification': `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #2c3e50;">New Notification</h1>
            <p>Hello ${user.firstName},</p>
            <p>You have a new notification on your account.</p>
            <p style="margin-top: 30px;">Best regards,<br>The Team</p>
          </div>
        </body>
      </html>
    `,
    'digest': `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #2c3e50;">Your ${user.emailFrequency} Digest</h1>
            <p>Hello ${user.firstName},</p>
            <p>Here's your ${user.emailFrequency} digest of activity.</p>
            ${user.timezone ? `<p>Timezone: ${user.timezone}</p>` : ''}
            <p style="margin-top: 30px;">Best regards,<br>The Team</p>
          </div>
        </body>
      </html>
    `,
    'password-reset': `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #2c3e50;">Password Reset</h1>
            <p>Hello ${user.firstName},</p>
            <p>A password reset was requested for your account.</p>
            <p>If you did not request this, please ignore this email.</p>
            <p style="margin-top: 30px;">Best regards,<br>The Team</p>
          </div>
        </body>
      </html>
    `
  };
  
  return templates[templateType];
}

/**
 * Builds plain text version for email clients that don't support HTML
 */
function buildTextTemplate(
  templateType: TemplateType,
  user: Record<string, string>
): string {
  const templates: Record<TemplateType, string> = {
    'welcome': `Welcome, ${user.firstName}!\n\nHello ${user.displayName},\n\nThank you for joining us. We're excited to have you on board.\n\nBest regards,\nThe Team`,
    'notification': `New Notification\n\nHello ${user.firstName},\n\nYou have a new notification on your account.\n\nBest regards,\nThe Team`,
    'digest': `Your ${user.emailFrequency} Digest\n\nHello ${user.firstName},\n\nHere's your ${user.emailFrequency} digest of activity.\n\nBest regards,\nThe Team`,
    'password-reset': `Password Reset\n\nHello ${user.firstName},\n\nA password reset was requested for your account.\n\nIf you did not request this, please ignore this email.\n\nBest regards,\nThe Team`
  };
  
  return templates[templateType];
}