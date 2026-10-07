// app/api/avatars/[avatarId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { readFile, stat } from 'fs/promises';
import path from 'path';
import { z } from 'zod';

const AVATAR_DIR = process.env.AVATAR_STORAGE_PATH || '/var/data/avatars';

const paramsSchema = z.object({
  avatarId: z.string().uuid()
});

export async function GET(
  request: NextRequest,
  { params }: { params: { avatarId: string } }
) {
  // Security: authenticate before serving any file
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Security: validate avatarId is a proper UUID to prevent path traversal
  const validation = paramsSchema.safeParse(params);
  if (!validation.success) {
    return NextResponse.json({ error: 'Invalid avatar ID' }, { status: 400 });
  }

  // Security: construct path with validated UUID only
  const filePath = path.join(AVATAR_DIR, session.user.id, `${validation.data.avatarId}.svg`);

  try {
    // Security: verify file exists and is owned by the authenticated user
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      return NextResponse.json({ error: 'Avatar not found' }, { status: 404 });
    }

    const fileContent = await readFile(filePath);

    // Security: serve with strict headers to prevent SVG XSS
    return new NextResponse(fileContent, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Content-Disposition': 'inline; filename="avatar.svg"',
        // Security: prevent SVG from executing scripts when served
        'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, max-age=3600',
        // Security: prevent the SVG from being used in other contexts
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'no-referrer'
      }
    });
  } catch (error) {
    // Security: return 404 for any file access error to prevent enumeration
    return NextResponse.json({ error: 'Avatar not found' }, { status: 404 });
  }
}