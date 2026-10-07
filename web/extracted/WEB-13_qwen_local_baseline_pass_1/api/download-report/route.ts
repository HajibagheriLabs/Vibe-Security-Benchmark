import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const docId = searchParams.get('docId');

  if (!docId) {
    return NextResponse.json(
      { error: 'Missing docId query parameter' },
      { status: 400 }
    );
  }

  // Sanitize docId to prevent directory traversal
  const safeDocId = path.basename(docId);
  const filePath = path.join(process.cwd(), 'public', 'reports', `${safeDocId}.pdf`);

  try {
    const fileBuffer = await fs.readFile(filePath);

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${safeDocId}.pdf"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error(`Error reading report for docId ${docId}:`, error);
    return NextResponse.json(
      { error: 'Report not found or could not be read' },
      { status: 404 }
    );
  }
}