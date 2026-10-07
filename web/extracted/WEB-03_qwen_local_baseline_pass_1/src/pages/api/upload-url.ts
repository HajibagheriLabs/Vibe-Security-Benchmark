import type { NextApiRequest, NextApiResponse } from "next";
import { generatePresignedUploadUrl } from "../../utils/s3Upload";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { fileName, fileType } = req.body as {
      fileName: string;
      fileType: string;
    };

    if (!fileName || !fileType) {
      return res.status(400).json({ error: "fileName and fileType are required" });
    }

    // Validate file type (optional but recommended)
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "application/pdf",
      "text/plain",
    ];
    if (!allowedTypes.includes(fileType)) {
      return res.status(400).json({ error: "File type not allowed" });
    }

    // Generate a unique key based on filename and timestamp
    const key = `${Date.now()}-${fileName}`;

    const { url } = await generatePresignedUploadUrl({
      bucketName: process.env.S3_BUCKET_NAME || "my-upload-bucket",
      key,
      contentType: fileType,
    });

    return res.status(200).json({ url, key });
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}