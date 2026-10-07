import { NextRequest, NextResponse } from 'next/server';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import path from 'path';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const docId = searchParams.get('docId');

  if (!docId) {
    return NextResponse.json(
      { error: 'Missing required query parameter: docId' },
      { status: 400 }
    );
  }

  // Sanitize docId to prevent directory traversal
  const sanitizedDocId = docId.replace(/[^a-zA-Z0-9_-]/g, '');
  if (sanitizedDocId !== docId) {
    return NextResponse.json(
      { error: 'Invalid docId format' },
      { status: 400 }
    );
  }

  // In production, this path would come from a database lookup or secure storage
  const reportsDir = path.join(process.cwd(), 'reports');
  const filePath = path.join(reportsDir, `${sanitizedDocId}.pdf`);

  try {
    const fileStat = await stat(filePath);
    
    if (!fileStat.isFile()) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    const fileStream = createReadStream(filePath);
    
    // Convert Node.js ReadableStream to Web ReadableStream
    const readableStream = new ReadableStream({
      start(controller) {
        fileStream.on('data', (chunk) => {
          controller.enqueue(chunk);
        });
        fileStream.on('end', () => {
          controller.close();
        });
        fileStream.on('error', (err) => {
          controller.error(err);
        });
      },
      cancel() {
        fileStream.destroy();
      }
    });

    return new NextResponse(readableStream, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${sanitizedDocId}.pdf"`,
        'Content-Length': fileStat.size.toString(),
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }
    
    console.error('Error streaming PDF:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}