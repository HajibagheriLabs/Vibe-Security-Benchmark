import { NextRequest, NextResponse } from 'next/server';
import { uploadToS3, generateUniqueKey, validateFileType, validateFileSize, DEFAULT_ALLOWED_TYPES, DEFAULT_MAX_FILE_SIZE } from '@/lib/s3';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const prefix = formData.get('prefix') as string || 'uploads';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!validateFileType(file, DEFAULT_ALLOWED_TYPES)) {
      return NextResponse.json(
        { error: `File type ${file.type} not allowed` },
        { status: 400 }
      );
    }

    if (!validateFileSize(file, DEFAULT_MAX_FILE_SIZE)) {
      return NextResponse.json(
        { error: `File size exceeds maximum allowed size of ${DEFAULT_MAX_FILE_SIZE} bytes` },
        { status: 400 }
      );
    }

    const config = {
      region: process.env.AWS_REGION!,
      bucket: process.env.AWS_S3_BUCKET!,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      endpoint: process.env.AWS_S3_ENDPOINT,
    };

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const key = generateUniqueKey(file.name, prefix);

    const result = await uploadToS3(config, buffer, key, file.type, {
      cacheControl: 'public, max-age=31536000, immutable',
      metadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      file: {
        key: result.key,
        url: result.url,
        name: file.name,
        size: file.size,
        type: file.type,
      },
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}