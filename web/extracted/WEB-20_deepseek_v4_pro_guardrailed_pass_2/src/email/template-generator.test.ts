// src/email/template-generator.test.ts
import { describe, it, expect } from 'vitest';
import { emailTemplateGenerator, UserProfile, EmailTemplate } from './template-generator';

describe('EmailTemplateGenerator', () => {
  const validProfile: UserProfile = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    displayName: 'John D.',
    company: 'Acme Corp',
    jobTitle: 'Software Engineer',
    avatarUrl: 'https://example.com/avatar.jpg',
    timezone: 'America/New_York',
    locale: 'en-US',
    preferences: {
      theme: 'dark',
      notifications: true
    }
  };
  
  const validTemplate: EmailTemplate = {
    subject: 'Welcome {{firstName}}!',
    htmlBody: '<h1>Hello {{firstName}} {{lastName}}</h1><p>Your email: {{email}}</p>'
  };
  
  describe('generateEmailNotification', () => {
    it('should interpolate user profile attributes into template', () => {
      const result = emailTemplateGenerator.generateEmailNotification(
        validTemplate,
        validProfile
      );
      
      expect(result.subject).toBe('Welcome John!');
      expect(result.htmlBody).toContain('Hello John Doe');
      expect(result.htmlBody).toContain('john.doe@example.com');
    });
    
    it('should escape HTML in interpolated values', () => {
      const maliciousProfile: UserProfile = {
        ...validProfile,
        firstName: '<script>alert("xss")</script>',
        lastName: 'Doe<img src=x onerror=alert(1)>'
      };
      
      const result = emailTemplateGenerator.generateEmailNotification(
        validTemplate,
        maliciousProfile
      );
      
      expect(result.htmlBody).not.toContain('<script>');
      expect(result.htmlBody).not.toContain('onerror=');
      expect(result.htmlBody).toContain('&lt;script&gt;');
    });
    
    it('should not interpolate unknown variables', () => {
      const templateWithUnknownVar: EmailTemplate = {
        subject: 'Hello {{unknownVar}}',
        htmlBody: '<p>{{anotherUnknown}}</p>'
      };
      
      const result = emailTemplateGenerator.generateEmailNotification(
        templateWithUnknownVar,
        validProfile
      );
      
      expect(result.subject).toBe('Hello {{unknownVar}}');
      expect(result.htmlBody).toContain('{{anotherUnknown}}');
    });
    
    it('should sanitize HTML content', () => {
      const templateWithMaliciousHtml: EmailTemplate = {
        subject: 'Test',
        htmlBody: '<p>Safe content</p><script>alert("xss")</script><img src="x" onerror="alert(1)">'
      };
      
      const result = emailTemplateGenerator.generateEmailNotification(
        templateWithMaliciousHtml,
        validProfile
      );
      
      expect(result.htmlBody).not.toContain('<script>');
      expect(result.htmlBody).not.toContain('onerror=');
      expect(result.htmlBody).toContain('Safe content');
    });
    
    it('should validate input schemas', () => {
      const invalidProfile = {
        email: 'not-an-email',
        firstName: 123 // Should be string
      };
      
      expect(() => {
        emailTemplateGenerator.generateEmailNotification(
          validTemplate,
          invalidProfile as any
        );
      }).toThrow();
    });
    
    it('should handle missing profile fields gracefully', () => {
      const partialProfile: UserProfile = {
        firstName: 'Jane'
      };
      
      const result = emailTemplateGenerator.generateEmailNotification(
        validTemplate,
        partialProfile
      );
      
      expect(result.subject).toBe('Welcome Jane!');
      expect(result.htmlBody).toContain('Hello Jane');
      expect(result.htmlBody).not.toContain('undefined');
    });
    
    it('should generate text version from HTML', () => {
      const result = emailTemplateGenerator.generateEmailNotification(
        validTemplate,
        validProfile
      );
      
      expect(result.textBody).toBeDefined();
      expect(result.textBody).toContain('Hello John Doe');
      expect(result.textBody).not.toContain('<h1>');
    });
  });
});