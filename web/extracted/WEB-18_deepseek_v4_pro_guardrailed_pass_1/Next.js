// app/api/avatars/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { z } from 'zod';
import { sanitizeSvg } from '@/lib/svg-sanitizer';
import { rateLimit } from '@/lib/rate-limit';

// Security: SVG avatars are stored server-side only; never served from public directory
const AVATAR_DIR = process.env.AVATAR_STORAGE_PATH || '/var/data/avatars';
const MAX_FILE_SIZE = 100 * 1024; // 100KB
const ALLOWED_MIME_TYPES = ['image/svg+xml'] as const;

const uploadSchema = z.object({
  fileName: z.string().min(1).max(255).regex(/^[a-zA-Z0-9._-]+\.svg$/i, 'Invalid filename'),
});

export async function POST(request: NextRequest) {
  // Security: authenticate before any file processing
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Security: rate limit uploads per user
  const rateLimitResult = await rateLimit(session.user.id, 'avatar-upload', 10, 60);
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const fileNameField = formData.get('fileName') as string | null;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  // Security: validate filename against allowlist pattern
  const fileNameValidation = uploadSchema.safeParse({ fileName: fileNameField || file.name });
  if (!fileNameValidation.success) {
    return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
  }

  // Security: validate MIME type explicitly
  if (!ALLOWED_MIME_TYPES.includes(file.type as typeof ALLOWED_MIME_TYPES[number])) {
    return NextResponse.json({ error: 'Invalid file type. Only SVG allowed.' }, { status: 400 });
  }

  // Security: validate file size
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File too large' }, { status: 400 });
  }

  // Security: read and sanitize SVG content server-side
  const rawSvg = await file.text();
  const sanitizedSvg = sanitizeSvg(rawSvg);

  if (!sanitizedSvg) {
    return NextResponse.json({ error: 'Invalid SVG content' }, { status: 400 });
  }

  // Security: generate UUID-based filename to prevent path traversal
  const fileId = crypto.randomUUID();
  const safeFileName = `${fileId}.svg`;
  const userDir = path.join(AVATAR_DIR, session.user.id);
  const filePath = path.join(userDir, safeFileName);

  // Security: ensure directory exists with proper permissions
  await mkdir(userDir, { recursive: true, mode: 0o700 });

  // Security: write sanitized content only
  await writeFile(filePath, sanitizedSvg, { mode: 0o600 });

  // Security: return only the file ID, never the full path
  return NextResponse.json({ 
    avatarId: fileId,
    url: `/api/avatars/${fileId}` 
  }, { status: 201 });
}