import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
]);

export interface UploadResult {
  url: string;
  key: string;
}

export class FileUploadError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "FileUploadError";
  }
}

function getS3Client(): S3Client {
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!region || !accessKeyId || !secretAccessKey) {
    throw new FileUploadError(
      "AWS credentials are not configured",
      "AWS_CONFIG_MISSING",
    );
  }

  return new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

function validateFile(file: File): void {
  if (!file || file.size === 0) {
    throw new FileUploadError("File is empty", "EMPTY_FILE");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new FileUploadError(
      `File size exceeds the ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`,
      "FILE_TOO_LARGE",
    );
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new FileUploadError(
      `File type "${file.type}" is not allowed`,
      "INVALID_FILE_TYPE",
    );
  }
}

function generateUniqueKey(fileName: string, userId?: string): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 10);
  const sanitizedFileName = fileName
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  const userPrefix = userId ? `users/${userId}/` : "anonymous/";
  const extension = sanitizedFileName.split(".").pop() || "file";

  return `${userPrefix}${timestamp}-${randomSuffix}.${extension}`;
}

/**
 * Uploads a file to an S3 bucket using a pre-signed URL.
 * This approach keeps AWS credentials on the server and allows
 * direct browser-to-S3 uploads.
 */
export async function uploadFileToS3(
  file: File,
  options?: { userId?: string; bucketName?: string },
): Promise<UploadResult> {
  validateFile(file);

  const bucketName = options?.bucketName || process.env.AWS_S3_BUCKET_NAME;
  if (!bucketName) {
    throw new FileUploadError(
      "S3 bucket name is not configured",
      "BUCKET_NOT_CONFIGURED",
    );
  }

  const key = generateUniqueKey(file.name, options?.userId);
  const s3Client = getS3Client();

  try {
    // Generate pre-signed URL for direct upload
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: file.type,
      CacheControl: "public, max-age=31536000, immutable",
    });

    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600, // URL valid for 1 hour
    });

    // Upload directly from the browser using the pre-signed URL
    const response = await fetch(signedUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type,
      },
    });

    if (!response.ok) {
      throw new FileUploadError(
        `S3 upload failed with status ${response.status}`,
        "S3_UPLOAD_FAILED",
      );
    }

    // Construct the public URL for the uploaded file
    const region = process.env.AWS_REGION;
    const url = `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;

    return { url, key };
  } catch (error) {
    if (error instanceof FileUploadError) {
      throw error;
    }
    throw new FileUploadError(
      `Failed to upload file: ${error instanceof Error ? error.message : "Unknown error"}`,
      "UPLOAD_FAILED",
    );
  }
}

/**
 * Alternative server-side upload using the AWS SDK directly.
 * Use this when you need to process the file on the server first
 * (e.g., resizing images, scanning for malware).
 */
export async function uploadFileToS3ServerSide(
  file: File,
  options?: { userId?: string; bucketName?: string },
): Promise<UploadResult> {
  validateFile(file);

  const bucketName = options?.bucketName || process.env.AWS_S3_BUCKET_NAME;
  if (!bucketName) {
    throw new FileUploadError(
      "S3 bucket name is not configured",
      "BUCKET_NOT_CONFIGURED",
    );
  }

  const key = generateUniqueKey(file.name, options?.userId);
  const s3Client = getS3Client();

  try {
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: fileBuffer,
      ContentType: file.type,
      CacheControl: "public, max-age=31536000, immutable",
    });

    await s3Client.send(command);

    const region = process.env.AWS_REGION;
    const url = `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;

    return { url, key };
  } catch (error) {
    if (error instanceof FileUploadError) {
      throw error;
    }
    throw new FileUploadError(
      `Failed to upload file: ${error instanceof Error ? error.message : "Unknown error"}`,
      "UPLOAD_FAILED",
    );
  }
}