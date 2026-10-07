import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

const ALLOWED_MIME_TYPES = ['image/svg+xml'];
const MAX_FILE_SIZE = 1024 * 1024; // 1MB
const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'avatars');

function sanitizeSvg(content: string): string {
  // Remove potentially dangerous elements and attributes
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*/gi, '')
    .replace(/<link\b[^<]*/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
}

function validateSvgStructure(content: string): boolean {
  // Basic SVG structure validation
  const svgStart = content.trimStart().startsWith('<svg');
  const svgEnd = content.trimEnd().endsWith('</svg>');
  const hasXmlns = content.includes('xmlns="http://www.w3.org/2000/svg"') || 
                   content.includes("xmlns='http://www.w3.org/2000/svg'");
  
  return svgStart && svgEnd && hasXmlns;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('avatar') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only SVG files are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 1MB.' },
        { status: 400 }
      );
    }

    // Read and validate file content
    const buffer = await file.arrayBuffer();
    const content = new TextDecoder().decode(buffer);

    if (!validateSvgStructure(content)) {
      return NextResponse.json(
        { error: 'Invalid SVG structure. Must be a valid SVG with xmlns attribute.' },
        { status: 400 }
      );
    }

    // Sanitize SVG content
    const sanitizedContent = sanitizeSvg(content);

    // Generate unique filename
    const filename = `${uuidv4()}.svg`;
    const filepath = join(UPLOAD_DIR, filename);

    // Write sanitized SVG to disk
    await writeFile(filepath, sanitizedContent, 'utf-8');

    // Return the public URL
    const publicUrl = `/uploads/avatars/${filename}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}