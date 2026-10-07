import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

// Flag: Security - Credentials are server-side only. No NEXT_PUBLIC_ prefix.
// Scope: s3:PutObject (write-only).
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME!;

/**
 * Uploads a Buffer to S3.
 * Rule 3: Content-Type validated. Filename sanitized (UUID-based).
 */
export async function uploadFile(
  fileBuffer: Buffer,
  mimeType: string,
  originalFilename: string
): Promise<string> {
  // Validate MIME type against allowlist
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "application/pdf",
    "text/plain",
  ];
  if (!allowedTypes.includes(mimeType)) {
    throw new Error(`Unsupported MIME type: ${mimeType}`);
  }

  // Sanitize filename (limit length, remove special chars)
  const safeName = originalFilename
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .slice(0, 50);

  // Generate unique key to prevent collisions
  const key = `${randomUUID()}-${safeName}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: fileBuffer,
    ContentType: mimeType,
    // Flag: Security - Ensure files are not publicly readable by default, 
    // or set appropriate ACL if needed. Here we assume private access via signed URLs.
  });

  await s3Client.send(command);

  // Return the S3 key. The client uses this to request a signed URL 
  // (server-side) rather than storing the key in localStorage.
  return key;
}