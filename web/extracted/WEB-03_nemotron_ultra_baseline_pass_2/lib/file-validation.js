const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function validateFile(file) {
  const errors = [];

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    errors.push(`File type ${file.type} is not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`);
  }

  if (file.size > MAX_FILE_SIZE) {
    errors.push(`File size ${file.size} bytes exceeds maximum allowed size of ${MAX_FILE_SIZE} bytes`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function sanitizeFileName(fileName) {
  return fileName
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/\.+/g, '.')
    .substring(0, 255);
}

export function generateUniqueFileName(originalName) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop();
  const baseName = originalName.substring(0, originalName.lastIndexOf('.')) || 'file';
  return `${baseName}_${timestamp}_${random}.${extension}`;
}