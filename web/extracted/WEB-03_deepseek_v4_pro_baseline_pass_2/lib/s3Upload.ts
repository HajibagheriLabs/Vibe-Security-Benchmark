import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME!;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "application/zip",
];

export interface UploadResult {
  key: string;
  url: string;
  bucket: string;
}

export interface PresignedUploadParams {
  fileName: string;
  fileType: string;
  fileSize: number;
  folder?: string;
}

export interface PresignedUploadResult {
  uploadUrl: string;
  key: string;
  publicUrl: string;
  expiresIn: number;
}

function sanitizeFileName(fileName: string): string {
  // Remove path traversal attempts and normalize
  const baseName = fileName.replace(/^.*[\\/]/, "");
  // Remove special characters, keep alphanumeric, dots, dashes, underscores
  return baseName
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

function generateKey(folder: string | undefined, fileName: string): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 10);
  const sanitized = sanitizeFileName(fileName);
  const uniqueFileName = `${timestamp}-${randomSuffix}-${sanitized}`;
  
  if (folder && folder.trim()) {
    const cleanFolder = folder.replace(/^\/+|\/+$/g, "").replace(/\/+/g, "/");
    return `${cleanFolder}/${uniqueFileName}`;
  }
  
  return uniqueFileName;
}

export function validateFileUpload(
  fileType: string,
  fileSize: number
): { valid: boolean; error?: string } {
  if (!ALLOWED_MIME_TYPES.includes(fileType)) {
    return {
      valid: false,
      error: `File type "${fileType}" is not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(", ")}`,
    };
  }

  if (fileSize <= 0) {
    return { valid: false, error: "File size must be greater than 0 bytes." };
  }

  if (fileSize > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds the maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)}MB.`,
    };
  }

  return { valid: true };
}

/**
 * Generates a presigned URL for direct browser-to-S3 upload.
 * This avoids routing large files through the Next.js server.
 */
export async function generatePresignedUploadUrl(
  params: PresignedUploadParams
): Promise<PresignedUploadResult> {
  const validation = validateFileUpload(params.fileType, params.fileSize);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const key = generateKey(params.folder, params.fileName);

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: params.fileType,
    ContentLength: params.fileSize,
  });

  const expiresIn = 3600; // 1 hour
  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn });

  const publicUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

  return {
    uploadUrl,
    key,
    publicUrl,
    expiresIn,
  };
}

/**
 * Uploads a file buffer directly to S3 from the server.
 * Use this for server-side uploads (e.g., API routes, server actions).
 */
export async function uploadFileToS3(
  fileBuffer: Buffer,
  fileName: string,
  fileType: string,
  folder?: string
): Promise<UploadResult> {
  const validation = validateFileUpload(fileType, fileBuffer.length);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const key = generateKey(folder, fileName);

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: fileBuffer,
    ContentType: fileType,
    ContentLength: fileBuffer.length,
  });

  await s3Client.send(command);

  const url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

  return {
    key,
    url,
    bucket: BUCKET_NAME,
  };
}

/**
 * Uploads a File/Blob object from the browser via a presigned URL.
 * Call this from client components after obtaining a presigned URL.
 */
export async function uploadFileWithPresignedUrl(
  file: File,
  presignedUrl: string
): Promise<Response> {
  const response = await fetch(presignedUrl, {
    method: "PUT",
    body: file,
    headers: {
      "Content-Type": file.type,
    },
  });

  if (!response.ok) {
    throw new Error(`Upload failed with status ${response.status}`);
  }

  return response;
}