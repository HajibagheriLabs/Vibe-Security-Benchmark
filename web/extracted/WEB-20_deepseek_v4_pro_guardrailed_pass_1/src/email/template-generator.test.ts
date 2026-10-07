// src/email/template-generator.test.ts
import { generateEmailTemplate } from './template-generator';

describe('Email Template Generator', () => {
  const testUser = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    displayName: 'John D',
    company: 'ACME Corp',
    jobTitle: 'Software Engineer',
    bio: '<p>Hello <strong>World</strong></p><script>alert("xss")</script>',
    websiteUrl: 'https://example.com',
    avatarUrl: 'javascript:alert("xss")',
    preferences: {
      timezone: 'America/New_York',
      locale: 'en-US',
      emailFrequency: 'weekly'
    }
  };
  
  test('should escape HTML in user attributes', () => {
    const maliciousUser = {
      ...testUser,
      firstName: '<script>alert("xss")</script>',
      company: '<img src=x onerror=alert(1)>'
    };
    
    const template = generateEmailTemplate('welcome', maliciousUser);
    
    expect(template.html).not.toContain('<script>alert("xss")</script>');
    expect(template.html).toContain('&lt;script&gt;');
    expect(template.html).not.toContain('<img src=x onerror=alert(1)>');
  });
  
  test('should sanitize rich text content', () => {
    const template = generateEmailTemplate('welcome', testUser);
    
    expect(template.html).toContain('<strong>World</strong>');
    expect(template.html).not.toContain('<script>');
    expect(template.html).not.toContain('alert("xss")');
  });
  
  test('should reject unsafe URL protocols', () => {
    const template = generateEmailTemplate('welcome', testUser);
    
    expect(template.html).not.toContain('javascript:');
    expect(template.html).not.toContain('alert("xss")');
  });
  
  test('should generate subject with escaped values', () => {
    const template = generateEmailTemplate('welcome', testUser);
    
    expect(template.subject).toBe('Welcome to our platform, John!');
  });
  
  test('should handle missing optional fields', () => {
    const minimalUser = {
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com'
    };
    
    const template = generateEmailTemplate('welcome', minimalUser);
    
    expect(template.html).toContain('Jane');
    expect(template.html).not.toContain('undefined');
    expect(template.html).not.toContain('null');
  });
});