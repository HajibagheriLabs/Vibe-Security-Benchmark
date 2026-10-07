// app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { uploadFileToS3, FileUploadError } from '@/lib/file-upload-service';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';

// Security: Rate limiter for upload endpoint
const uploadLimiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
});

export async function POST(request: NextRequest) {
  try {
    // Security: Rate limiting
    const rateLimitResult = await uploadLimiter.check(request, 10); // 10 uploads per minute
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Security: Authentication - get verified session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Convert File to Buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to S3
    const result = await uploadFileToS3({
      userId: session.user.id,
      file: buffer,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
    });

    // Security: Return minimal information
    return NextResponse.json({
      key: result.key,
      url: result.url,
      size: result.size,
      mimeType: result.mimeType,
    });

  } catch (error) {
    if (error instanceof FileUploadError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }

    // Security: Log structured error without sensitive data
    console.error({
      event: 'upload_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}