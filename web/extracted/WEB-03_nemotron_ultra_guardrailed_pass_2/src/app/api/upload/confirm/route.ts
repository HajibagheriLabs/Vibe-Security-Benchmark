src/app/api/upload/confirm/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from '@/lib/auth';
import { db } from '@/lib/db';

const confirmSchema = z.object({
  objectKey: z.string().min(1),
  fileName: z.string().min(1).max(255),
  contentType: z.string().min(1),
  fileSize: z.number().int().positive(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = confirmSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 });
    }

    const { objectKey, fileName, contentType, fileSize } = parsed.data;

    if (!objectKey.startsWith(`uploads/${session.user.id}/`)) {
      return NextResponse.json({ error: 'Invalid object key' }, { status: 400 });
    }

    const upload = await db.upload.create({
      data: {
        userId: session.user.id,
        objectKey,
        fileName,
        contentType,
        fileSize,
        status: 'completed',
      },
    });

    return NextResponse.json({ uploadId: upload.id });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}