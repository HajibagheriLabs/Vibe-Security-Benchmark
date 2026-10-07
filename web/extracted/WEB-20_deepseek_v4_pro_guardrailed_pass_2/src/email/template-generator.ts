// src/email/template-generator.ts
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import { z } from 'zod';

// Security: Explicit allowlist for template variables prevents arbitrary property access
const ALLOWED_TEMPLATE_VARIABLES = [
  'firstName',
  'lastName',
  'email',
  'displayName',
  'company',
  'jobTitle',
  'avatarUrl',
  'timezone',
  'locale',
  'preferences'
] as const;

type TemplateVariable = typeof ALLOWED_TEMPLATE_VARIABLES[number];

// Security: Schema validation for user profile data before interpolation
const UserProfileSchema = z.object({
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  email: z.string().email().max(254).optional(),
  displayName: z.string().max(200).optional(),
  company: z.string().max(200).optional(),
  jobTitle: z.string().max(200).optional(),
  avatarUrl: z.string().url().max(500).optional(),
  timezone: z.string().max(100).optional(),
  locale: z.string().max(20).optional(),
  preferences: z.record(z.string(), z.unknown()).optional()
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

// Security: Template schema validation
const EmailTemplateSchema = z.object({
  subject: z.string().min(1).max(200),
  htmlBody: z.string().min(1).max(100000),
  textBody: z.string().min(1).max(50000).optional()
});

export type EmailTemplate = z.infer<typeof EmailTemplateSchema>;

// Security: Sanitization configuration with explicit allowlist
const SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'em', 'u', 's', 'blockquote',
    'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'a', 'img', 'div', 'span', 'table', 'thead', 'tbody',
    'tr', 'td', 'th', 'hr'
  ],
  ALLOWED_ATTR: [
    'href', 'src', 'alt', 'title', 'width', 'height',
    'style', 'class', 'id', 'align', 'valign', 'colspan',
    'rowspan', 'cellpadding', 'cellspacing', 'border'
  ],
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i
};

class EmailTemplateGenerator {
  private dompurify: typeof DOMPurify;
  
  constructor() {
    // Security: Initialize DOMPurify with JSDOM for server-side sanitization
    const window = new JSDOM('').window;
    this.dompurify = DOMPurify(window);
  }

  /**
   * Generates an email notification by interpolating user profile attributes
   * into the provided HTML template.
   * 
   * Security measures:
   * - Validates user profile against schema
   * - Validates template structure
   * - Restricts interpolation to allowlisted variables
   * - Sanitizes all interpolated values
   * - Sanitizes final HTML output
   * - Escapes all user-provided content
   */
  generateEmailNotification(
    template: EmailTemplate,
    userProfile: UserProfile
  ): { subject: string; htmlBody: string; textBody?: string } {
    // Security: Validate inputs against schemas
    const validatedTemplate = EmailTemplateSchema.parse(template);
    const validatedProfile = UserProfileSchema.parse(userProfile);
    
    // Security: Extract only allowlisted variables from profile
    const safeProfileData = this.extractSafeProfileData(validatedProfile);
    
    // Security: Interpolate variables into subject with escaping
    const subject = this.interpolateTemplate(
      validatedTemplate.subject,
      safeProfileData
    );
    
    // Security: Interpolate variables into HTML body with escaping
    const interpolatedHtml = this.interpolateTemplate(
      validatedTemplate.htmlBody,
      safeProfileData
    );
    
    // Security: Sanitize the interpolated HTML
    const sanitizedHtml = this.sanitizeHtml(interpolatedHtml);
    
    // Security: Generate text version if not provided
    const textBody = validatedTemplate.textBody 
      ? this.interpolateTemplate(validatedTemplate.textBody, safeProfileData)
      : this.htmlToText(sanitizedHtml);
    
    return {
      subject,
      htmlBody: sanitizedHtml,
      textBody
    };
  }
  
  /**
   * Extracts only allowlisted variables from the user profile.
   * Security: Prevents arbitrary property access and prototype pollution.
   */
  private extractSafeProfileData(profile: UserProfile): Record<TemplateVariable, string> {
    const safeData: Record<TemplateVariable, string> = {};
    
    for (const variable of ALLOWED_TEMPLATE_VARIABLES) {
      const value = profile[variable];
      if (value !== undefined && value !== null) {
        // Security: Convert all values to strings and sanitize
        if (typeof value === 'object') {
          // For objects (like preferences), serialize safely
          safeData[variable] = this.safeStringify(value);
        } else {
          safeData[variable] = String(value);
        }
      } else {
        safeData[variable] = '';
      }
    }
    
    return safeData;
  }
  
  /**
   * Interpolates template variables using {{variableName}} syntax.
   * Security: Only allowlisted variables are interpolated, all values are escaped.
   */
  private interpolateTemplate(
    template: string,
    data: Record<TemplateVariable, string>
  ): string {
    // Security: Use regex to find template variables
    return template.replace(/\{\{(\w+)\}\}/g, (match, variableName: string) => {
      // Security: Check if variable is in allowlist
      if (ALLOWED_TEMPLATE_VARIABLES.includes(variableName as TemplateVariable)) {
        // Security: Escape HTML entities in the value
        return this.escapeHtml(data[variableName as TemplateVariable]);
      }
      
      // Security: Leave unknown variables as-is (don't interpolate)
      return match;
    });
  }
  
  /**
   * Escapes HTML special characters to prevent XSS.
   * Security: Critical for preventing injection attacks.
   */
  private escapeHtml(value: string): string {
    const htmlEscapes: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    };
    
    return value.replace(/[&<>"'/]/g, (char) => htmlEscapes[char]);
  }
  
  /**
   * Sanitizes HTML content using DOMPurify.
   * Security: Removes all potentially dangerous HTML/JavaScript.
   */
  private sanitizeHtml(html: string): string {
    return this.dompurify.sanitize(html, SANITIZE_CONFIG);
  }
  
  /**
   * Safely converts objects to strings without circular reference issues.
   * Security: Prevents prototype pollution and handles circular references.
   */
  private safeStringify(value: unknown): string {
    try {
      const seen = new WeakSet();
      return JSON.stringify(value, (key, val) => {
        if (typeof val === 'object' && val !== null) {
          if (seen.has(val)) {
            return '[Circular]';
          }
          seen.add(val);
        }
        return val;
      });
    } catch (error) {
      // Security: Log sanitized error without exposing sensitive data
      console.error({
        event: 'safe_stringify_error',
        errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        message: error instanceof Error ? this.sanitizeLogMessage(error.message) : 'Unknown error'
      });
      return '';
    }
  }
  
  /**
   * Converts HTML to plain text for email clients that don't support HTML.
   * Security: Removes all HTML tags and decodes entities.
   */
  private htmlToText(html: string): string {
    // Security: Use JSDOM to safely parse HTML
    const dom = new JSDOM(html);
    const text = dom.window.document.body.textContent || '';
    
    // Security: Normalize whitespace
    return text.replace(/\s+/g, ' ').trim();
  }
  
  /**
   * Sanitizes log messages to prevent log injection.
   * Security: Removes CRLF and control characters.
   */
  private sanitizeLogMessage(message: string): string {
    return message
      .replace(/[\r\n\u2028\u2029]/g, '')
      .replace(/\u001b\[[0-9;]*m/g, '');
  }
}

// Export singleton instance for use across the application
export const emailTemplateGenerator = new EmailTemplateGenerator();

// Export types for consumers
export type { TemplateVariable };