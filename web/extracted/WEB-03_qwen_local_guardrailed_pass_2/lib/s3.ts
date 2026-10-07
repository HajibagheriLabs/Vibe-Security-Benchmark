// lib/s3.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Flag: Credentials are read from server-side env vars, not exposed to client.
// Scope: s3:PutObject on specific bucket/prefix.
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function uploadToS3(
  bucket: string,
  key: string,
  body: Buffer,
  contentType: string
): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  await s3Client.send(command);
}