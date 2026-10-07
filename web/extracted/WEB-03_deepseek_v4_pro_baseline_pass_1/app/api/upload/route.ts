import { NextRequest, NextResponse } from "next/server";
import { uploadFileToS3ServerSide, FileUploadError } from "@/lib/s3-upload";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const userId = formData.get("userId") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 },
      );
    }

    const result = await uploadFileToS3ServerSide(file, {
      userId: userId || undefined,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof FileUploadError) {
      const statusMap: Record<string, number> = {
        EMPTY_FILE: 400,
        FILE_TOO_LARGE: 413,
        INVALID_FILE_TYPE: 415,
        AWS_CONFIG_MISSING: 500,
        BUCKET_NOT_CONFIGURED: 500,
        S3_UPLOAD_FAILED: 502,
        UPLOAD_FAILED: 500,
      };

      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: statusMap[error.code] || 500 },
      );
    }

    console.error("Unexpected upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}