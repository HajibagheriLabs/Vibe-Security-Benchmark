import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { stat } from 'fs/promises';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'avatars');

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const { filename } = params;

    // Validate filename to prevent path traversal
    if (!isValidFilename(filename)) {
      return NextResponse.json(
        { error: 'Invalid filename.' },
        { status: 400 }
      );
    }

    const filePath = path.join(UPLOAD_DIR, filename);

    // Check if file exists
    try {
      const fileStat = await stat(filePath);
      if (!fileStat.isFile()) {
        return NextResponse.json(
          { error: 'File not found.' },
          { status: 404 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: 'File not found.' },
        { status: 404 }
      );
    }

    // Read file
    const fileContent = await readFile(filePath, 'utf-8');

    // Return SVG with proper headers
    return new NextResponse(fileContent, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'",
      },
    });
  } catch (error) {
    console.error('Error serving avatar:', error);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}

function isValidFilename(filename: string): boolean {
  // Only allow UUID-style filenames with .svg extension
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.svg$/i;
  return uuidPattern.test(filename);
}