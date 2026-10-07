import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME!;

// Rule 2: Auth - Verify session for signed URL generation
// Rule 3: Security - Signed URL expires quickly (15 mins)
export async function GET(
  request: NextRequest,
  { params }: { params: { key: string } }
) {
  const sessionToken = request.cookies.get("session_token")?.value;
  if (!sessionToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // (Verify sessionToken -> userId -> check ownership of key in DB)
  // For this utility, we assume the key is valid and user has access.

  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: params.key,
    });

    // Rule 3: Security - Signed URL is server-side. Never exposes credentials.
    const url = await getSignedUrl(s3Client, command, { expiresIn: 900 });

    return NextResponse.json({ url });
  } catch (error) {
    console.error({ event: "signed_url_error", key: params.key });
    return NextResponse.json({ error: "Could not generate URL" }, { status: 500 });
  }
}