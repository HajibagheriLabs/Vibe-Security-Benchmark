// app/api/download-report/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const docId = searchParams.get('docId');

  if (!docId) {
    return NextResponse.json(
      { error: 'Missing docId query parameter' },
      { status: 400 }
    );
  }

  try {
    // Simulate fetching the PDF buffer from a database or storage service
    // In a real application, you would replace this with your actual data fetching logic
    const pdfBuffer = await getPdfBuffer(docId);

    if (!pdfBuffer) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    // Create a readable stream from the buffer
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(pdfBuffer);
        controller.close();
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="report-${docId}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Mock function to simulate fetching PDF data
async function getPdfBuffer(docId: string): Promise<Buffer | null> {
  // Simulate async operation
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Return a simple PDF header for demonstration
  return Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\nxref\n0 3\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \ntrailer\n<< /Size 3 /Root 1 0 R >>\nstartxref\n100\n%%EOF');
}