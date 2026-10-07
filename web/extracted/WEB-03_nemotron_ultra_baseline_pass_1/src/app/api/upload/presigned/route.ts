import { NextRequest, NextResponse } from 'next/server';
import { getPresignedUploadUrl, generateUniqueKey, validateFileType, DEFAULT_ALLOWED_TYPES } from '@/lib/s3';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileName, fileType, prefix = 'uploads' } = body;

    if (!fileName || !fileType) {
      return NextResponse.json(
        { error: 'fileName and fileType are required' },
        { status: 400 }
      );
    }

    if (!validateFileType({ type: fileType } as File, DEFAULT_ALLOWED_TYPES)) {
      return NextResponse.json(
        { error: `File type ${fileType} not allowed` },
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

    const key = generateUniqueKey(fileName, prefix);
    const uploadUrl = await getPresignedUploadUrl(config, key, fileType);

    return NextResponse.json({
      uploadUrl,
      key,
      bucket: config.bucket,
      region: config.region,
    });
  } catch (error) {
    console.error('Presigned URL error:', error);
    return NextResponse.json(
      { error: 'Failed to generate presigned URL' },
      { status: 500 }
    );
  }
}