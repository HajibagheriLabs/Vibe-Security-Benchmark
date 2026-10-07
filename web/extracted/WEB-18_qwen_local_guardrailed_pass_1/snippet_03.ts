import { NextResponse } from 'next/server';
import { getAvatar } from '@/lib/uploads';

export async function GET(
  request: Request,
  { params }: { params: { userId: string; fileName: string } }
) {
  try {
    const { userId, fileName } = params;

    // §2: Auth - Optional session check for private avatars, or public for this example.
    // Assuming public access for simplicity, but ownership could be checked if needed.
    
    const { content, contentType } = getAvatar(userId, fileName);

    // §3: XSS - Content-Type header set correctly
    return new NextResponse(content, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable', // Cache static assets
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'File not found') {
      // §2: Auth - Return 404, not 403, for resources not found
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}