src/lib/s3.ts
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env, ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from './env';
import { randomUUID } from 'crypto';

const s3Client = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

export function generateObjectKey(userId: string, originalName: string): string {
  const extension = originalName.split('.').pop()?.toLowerCase() || '';
  const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const uuid = randomUUID();
  return `${env.S3_UPLOAD_PREFIX}${userId}/${uuid}-${sanitizedName}`;
}

export async function createPresignedUploadUrl(
  userId: string,
  fileName: string,
  contentType: string,
  fileSize: number
): Promise<{ uploadUrl: string; objectKey: string; expiresIn: number }> {
  if (!ALLOWED_MIME_TYPES.includes(contentType)) {
    throw new Error(`File type ${contentType} not allowed`);
  }
  if (fileSize > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File size exceeds ${MAX_FILE_SIZE_BYTES} bytes limit`);
  }

  const objectKey = generateObjectKey(userId, fileName);
  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET_NAME,
    Key: objectKey,
    ContentType: contentType,
    ContentLength: fileSize,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });
  return { uploadUrl, objectKey, expiresIn: 300 };
}

export async function deleteObject(objectKey: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: env.S3_BUCKET_NAME,
    Key: objectKey,
  });
  await s3Client.send(command);
}