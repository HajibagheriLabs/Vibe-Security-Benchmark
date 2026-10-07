// app/api/download-report/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Readable } from 'stream';

// Mock PDF data store - replace with actual data source in production
const pdfStore: Record<string, Buffer> = {
  'report-123': Buffer.from('%PDF-1.4 mock content for report-123'),
  'report-456': Buffer.from('%PDF-1.4 mock content for report-456'),
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

  const pdfBuffer = pdfStore[docId];

  if (!pdfBuffer) {
    return NextResponse.json(
      { error: `Document with docId "${docId}" not found` },
      { status: 404 }
    );
  }

  const stream = Readable.from(pdfBuffer);

  return new NextResponse(stream as any, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${docId}.pdf"`,
      'Content-Length': pdfBuffer.length.toString(),
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}