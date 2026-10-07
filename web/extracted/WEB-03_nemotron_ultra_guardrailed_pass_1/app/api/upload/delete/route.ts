// app/api/upload/delete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/session";
import { deleteFile } from "@/lib/s3/client";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db";
import { files } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

const deleteSchema = z.object({
  fileId: z.string().uuid(),
});

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const parsed = deleteSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    
    const { fileId } = parsed.data;
    
    // Verify ownership before deletion
    const [file] = await db.select()
      .from(files)
      .where(and(eq(files.id, fileId), eq(files.userId, session.userId)))
      .limit(1);
    
    if (!file) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    
    // Delete from S3
    await deleteFile(file.key);
    
    // Delete from database
    await db.delete(files).where(eq(files.id, fileId));
    
    logger.info({ event: "file_deleted", userId: session.userId, fileId, key: file.key });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    logger.error({ event: "file_delete_error", error: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}