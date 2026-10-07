// lib/file-upload-service.ts
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from './s3-client';
import { randomUUID } from 'crypto';
import path from 'path';

// Security: File type validation and sanitization
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export interface UploadResult {
  key: string;
  url: string;
  size: number;
  mimeType: string;
}

export interface UploadFileParams {
  userId: string; // Server-verified user ID from session
  file: Buffer;
  originalName: string;
  mimeType: string;
  size: number;
}

export class FileUploadError extends Error {
  constructor(message: string, public statusCode: number = 400) {
    super(message);
    this.name = 'FileUploadError';
  }
}

/**
 * Uploads a file to S3 with proper validation and sanitization
 * Security: Validates file type, size, and sanitizes filename
 */
export async function uploadFileToS3(params: UploadFileParams): Promise<UploadResult> {
  const { userId, file, originalName, mimeType, size } = params;

  // Validate file size
  if (size > MAX_FILE_SIZE) {
    throw new FileUploadError('File size exceeds maximum allowed size', 413);
  }

  if (size === 0) {
    throw new FileUploadError('File is empty', 400);
  }

  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new FileUploadError('File type not allowed', 415);
  }

  // Sanitize filename - remove path traversal and special characters
  const sanitizedName = sanitizeFilename(originalName);
  const extension = path.extname(sanitizedName).toLowerCase();
  
  // Generate unique key with user isolation
  const fileKey = `uploads/${userId}/${randomUUID()}${extension}`;

  try {
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME || '',
      Key: fileKey,
      Body: file,
      ContentType: mimeType,
      // Security: Set appropriate metadata
      Metadata: {
        'original-name': sanitizedName,
        'uploaded-by': userId,
      },
      // Security: Prevent public access by default
      ACL: 'private',
    });

    await s3Client.send(command);

    return {
      key: fileKey,
      url: `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`,
      size,
      mimeType,
    };
  } catch (error) {
    console.error('S3 upload failed:', error);
    throw new FileUploadError('Failed to upload file', 500);
  }
}

/**
 * Deletes a file from S3
 * Security: Verifies ownership before deletion
 */
export async function deleteFileFromS3(userId: string, fileKey: string): Promise<void> {
  // Security: Ensure the file belongs to the user
  if (!fileKey.startsWith(`uploads/${userId}/`)) {
    throw new FileUploadError('File not found', 404);
  }

  try {
    const command = new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME || '',
      Key: fileKey,
    });

    await s3Client.send(command);
  } catch (error) {
    console.error('S3 delete failed:', error);
    throw new FileUploadError('Failed to delete file', 500);
  }
}

/**
 * Sanitizes filename to prevent path traversal and XSS
 */
function sanitizeFilename(filename: string): string {
  // Remove path components
  const basename = path.basename(filename);
  
  // Remove special characters and control characters
  const sanitized = basename
    .replace(/[^\w\s.-]/g, '') // Remove special chars except word chars, spaces, dots, hyphens
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/\.{2,}/g, '.') // Prevent path traversal with multiple dots
    .slice(0, 255); // Limit filename length
  
  // Ensure non-empty filename
  return sanitized || 'unnamed_file';
}