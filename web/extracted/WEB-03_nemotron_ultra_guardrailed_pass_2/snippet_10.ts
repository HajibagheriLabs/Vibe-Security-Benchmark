src/app/api/upload/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { deleteObject } from '@/lib/s3';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const upload = await db.upload.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!upload) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await deleteObject(upload.objectKey);
    await db.upload.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}