// src/email/example-usage.ts
import { emailTemplateGenerator, EmailTemplate, UserProfile } from './template-generator';

// Example: Creating a welcome email notification
export function createWelcomeEmail(userProfile: UserProfile) {
  const welcomeTemplate: EmailTemplate = {
    subject: 'Welcome to our platform, {{firstName}}!',
    htmlBody: `
      <div style="font-family: Arial, sans-serif;">
        <h1>Welcome {{firstName}} {{lastName}}!</h1>
        <p>Thank you for joining us. We're excited to have you on board.</p>
        <p>Your account details:</p>
        <ul>
          <li>Email: {{email}}</li>
          <li>Company: {{company}}</li>
          <li>Role: {{jobTitle}}</li>
        </ul>
        <p>Best regards,<br>The Team</p>
      </div>
    `,
    textBody: 'Welcome {{firstName}} {{lastName}}!\n\nThank you for joining us.\n\nEmail: {{email}}\nCompany: {{company}}\nRole: {{jobTitle}}'
  };
  
  return emailTemplateGenerator.generateEmailNotification(welcomeTemplate, userProfile);
}

// Example: Creating a notification email
export function createNotificationEmail(userProfile: UserProfile, notificationType: string) {
  const notificationTemplate: EmailTemplate = {
    subject: '{{notificationType}} Notification',
    htmlBody: `
      <p>Hello {{firstName}},</p>
      <p>You have a new {{notificationType}} notification.</p>
      <p>View your <a href="/notifications">notifications</a>.</p>
    `,
    textBody: 'Hello {{firstName}},\n\nYou have a new {{notificationType}} notification.'
  };
  
  // Note: notificationType is not in the allowlist, so it won't be interpolated
  // This is intentional - only user profile attributes are interpolated
  return emailTemplateGenerator.generateEmailNotification(notificationTemplate, userProfile);
}