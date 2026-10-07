// lib/email/notification-service.ts
import { generateEmail, setAppConfig, validateCustomTemplate, type UserProfile } from './notification-template';
import { z } from 'zod';

// Email sending interface (to be implemented with your email provider)
export interface EmailSender {
  send(to: string, subject: string, htmlBody: string, textBody: string): Promise<{ success: boolean; messageId?: string; error?: string }>;
}

// Notification service - server-side only
export class NotificationService {
  private emailSender: EmailSender;
  private rateLimitMap = new Map<string, { count: number; resetAt: number }>();
  
  constructor(emailSender: EmailSender) {
    this.emailSender = emailSender;
  }
  
  /**
   * Sends a templated email to a user.
   * Rate limited per recipient.
   */
  async sendTemplatedEmail(
    templateName: string,
    userProfile: UserProfile,
    additionalVars: Record<string, string> = {}
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // Rate limiting: max 10 emails per hour per recipient
    const rateLimitKey = userProfile.email;
    const now = Date.now();
    const windowMs = 60 * 60 * 1000; // 1 hour
    
    const current = this.rateLimitMap.get(rateLimitKey);
    if (current && current.resetAt > now) {
      if (current.count >= 10) {
        return { success: false, error: 'Rate limit exceeded for recipient' };
      }
      current.count++;
    } else {
      this.rateLimitMap.set(rateLimitKey, { count: 1, resetAt: now + windowMs });
    }
    
    // Generate email content
    const { subject, htmlBody, textBody } = generateEmail(templateName, userProfile, additionalVars);
    
    // Send email
    return this.emailSender.send(userProfile.email, subject, htmlBody, textBody);
  }
  
  /**
   * Sends a custom notification (validated template).
   * Admin-only operation - template validated server-side.
   */
  async sendCustomNotification(
    template: { subject: string; htmlBody: string; textBody?: string },
    userProfile: UserProfile
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // Validate template for safety
    const validation = validateCustomTemplate(template);
    if (!validation.valid) {
      return { success: false, error: `Template validation failed: ${validation.errors.join(', ')}` };
    }
    
    // Rate limiting
    const rateLimitKey = userProfile.email;
    const now = Date.now();
    const windowMs = 60 * 60 * 1000;
    
    const current = this.rateLimitMap.get(rateLimitKey);
    if (current && current.resetAt > now) {
      if (current.count >= 10) {
        return { success: false, error: 'Rate limit exceeded for recipient' };
      }
      current.count++;
    } else {
      this.rateLimitMap.set(rateLimitKey, { count: 1, resetAt: now + windowMs });
    }
    
    // Send with pre-validated template (no interpolation needed)
    return this.emailSender.send(userProfile.email, template.subject, template.htmlBody, template.textBody || '');
  }
}

// Request schema for API endpoint
export const SendEmailRequestSchema = z.object({
  templateName: z.enum(['welcome', 'passwordReset', 'notification']),
  userId: z.string().uuid(), // Will be verified against session
  additionalVars: z.record(z.string()).optional(),
});

export type SendEmailRequest = z.infer<typeof SendEmailRequestSchema>;