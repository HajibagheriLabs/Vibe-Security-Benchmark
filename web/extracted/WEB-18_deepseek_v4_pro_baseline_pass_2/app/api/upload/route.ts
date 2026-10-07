// app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { sanitizeSvg } from '@/lib/svg-sanitizer';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_MIME_TYPE = 'image/svg+xml';
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'avatars');

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('avatar') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided. Expected field name "avatar".' },
        { status: 400 }
      );
    }

    // Validate file type
    if (file.type !== ALLOWED_MIME_TYPE) {
      return NextResponse.json(
        { error: 'Invalid file type. Only SVG files are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 2MB.' },
        { status: 400 }
      );
    }

    // Read file content
    const buffer = Buffer.from(await file.arrayBuffer());
    const svgContent = buffer.toString('utf-8');

    // Sanitize SVG to prevent XSS attacks
    const sanitizedSvg = sanitizeSvg(svgContent);

    if (!sanitizedSvg) {
      return NextResponse.json(
        { error: 'Invalid or unsafe SVG content.' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const fileId = randomUUID();
    const filename = `${fileId}.svg`;
    const filePath = path.join(UPLOAD_DIR, filename);

    // Ensure upload directory exists
    await mkdir(UPLOAD_DIR, { recursive: true });

    // Write sanitized file to disk
    await writeFile(filePath, sanitizedSvg, 'utf-8');

    // Return the public URL
    const publicUrl = `/uploads/avatars/${filename}`;

    return NextResponse.json(
      {
        success: true,
        url: publicUrl,
        filename,
        size: sanitizedSvg.length,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error during file upload.' },
      { status: 500 }
    );
  }
}