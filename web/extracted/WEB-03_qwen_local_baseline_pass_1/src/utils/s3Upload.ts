import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

// Initialize S3 client using default credentials provider chain
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
});

export interface UploadOptions {
  bucketName: string;
  key?: string; // Optional custom key. If not provided, a UUID-based key is generated.
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface PresignedUrlResponse {
  url: string;
  key: string;
}

/**
 * Generates a presigned PUT URL for uploading a file to S3.
 * This allows the client to upload directly to S3 without passing through the Next.js API route.
 */
export async function generatePresignedUploadUrl({
  bucketName,
  key,
  contentType,
  metadata,
}: UploadOptions): Promise<PresignedUrlResponse> {
  const objectKey = key || `${randomUUID()}-${Date.now()}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: objectKey,
    ContentType: contentType,
    Metadata: metadata,
  });

  // Set the expiration time for the presigned URL (e.g., 1 hour)
  const expiresIn = 3600; 

  const url = await getSignedUrl(s3Client, command, { expiresIn });

  return {
    url,
    key: objectKey,
  };
}

/**
 * Directly uploads a file to S3 from the server (e.g., from an API route body).
 * Useful for smaller files or when server-side processing is required before upload.
 */
export async function uploadFileToS3(
  bucketName: string,
  key: string,
  body: Buffer | string,
  contentType: string
): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
    Body: body,
  });

  await s3Client.send(command);
}