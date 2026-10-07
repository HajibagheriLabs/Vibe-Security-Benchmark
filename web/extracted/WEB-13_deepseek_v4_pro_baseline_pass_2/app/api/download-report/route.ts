// app/api/download-report/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Readable } from 'stream';
import { createReadStream } from 'fs';
import { join } from 'path';
import { stat } from 'fs/promises';

interface DocRegistry {
  [key: string]: {
    path: string;
    contentType: string;
    filename: string;
  };
}

// In production, this would come from a database or secure file store
const DOC_REGISTRY: DocRegistry = {
  'annual-2024': {
    path: join(process.cwd(), 'reports', 'annual-2024.pdf'),
    contentType: 'application/pdf',
    filename: 'annual-report-2024.pdf',
  },
  'quarterly-q1-2024': {
    path: join(process.cwd(), 'reports', 'quarterly-q1-2024.pdf'),
    contentType: 'application/pdf',
    filename: 'quarterly-report-q1-2024.pdf',
  },
  'financial-summary': {
    path: join(process.cwd(), 'reports', 'financial-summary.pdf'),
    contentType: 'application/pdf',
    filename: 'financial-summary.pdf',
  },
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const docId = searchParams.get('docId');

  if (!docId) {
    return NextResponse.json(
      { error: 'docId query parameter is required' },
      { status: 400 }
    );
  }

  const doc = DOC_REGISTRY[docId];

  if (!doc) {
    return NextResponse.json(
      { error: `Document with docId "${docId}" not found` },
      { status: 404 }
    );
  }

  try {
    // Verify the file exists and get its size
    const fileStat = await stat(doc.path);

    if (!fileStat.isFile()) {
      return NextResponse.json(
        { error: 'Document file is not accessible' },
        { status: 404 }
      );
    }

    // Create a readable stream from the file
    const fileStream = createReadStream(doc.path);

    // Convert Node.js Readable stream to Web ReadableStream
    const webStream = Readable.toWeb(fileStream) as ReadableStream;

    // Return streaming response
    return new NextResponse(webStream, {
      status: 200,
      headers: {
        'Content-Type': doc.contentType,
        'Content-Disposition': `attachment; filename="${doc.filename}"`,
        'Content-Length': fileStat.size.toString(),
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Error streaming document:', error);
    return NextResponse.json(
      { error: 'Failed to stream document' },
      { status: 500 }
    );
  }
}