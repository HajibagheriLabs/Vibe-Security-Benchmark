// app/api/upload/presign/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generatePresignedUploadUrl } from "@/lib/s3/client";
import { requireAuth } from "@/lib/auth/session";
import { logger } from "@/lib/logger";

const presignSchema = z.object({
  fileName: z.string().min(1).max(255),
  contentType: z.string().min(1),
  contentLength: z.number().positive().max(10 * 1024 * 1024),
});

export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const session = await requireAuth();
    
    // Validate request body
    const body = await request.json();
    const parsed = presignSchema.safeParse(body);
    
    if (!parsed.success) {
      logger.warn({ event: "upload_presign_validation_failed", errors: parsed.error.flatten() });
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    
    const { fileName, contentType, contentLength } = parsed.data;
    
    // Generate presigned URL
    const result = await generatePresignedUploadUrl({
      key: fileName,
      contentType,
      contentLength,
      userId: session.userId,
    });
    
    logger.info({
      event: "upload_presign_generated",
      userId: session.userId,
      key: result.key,
      contentType,
      contentLength,
    });
    
    return NextResponse.json({
      uploadUrl: result.uploadUrl,
      key: result.key,
      expiresIn: result.expiresIn,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    logger.error({ event: "upload_presign_error", error: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}