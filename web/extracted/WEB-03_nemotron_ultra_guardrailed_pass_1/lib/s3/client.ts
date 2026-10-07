// lib/s3/client.ts
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME!;
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export interface UploadParams {
  key: string;
  contentType: string;
  contentLength: number;
  userId: string;
}

export async function generatePresignedUploadUrl(params: UploadParams): Promise<{
  uploadUrl: string;
  key: string;
  expiresIn: number;
}> {
  // Validate file type
  if (!ALLOWED_MIME_TYPES.includes(params.contentType)) {
    throw new Error(`File type ${params.contentType} not allowed`);
  }

  // Validate file size
  if (params.contentLength > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds maximum allowed size of ${MAX_FILE_SIZE} bytes`);
  }

  // Sanitize key to prevent path traversal
  const sanitizedKey = sanitizeKey(params.key, params.userId);

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: sanitizedKey,
    ContentType: params.contentType,
    ContentLength: params.contentLength,
    // Server-side encryption
    ServerSideEncryption: "AES256",
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour

  return {
    uploadUrl,
    key: sanitizedKey,
    expiresIn: 3600,
  };
}

export async function deleteFile(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  await s3Client.send(command);
}

function sanitizeKey(key: string, userId: string): string {
  // Remove any path traversal attempts
  const cleanKey = key.replace(/\.\./g, "").replace(/[^a-zA-Z0-9._-]/g, "");
  // Prefix with user ID for isolation
  return `uploads/${userId}/${Date.now()}-${cleanKey}`;
}

export { ALLOWED_MIME_TYPES, MAX_FILE_SIZE };