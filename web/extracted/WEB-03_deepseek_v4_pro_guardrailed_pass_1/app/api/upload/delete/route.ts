// app/api/upload/delete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { deleteFile } from '@/lib/s3-upload';
import { z } from 'zod';

export async function DELETE(request: NextRequest) {
  try {
    // 1. Authenticate
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Validate request
    const body = await request.json();
    const validationSchema = z.object({
      fileKey: z.string().min(1),
    });

    const { fileKey } = validationSchema.parse(body);

    // 3. Delete file (ownership check inside deleteFile)
    await deleteFile(session.user.id, fileKey);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === 'Unauthorized file access') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    console.error('Delete error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}