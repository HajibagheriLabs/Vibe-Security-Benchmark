import { z } from 'zod';

export const svgSchema = z
  .string()
  .min(1, 'SVG content is required')
  .max(2 * 1024 * 1024, 'SVG must be less than 2MB')
  .refine(
    (content) => {
      const trimmed = content.trim();
      return (
        trimmed.startsWith('<svg') ||
        (trimmed.startsWith('<?xml') && trimmed.includes('<svg'))
      );
    },
    { message: 'Content must be a valid SVG file' }
  )
  .refine(
    (content) => {
      const lower = content.toLowerCase();
      const dangerousPatterns = [
        /<script\b/i,
        /on\w+\s*=/i,
        /javascript:/i,
        /vbscript:/i,
        /data:text\/html/i,
        /<iframe\b/i,
        /<object\b/i,
        /<embed\b/i,
        /<link\b/i,
        /<style\b/i,
        /@import/i,
        /expression\s*\(/i,
        /behavior\s*:/i,
        /-moz-binding/i,
      ];
      return !dangerousPatterns.some((pattern) => pattern.test(lower));
    },
    { message: 'SVG contains potentially dangerous content' }
  )
  .refine(
    (content) => {
      const svgMatch = content.match(/<svg[^>]*>/i);
      if (!svgMatch) return false;
      const svgTag = svgMatch[0];
      return /xmlns\s*=\s*["']http:\/\/www\.w3\.org\/2000\/svg["']/i.test(svgTag);
    },
    { message: 'SVG must declare the correct xmlns namespace' }
  );

export const uploadSchema = z.object({
  svg: svgSchema,
  filename: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-zA-Z0-9._-]+\.svg$/i, 'Filename must be alphanumeric with .svg extension'),
});

export type UploadInput = z.infer<typeof uploadSchema>;