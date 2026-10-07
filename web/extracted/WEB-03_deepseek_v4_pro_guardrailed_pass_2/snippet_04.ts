// app/api/files/[key]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { deleteFileFromS3, FileUploadError } from '@/lib/file-upload-service';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { key: string } }
) {
  try {
    // Security: Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Security: Decode and validate the key parameter
    const fileKey = decodeURIComponent(params.key);

    // Delete from S3 with ownership verification
    await deleteFileFromS3(session.user.id, fileKey);

    return NextResponse.json({ success: true });

  } catch (error) {
    if (error instanceof FileUploadError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }

    console.error({
      event: 'delete_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}