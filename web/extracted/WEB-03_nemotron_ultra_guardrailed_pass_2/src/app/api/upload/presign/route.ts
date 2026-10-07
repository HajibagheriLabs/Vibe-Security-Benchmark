src/app/api/upload/presign/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createPresignedUploadUrl } from '@/lib/s3';
import { getServerSession } from '@/lib/auth';

const presignSchema = z.object({
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
    const parsed = presignSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 });
    }

    const { uploadUrl, objectKey, expiresIn } = await createPresignedUploadUrl(
      session.user.id,
      parsed.data.fileName,
      parsed.data.contentType,
      parsed.data.fileSize
    );

    return NextResponse.json({ uploadUrl, objectKey, expiresIn });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('not allowed') || message.includes('exceeds') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}