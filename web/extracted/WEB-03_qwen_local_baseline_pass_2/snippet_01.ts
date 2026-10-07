import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || "";

export interface UploadResult {
  url: string;
  key: string;
}

export async function uploadFileToS3(
  file: Buffer,
  fileName: string,
  mimeType: string
): Promise<UploadResult> {
  if (!BUCKET_NAME) {
    throw new Error("AWS_S3_BUCKET_NAME environment variable is not set");
  }

  const key = `uploads/${Date.now()}-${fileName}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: file,
    ContentType: mimeType,
  });

  await s3Client.send(command);

  // Assuming public read access or CloudFront for URL generation
  // Adjust this URL construction based on your bucket configuration
  const url = `https://${BUCKET_NAME}.s3.amazonaws.com/${key}`;

  return {
    url,
    key,
  };
}