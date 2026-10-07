import { NextRequest, NextResponse } from "next/server";
import { generatePresignedUploadUrl } from "@/lib/s3Upload";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileName, fileType, fileSize, folder } = body;

    if (!fileName || !fileType || !fileSize) {
      return NextResponse.json(
        { error: "fileName, fileType, and fileSize are required." },
        { status: 400 }
      );
    }

    const result = await generatePresignedUploadUrl({
      fileName,
      fileType,
      fileSize,
      folder,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate upload URL.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}