import { NextResponse } from 'next/server';
import { s3Client, Upload } from '@/lib/s3-client';
import { validateFile, sanitizeFileName, generateUniqueFileName } from '@/lib/file-validation';
import { Readable } from 'stream';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const validation = validateFile(file);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'File validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    const bucketName = process.env.AWS_S3_BUCKET_NAME;
    if (!bucketName) {
      return NextResponse.json(
        { error: 'S3 bucket not configured' },
        { status: 500 }
      );
    }

    const sanitizedName = sanitizeFileName(file.name);
    const uniqueName = generateUniqueFileName(sanitizedName);
    const key = `uploads/${uniqueName}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileStream = Readable.from(buffer);

    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: bucketName,
        Key: key,
        Body: fileStream,
        ContentType: file.type,
        ContentLength: file.size,
        Metadata: {
          originalName: file.name,
          uploadedAt: new Date().toISOString(),
        },
      },
      queueSize: 4,
      partSize: 5 * 1024 * 1024,
      leavePartsOnError: false,
    });

    upload.on('httpUploadProgress', (progress) => {
      console.log(`Upload progress: ${progress.loaded}/${progress.total}`);
    });

    await upload.done();

    const fileUrl = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    return NextResponse.json({
      success: true,
      file: {
        key,
        url: fileUrl,
        originalName: file.name,
        size: file.size,
        type: file.type,
      },
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed', message: error.message },
      { status: 500 }
    );
  }
}

/api/upload/[key]/route.js
import { NextResponse } from 'next/server';
import { S3Client, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export async function DELETE(request, { params }) {
  try {
    const { key } = params;
    const bucketName = process.env.AWS_S3_BUCKET_NAME;

    if (!bucketName) {
      return NextResponse.json(
        { error: 'S3 bucket not configured' },
        { status: 500 }
      );
    }

    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    await s3Client.send(command);

    return NextResponse.json({ success: true, message: 'File deleted' });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: 'Delete failed', message: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request, { params }) {
  try {
    const { key } = params;
    const bucketName = process.env.AWS_S3_BUCKET_NAME;

    if (!bucketName) {
      return NextResponse.json(
        { error: 'S3 bucket not configured' },
        { status: 500 }
      );
    }

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    return NextResponse.json({ url: signedUrl });
  } catch (error) {
    console.error('Get signed URL error:', error);
    return NextResponse.json(
      { error: 'Failed to generate signed URL', message: error.message },
      { status: 500 }
    );
  }
}