export const AVATAR_CONSTRAINTS = {
  maxSizeBytes: 1024 * 1024, // 1MB
  allowedMimeTypes: ['image/svg+xml'] as const,
  allowedExtensions: ['.svg'] as const,
} as const;

export function validateAvatarFile(file: File): { valid: boolean; error?: string } {
  if (!AVATAR_CONSTRAINTS.allowedMimeTypes.includes(file.type as any)) {
    return { valid: false, error: 'Only SVG files are allowed' };
  }

  if (file.size > AVATAR_CONSTRAINTS.maxSizeBytes) {
    return { valid: false, error: 'File size must be less than 1MB' };
  }

  const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
  if (!AVATAR_CONSTRAINTS.allowedExtensions.includes(extension as any)) {
    return { valid: false, error: 'File must have .svg extension' };
  }

  return { valid: true };
}

export function getAvatarUrl(filename: string): string {
  if (!filename) return '';
  return `/uploads/avatars/${filename}`;
}

export function extractFilenameFromUrl(url: string): string | null {
  const match = url.match(/\/uploads\/avatars\/([^/]+\.svg)$/);
  return match ? match[1] : null;
}