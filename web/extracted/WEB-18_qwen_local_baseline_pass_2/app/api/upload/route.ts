// app/api/upload/route.ts
import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

const UPLOAD_DIR = join(process.cwd(), 'public', 'avatars');

export async function POST(request: Request) {
  try {
    // Ensure upload directory exists
    await mkdir(UPLOAD_DIR, { recursive: true });

    const formData = await request.formData();
    const file = formData.get('avatar') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate file type
    if (file.type !== 'image/svg+xml') {
      return NextResponse.json({ error: 'Invalid file type. Only SVG allowed.' }, { status: 400 });
    }

    // Validate file size (e.g., max 1MB)
    const MAX_SIZE = 1 * 1024 * 1024; // 1MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large. Max size is 1MB.' }, { status: 400 });
    }

    // Generate unique filename
    const fileName = `${uuidv4()}.svg`;
    const filePath = join(UPLOAD_DIR, fileName);

    // Write file to disk
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    // Return the public URL
    const fileUrl = `/avatars/${fileName}`;

    return NextResponse.json({ url: fileUrl }, { status: 200 });

  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}