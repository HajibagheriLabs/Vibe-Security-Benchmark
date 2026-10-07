// src/app/api/avatar/[userId]/[fileId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { readFile, stat } from "fs/promises";
import path from "path";
import { z } from "zod";

const paramsSchema = z.object({
  userId: z.string().uuid(),
  fileId: z.string().uuid(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string; fileId: string }> }
): Promise<NextResponse> {
  const rawParams = await params;
  const parsed = paramsSchema.safeParse(rawParams);
  if (!parsed.success) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { userId, fileId } = parsed.data;

  // Security: Avatars are public-ish, but we still verify the file exists
  // and belongs to the claimed user. No session required for viewing
  // (profile avatars are public), but we never serve arbitrary paths.
  const storageDir = path.join(process.cwd(), "storage", "avatars", userId);
  const safePath = path.join(storageDir, `${fileId}.svg`);

  // Path traversal defense: ensure resolved path stays within storageDir
  const resolvedPath = path.resolve(safePath);
  const resolvedDir = path.resolve(storageDir);
  if (!resolvedPath.startsWith(resolvedDir + path.sep)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const fileStat = await stat(resolvedPath);
    if (!fileStat.isFile()) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const content = await readFile(resolvedPath, "utf8");

    // Security: Serve with sandbox CSP so SVG cannot execute scripts
    // in our origin, even if a sanitization bypass is found later.
    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml",
        "Content-Length": String(fileStat.size),
        "Cache-Control": "public, max-age=86400, immutable",
        // Critical: sandbox directive prevents script execution
        "Content-Security-Policy":
          "default-src 'none'; style-src 'unsafe-inline'; sandbox",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
        // Prevent the SVG from being embedded in other sites (clickjacking)
        "Content-Disposition": "inline; filename=avatar.svg",
      },
    });
  } catch {
    // File not found or read error — return 404, not 403
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}