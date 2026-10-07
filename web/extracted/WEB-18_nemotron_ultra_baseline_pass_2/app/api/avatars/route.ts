import { NextRequest, NextResponse } from 'next/server';
import { uploadSchema } from '@/lib/validators';
import { saveAvatar } from '@/lib/storage';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const contentType = request.headers.get('content-type') || '';
    
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'Content-Type must be multipart/form-data' },
        { status: 400 }
      );
    }
    
    const formData = await request.formData();
    const file = formData.get('avatar') as File | null;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No avatar file provided' },
        { status: 400 }
      );
    }
    
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 2MB' },
        { status: 400 }
      );
    }
    
    if (!file.name.toLowerCase().endsWith('.svg')) {
      return NextResponse.json(
        { error: 'File must have .svg extension' },
        { status: 400 }
      );
    }
    
    const svgContent = await file.text();
    
    const validationResult = uploadSchema.safeParse({
      svg: svgContent,
      filename: file.name,
    });
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid SVG', details: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    
    const filename = await saveAvatar(svgContent, file.name);
    const avatarUrl = `/api/avatars/${filename}`;
    
    return NextResponse.json(
      { 
        success: true, 
        filename,
        url: avatarUrl,
        message: 'Avatar uploaded successfully' 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/app/api/avatars/[filename]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAvatarPath } from '@/lib/storage';
import { promises as fs } from 'fs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
): Promise<NextResponse> {
  try {
    const { filename } = await params;
    const filepath = await getAvatarPath(filename);
    
    if (!filepath) {
      return NextResponse.json(
        { error: 'Avatar not found' },
        { status: 404 }
      );
    }
    
    const content = await fs.readFile(filepath, 'utf-8');
    
    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; img-src data:;",
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'no-referrer',
      },
    });
  } catch (error) {
    console.error('Serve error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
): Promise<NextResponse> {
  try {
    const { filename } = await params;
    const { deleteAvatar } = await import('@/lib/storage');
    const deleted = await deleteAvatar(filename);
    
    if (!deleted) {
      return NextResponse.json(
        { error: 'Avatar not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, message: 'Avatar deleted' });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}