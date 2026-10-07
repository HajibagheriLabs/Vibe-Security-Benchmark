// app/api/upload/route.ts
import { NextResponse } from 'next/server';
import { put } from '@vercel/blob'; // Using Vercel Blob for simplicity, or custom S3 client
import { z } from 'zod';
import { randomUUID } from 'crypto';

// Schema validation for metadata passed in body
const uploadSchema = z.object({
  fileName: z.string().max(255),
  fileType: z.string().min(1).max(100),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fileName, fileType } = uploadSchema.parse(body);

    // Read body from request if it's multipart/form-data, or assume raw buffer for this example
    // For a robust file upload, we typically parse multipart. Here we assume a simple JSON payload with base64 or raw buffer for demonstration of the S3 call.
    // In a real scenario: const formData = await request.formData(); const file = formData.get('file');

    const fileBuffer = await request.arrayBuffer();
    const buffer = Buffer.from(fileBuffer);

    // Generate unique key
    const key = `${randomUUID()}-${fileName}`;

    // Upload to S3
    await uploadToS3(process.env.S3_BUCKET!, key, buffer, fileType);

    return NextResponse.json({ success: true, key });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}

// Helper to import the S3 client
import { uploadToS3 } from '@/lib/s3';