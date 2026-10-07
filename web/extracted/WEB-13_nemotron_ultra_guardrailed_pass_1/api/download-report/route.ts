import { createReadStream, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_DOCS = new Set(['quarterly-report', 'annual-summary', 'compliance-audit']);
const REPORTS_DIR = resolve(process.cwd(), 'reports');

export async function GET(request: NextRequest) {
  const docId = request.nextUrl.searchParams.get('docId');

  if (!docId || !ALLOWED_DOCS.has(docId)) {
    return NextResponse.json({ error: 'Invalid or missing docId' }, { status: 400 });
  }

  const filePath = join(REPORTS_DIR, `${docId}.pdf`);

  try {
    const stats = statSync(filePath);
    const stream = createReadStream(filePath);

    return new NextResponse(stream as ReadableStream, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': stats.size.toString(),
        'Content-Disposition': `attachment; filename="${docId}.pdf"`,
        'Cache-Control': 'private, max-age=0, must-revalidate',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }
}