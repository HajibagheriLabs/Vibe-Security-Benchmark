// app/uploads/avatars/[filename]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'avatars');

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const { filename } = params;

    // Validate filename to prevent path traversal
    if (!/^[a-f0-9-]+\.svg$/i.test(filename)) {
      return NextResponse.json(
        { error: 'Invalid filename.' },
        { status: 400 }
      );
    }

    const filePath = path.join(UPLOAD_DIR, filename);

    try {
      const fileContent = await readFile(filePath, 'utf-8');

      return new NextResponse(fileContent, {
        status: 200,
        headers: {
          'Content-Type': 'image/svg+xml',
          'Content-Disposition': `inline; filename="${filename}"`,
          'X-Content-Type-Options': 'nosniff',
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'",
        },
      });
    } catch (error) {
      return NextResponse.json(
        { error: 'File not found.' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('File serving error:', error);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}