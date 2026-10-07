import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_MIME_TYPES = ['image/svg+xml'];
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'avatars');

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('avatar') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided. Expected a file under the "avatar" field.' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only SVG files are allowed.' },
        { status: 415 }
      );
    }

    // Validate file extension
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.svg')) {
      return NextResponse.json(
        { error: 'Invalid file extension. Only .svg files are allowed.' },
        { status: 415 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 2MB.' },
        { status: 413 }
      );
    }

    // Read file content for sanitization
    const buffer = Buffer.from(await file.arrayBuffer());
    const svgContent = buffer.toString('utf-8');

    // Basic SVG sanitization - strip script tags and event handlers
    const sanitizedSvg = sanitizeSvg(svgContent);

    if (!sanitizedSvg) {
      return NextResponse.json(
        { error: 'Invalid SVG content.' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const uniqueId = randomUUID();
    const safeFileName = `${uniqueId}.svg`;
    const filePath = path.join(UPLOAD_DIR, safeFileName);

    // Ensure upload directory exists
    await mkdir(UPLOAD_DIR, { recursive: true });

    // Write sanitized file
    await writeFile(filePath, sanitizedSvg, 'utf-8');

    // Construct public URL
    const publicUrl = `/uploads/avatars/${safeFileName}`;

    return NextResponse.json(
      {
        message: 'Avatar uploaded successfully',
        url: publicUrl,
        fileName: safeFileName,
        originalName: file.name,
        size: Buffer.byteLength(sanitizedSvg, 'utf-8'),
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

/**
 * Basic SVG sanitization to prevent XSS attacks.
 * Removes script tags, event handlers, and dangerous attributes.
 */
function sanitizeSvg(svgContent: string): string | null {
  // Check if content appears to be SVG
  if (!svgContent.includes('<svg')) {
    return null;
  }

  let sanitized = svgContent;

  // Remove script tags and their content
  sanitized = sanitized.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');

  // Remove event handler attributes (onclick, onload, onerror, etc.)
  sanitized = sanitized.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');

  // Remove javascript: protocol URLs
  sanitized = sanitized.replace(
    /\s(?:href|xlink:href|src)\s*=\s*["']?\s*javascript:[^"'\s>]*["']?/gi,
    ''
  );

  // Remove foreignObject tags (can contain HTML/scripts)
  sanitized = sanitized.replace(/<foreignObject\b[^>]*>[\s\S]*?<\/foreignObject>/gi, '');
  sanitized = sanitized.replace(/<foreignObject\b[^>]*\/?>/gi, '');

  // Remove iframe and embed tags
  sanitized = sanitized.replace(/<(?:iframe|embed|object)\b[^>]*>[\s\S]*?<\/(?:iframe|embed|object)>/gi, '');
  sanitized = sanitized.replace(/<(?:iframe|embed|object)\b[^>]*\/?>/gi, '');

  // Remove data: URLs in href/src attributes (can contain base64 encoded scripts)
  sanitized = sanitized.replace(
    /\s(?:href|xlink:href|src)\s*=\s*["']?\s*data:[^"'\s>]*["']?/gi,
    ''
  );

  // Remove XML processing instructions and DOCTYPE declarations
  sanitized = sanitized.replace(/<\?[\s\S]*?\?>/g, '');
  sanitized = sanitized.replace(/<!DOCTYPE[^>]*>/gi, '');

  // Verify we still have valid SVG after sanitization
  if (!sanitized.includes('<svg')) {
    return null;
  }

  return sanitized;
}