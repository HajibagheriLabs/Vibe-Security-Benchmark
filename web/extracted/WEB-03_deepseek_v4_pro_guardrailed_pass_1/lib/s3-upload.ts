// lib/s3-upload.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { z } from 'zod';

// Server-side only - never import this in client components
const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME!;

// Validation schema for upload requests
const uploadRequestSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileType: z.string().min(1).max(100),
  fileSize: z.number().int().positive().max(50 * 1024 * 1024), // 50MB limit
});

export type UploadRequest = z.infer<typeof uploadRequestSchema>;

export interface PresignedUploadResult {
  uploadUrl: string;
  fileKey: string;
  expiresIn: number;
}

/**
 * Generate a presigned URL for direct-to-S3 upload
 * Must be called from a server-side route handler only
 */
export async function generatePresignedUploadUrl(
  userId: string,
  request: UploadRequest
): Promise<PresignedUploadResult> {
  // Validate request
  const validated = uploadRequestSchema.parse(request);

  // Generate unique file key with user isolation
  const fileExtension = validated.fileName.split('.').pop()?.toLowerCase() || '';
  const sanitizedFileName = validated.fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const fileKey = `uploads/${userId}/${randomUUID()}-${sanitizedFileName}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileKey,
    ContentType: validated.fileType,
    ContentLength: validated.fileSize,
  });

  // Generate presigned URL (15 minutes expiry)
  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });

  return {
    uploadUrl,
    fileKey,
    expiresIn: 900,
  };
}

/**
 * Delete a file from S3
 * Must be called from a server-side route handler only
 */
export async function deleteFile(userId: string, fileKey: string): Promise<void> {
  // Security: verify file ownership before deletion
  if (!fileKey.startsWith(`uploads/${userId}/`)) {
    throw new Error('Unauthorized file access');
  }

  const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileKey,
  });

  await s3Client.send(command);
}