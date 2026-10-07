import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'avatars');

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    // Validate filename format (UUID + .svg)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.svg$/i;
    if (!uuidRegex.test(filename)) {
      return NextResponse.json(
        { error: 'Invalid filename format' },
        { status: 400 }
      );
    }

    const filepath = join(UPLOAD_DIR, filename);

    // Check if file exists
    if (!existsSync(filepath)) {
      return NextResponse.json(
        { error: 'Avatar not found' },
        { status: 404 }
      );
    }

    // Read file
    const content = await readFile(filepath, 'utf-8');

    // Return SVG with proper headers
    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Avatar fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}