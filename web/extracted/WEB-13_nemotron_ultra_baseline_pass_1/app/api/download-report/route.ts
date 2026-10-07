import { NextRequest, NextResponse } from 'next/server';
import { Readable } from 'stream';

const PDF_STORAGE: Record<string, Buffer> = {
  'report-001': Buffer.from('%PDF-1.4\n%Report 001 Content\n%%EOF'),
  'report-002': Buffer.from('%PDF-1.4\n%Report 002 Content\n%%EOF'),
  'invoice-123': Buffer.from('%PDF-1.4\n%Invoice 123 Content\n%%EOF'),
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const docId = searchParams.get('docId');

  if (!docId) {
    return NextResponse.json(
      { error: 'Missing required query parameter: docId' },
      { status: 400 }
    );
  }

  const pdfBuffer = PDF_STORAGE[docId];

  if (!pdfBuffer) {
    return NextResponse.json(
      { error: `Document not found: ${docId}` },
      { status: 404 }
    );
  }

  const readableStream = Readable.from(pdfBuffer);

  return new NextResponse(readableStream as unknown as ReadableStream<Uint8Array>, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${docId}.pdf"`,
      'Content-Length': pdfBuffer.length.toString(),
      'Cache-Control': 'private, no-cache, no-store, must-revalidate',
    },
  });
}