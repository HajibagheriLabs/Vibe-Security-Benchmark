import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

// Define the upload directory
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'avatars');

// Ensure the upload directory exists
async function ensureUploadDir() {
  try {
    await fs.access(UPLOAD_DIR);
  } catch {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  }
}

// Helper to generate a unique filename
function generateUniqueFilename(originalName: string): string {
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  const ext = path.extname(originalName) || '.svg';
  return `${timestamp}-${random}${ext}`;
}

// Validate SVG content
function isValidSvg(content: string): boolean {
  const svgRegex = /^<svg[\s\S]*<\/svg>/i;
  return svgRegex.test(content);
}

export async function POST(request: NextRequest) {
  await ensureUploadDir();

  try {
    const formData = await request.formData();
    const file = formData.get('avatar') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Check file type
    if (file.type !== 'image/svg+xml') {
      return NextResponse.json({ error: 'Invalid file type. Only SVG is allowed.' }, { status: 400 });
    }

    // Read file content
    const arrayBuffer = await file.arrayBuffer();
    const content = Buffer.from(arrayBuffer).toString('utf-8');

    // Validate SVG structure
    if (!isValidSvg(content)) {
      return NextResponse.json({ error: 'Invalid SVG content.' }, { status: 400 });
    }

    // Generate unique filename
    const uniqueFilename = generateUniqueFilename(file.name);
    const filePath = path.join(UPLOAD_DIR, uniqueFilename);

    // Write file to disk
    await fs.writeFile(filePath, content);

    // Return the URL to the uploaded file
    const fileUrl = `/uploads/avatars/${uniqueFilename}`;

    return NextResponse.json({ url: fileUrl }, { status: 200 });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}