import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface UploadResult {
  key: string;
  url: string;
  bucket: string;
}

export interface S3Config {
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;
}

function getS3Client(config: S3Config): S3Client {
  return new S3Client({
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    endpoint: config.endpoint,
  });
}

export async function uploadToS3(
  config: S3Config,
  file: Buffer | Uint8Array | ReadableStream,
  key: string,
  contentType: string,
  options: {
    cacheControl?: string;
    metadata?: Record<string, string>;
    acl?: 'private' | 'public-read' | 'public-read-write' | 'authenticated-read';
  } = {}
): Promise<UploadResult> {
  const client = getS3Client(config);
  
  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    Body: file as any,
    ContentType: contentType,
    CacheControl: options.cacheControl,
    Metadata: options.metadata,
    ACL: options.acl,
  });

  await client.send(command);

  const url = `https://${config.bucket}.s3.${config.region}.amazonaws.com/${key}`;

  return {
    key,
    url,
    bucket: config.bucket,
  };
}

export async function deleteFromS3(config: S3Config, key: string): Promise<void> {
  const client = getS3Client(config);
  
  const command = new DeleteObjectCommand({
    Bucket: config.bucket,
    Key: key,
  });

  await client.send(command);
}

export async function getPresignedUploadUrl(
  config: S3Config,
  key: string,
  contentType: string,
  expiresIn: number = 3600
): Promise<string> {
  const client = getS3Client(config);
  
  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(client, command, { expiresIn });
}

export async function getPresignedDownloadUrl(
  config: S3Config,
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const client = getS3Client(config);
  
  const command = new GetObjectCommand({
    Bucket: config.bucket,
    Key: key,
  });

  return getSignedUrl(client, command, { expiresIn });
}

export function generateUniqueKey(originalName: string, prefix: string = 'uploads'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  const extension = originalName.split('.').pop() || '';
  const baseName = originalName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9-_]/g, '_');
  
  return `${prefix}/${timestamp}-${random}-${baseName}.${extension}`;
}

export function validateFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.includes(file.type);
}

export function validateFileSize(file: File, maxSizeBytes: number): boolean {
  return file.size <= maxSizeBytes;
}

export const DEFAULT_ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

export const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB