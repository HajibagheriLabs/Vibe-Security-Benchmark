import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'avatars');

// Ensure upload directory exists on startup or first request
async function ensureUploadDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

export async function POST(request: NextRequest) {
  try {
    await ensureUploadDir();

    const formData = await request.formData();
    const file = formData.get('avatar') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate MIME type (allow only SVG)
    const allowedTypes = ['image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only SVG is allowed.' }, { status: 400 });
    }

    // Validate size (e.g., max 1MB)
    const maxSize = 1 * 1024 * 1024; // 1MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large. Max 1MB.' }, { status: 400 });
    }

    // Read file content to validate it's valid XML/SVG
    const buffer = Buffer.from(await file.arrayBuffer());
    const content = buffer.toString('utf-8');

    // Basic XML check: starts with <svg
    if (!content.trim().startsWith('<svg')) {
      return NextResponse.json({ error: 'Invalid SVG content.' }, { status: 400 });
    }

    // Generate unique filename
    const fileName = `${randomUUID()}.svg`;
    const filePath = path.join(UPLOAD_DIR, fileName);

    // Write file
    await fs.writeFile(filePath, buffer);

    // Return public URL path
    const publicUrl = `/avatars/${fileName}`;

    return NextResponse.json({ url: publicUrl }, { status: 200 });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}