import { NextRequest, NextResponse } from "next/server";
import { uploadFile } from "@/lib/s3";
import { z } from "zod";

// Rule 2: Auth - Verify session on server side.
// Rule 3: Validation - Strict schema for file metadata.
const fileSchema = z.object({
  mimeType: z.enum(["image/jpeg", "image/png", "image/gif", "application/pdf", "text/plain"]),
  originalName: z.string().max(255),
  size: z.number().max(10 * 1024 * 1024), // 10MB limit
});

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const sessionToken = request.cookies.get("session_token")?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // (In a real app, verify sessionToken against DB/Redis here to get userId)
    const userId = "verified-user-id-placeholder"; // Derived from verified session

    // 2. Parse Body
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const mimeType = formData.get("mimeType") as string;
    const originalName = formData.get("originalName") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // 3. Validate Schema
    const validated = fileSchema.parse({
      mimeType,
      originalName,
      size: file.size,
    });

    // 4. Convert to Buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // 5. Upload
    const s3Key = await uploadFile(buffer, validated.mimeType, validated.originalName);

    // 6. Authorize (Optional: Store file record with userId in DB)
    // await db.file.create({ data: { key: s3Key, ownerId: userId } });

    // 7. Return minimal result
    return NextResponse.json({ key: s3Key });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed" }, { status: 400 });
    }
    console.error({ event: "upload_error", error }); // Rule 3: Structured logging
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}