// lib/email/__tests__/notification-template.test.ts
import { generateEmail, validateCustomTemplate, setAppConfig } from '../notification-template';
import { UserProfile } from '../notification-template';

describe('Email Template Generator', () => {
  const mockUser: UserProfile = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    displayName: 'John D.',
    preferences: {
      language: 'en',
      timezone: 'UTC',
    },
  };
  
  beforeEach(() => {
    setAppConfig({
      appName: 'TestApp',
      supportUrl: 'https://testapp.com/support',
      baseUrl: 'https://testapp.com',
    });
  });
  
  describe('generateEmail', () => {
    it('generates welcome email with escaped values', () => {
      const result = generateEmail('welcome', mockUser);
      
      expect(result.subject).toBe('Welcome to TestApp, John!');
      expect(result.htmlBody).toContain('Welcome to TestApp, John!');
      expect(result.htmlBody).toContain('test@example.com');
      expect(result.htmlBody).toContain('https://testapp.com/support');
    });
    
    it('escapes HTML in user data', () => {
      const maliciousUser: UserProfile = {
        ...mockUser,
        firstName: '<script>alert("xss")</script>',
        lastName: 'Doe',
        email: 'test@example.com',
      };
      
      const result = generateEmail('welcome', maliciousUser);
      
      // Should be escaped, not executed
      expect(result.htmlBody).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
      expect(result.htmlBody).not.toContain('<script>');
    });
    
    it('escapes HTML in additional variables', () => {
      const result = generateEmail('notification', mockUser, {
        notificationTitle: '<img src=x onerror=alert(1)>',
        notificationMessage: 'Hello <b>world</b>',
      });
      
      expect(result.htmlBody).toContain('&lt;img src=x onerror=alert(1)&gt;');
      expect(result.htmlBody).toContain('Hello &lt;b&gt;world&lt;/b&gt;');
    });
    
    it('rejects non-allowlisted additional variables', () => {
      expect(() => generateEmail('welcome', mockUser, { maliciousKey: 'value' }))
        .toThrow('Invalid template variable: maliciousKey');
    });
    
    it('generates password reset email with custom reset URL', () => {
      const result = generateEmail('passwordReset', mockUser, {
        resetUrl: 'https://testapp.com/reset?token=abc123',
      });
      
      expect(result.subject).toBe('Reset your TestApp password');
      expect(result.htmlBody).toContain('https://testapp.com/reset?token=abc123');
      expect(result.textBody).toContain('https://testapp.com/reset?token=abc123');
    });
  });
  
  describe('validateCustomTemplate', () => {
    it('accepts safe templates', () => {
      const template = {
        subject: 'Test Subject',
        htmlBody: '<p>Hello {{firstName}}</p>',
        textBody: 'Hello {{firstName}}',
      };
      
      const result = validateCustomTemplate(template);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    it('rejects templates with script tags', () => {
      const template = {
        subject: 'Test',
        htmlBody: '<script>alert(1)</script>',
      };
      
      const result = validateCustomTemplate(template);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('script'))).toBe(true);
    });
    
    it('rejects templates with event handlers', () => {
      const template = {
        subject: 'Test',
        htmlBody: '<div onclick="alert(1)">Click me</div>',
      };
      
      const result = validateCustomTemplate(template);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('on\\w+'))).toBe(true);
    });
    
    it('rejects templates with javascript: URLs', () => {
      const template = {
        subject: 'Test',
        htmlBody: '<a href="javascript:alert(1)">Link</a>',
      };
      
      const result = validateCustomTemplate(template);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('javascript'))).toBe(true);
    });
    
    it('rejects templates with forms', () => {
      const template = {
        subject: 'Test',
        htmlBody: '<form><input type="text"></form>',
      };
      
      const result = validateCustomTemplate(template);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('form'))).toBe(true);
    });
    
    it('enforces length limits', () => {
      const template = {
        subject: 'a'.repeat(201),
        htmlBody: '<p>Test</p>',
      };
      
      const result = validateCustomTemplate(template);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Subject exceeds'))).toBe(true);
    });
  });
});