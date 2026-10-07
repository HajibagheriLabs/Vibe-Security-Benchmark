// app/api/upload/complete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db";
import { files } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const completeSchema = z.object({
  key: z.string().min(1),
  originalName: z.string().min(1).max(255),
  contentType: z.string().min(1),
  size: z.number().positive(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const parsed = completeSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    
    const { key, originalName, contentType, size } = parsed.data;
    
    // Verify the key belongs to this user (prevent key manipulation)
    if (!key.startsWith(`uploads/${session.userId}/`)) {
      logger.warn({ event: "upload_complete_key_mismatch", userId: session.userId, key });
      return NextResponse.json({ error: "Invalid key" }, { status: 400 });
    }
    
    // Record file metadata in database
    const [file] = await db.insert(files).values({
      userId: session.userId,
      key,
      originalName,
      contentType,
      size,
      uploadedAt: new Date(),
    }).returning();
    
    logger.info({
      event: "upload_completed",
      userId: session.userId,
      fileId: file.id,
      key,
      size,
    });
    
    return NextResponse.json({ file });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    logger.error({ event: "upload_complete_error", error: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}