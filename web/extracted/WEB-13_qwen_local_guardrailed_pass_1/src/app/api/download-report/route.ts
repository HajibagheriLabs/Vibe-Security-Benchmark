import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth'; // Assumed server-side auth utility
import { db } from '@/lib/db'; // Assumed Prisma/Drizzle/Server DB client
import { stream } from 'node:stream';

// Schema validation for the query parameter
const QuerySchema = z.object({
  docId: z.string().uuid(),
});

export async function GET(request: NextRequest) {
  // 1. Authenticate & Authorize (Rule 2)
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Parse & Validate Query (Rule 3)
  const searchParams = request.nextUrl.searchParams;
  const parsed = QuerySchema.safeParse({
    docId: searchParams.get('docId'),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid docId' }, { status: 400 });
  }

  const { docId } = parsed.data;

  // 3. Fetch Resource with Ownership Predicate in WHERE (Rule 2)
  // Using a mock DB interface. In production, this must use bound parameters.
  const report = await db.report.findFirst({
    where: {
      id: docId,
      ownerId: session.user.id, // Ownership check inside the query
    },
  });

  if (!report) {
    // 404 for non-owned resources (Rule 2)
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }

  // 4. Retrieve PDF Stream (Rule 1 - Server-side secret access)
  // Assuming a storage service like AWS S3 or a local file path resolved by a server secret
  const pdfStream = await getReportPdfStream(report.storageKey);

  // 5. Stream Response
  return new NextResponse(pdfStream, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="report-${docId}.pdf"`,
      // Rule 3: Cache control for sensitive reports
      'Cache-Control': 'private, no-store',
    },
  });
}

// Helper to fetch the actual PDF content
// Rule 1: Uses server-side credentials (e.g., S3 credentials in .env)
async function getReportPdfStream(storageKey: string): Promise<stream.Readable> {
  // Example implementation using a hypothetical storage client
  // const client = new StorageClient(); // Uses server-side .env secrets
  // return client.getObject(storageKey).Body as stream.Readable;
  
  // Mock implementation for static analysis verification
  const readable = stream.Readable.from(Buffer.from('Mock PDF Content'));
  return readable;
}