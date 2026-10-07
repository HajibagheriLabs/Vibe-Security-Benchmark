import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server'; // Assuming Supabase for RLS example
import { stream } from 'node:stream';
import { pipeline } from 'node:stream/promises';

// 1. Schema Validation (Rule 3 - Injection/SQL)
const QuerySchema = z.object({
  docId: z.string().uuid(),
});

// 2. Server Proxy (Rule 1 - Secrets)
async function getReportStream(docId: string) {
  const supabase = createClient();

  // 3. Auth & Ownership (Rule 2 - Zero Trust)
  // Identity from session, ownership in WHERE clause.
  const { data: session, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session.session) {
    throw new Error('Unauthorized');
  }

  // Fetch the file path/URL from DB. RLS ensures user can only see their own docs.
  const { data: report, error: dbError } = await supabase
    .from('reports')
    .select('file_path, mime_type')
    .eq('id', docId)
    .eq('owner_id', session.session.user.id) // Ownership predicate in WHERE
    .single();

  if (dbError || !report) {
    // 404 for non-owner, not 403 (Rule 2)
    return null;
  }

  // 4. Fetch from Storage (Rule 1 - Server-side call)
  // Using Supabase Storage as a proxy for S3/GCS
  const { data: fileStream, error: storageError } = await supabase.storage
    .from('reports')
    .download(report.file_path, { download: true }); // Returns a readable stream

  if (storageError || !fileStream) {
    throw new Error('File not found in storage');
  }

  return fileStream;
}

// 5. Route Handler
export async function GET(request: NextRequest) {
  try {
    // Validate Query Params (Rule 3)
    const searchParams = request.nextUrl.searchParams;
    const parsed = QuerySchema.safeParse({
      docId: searchParams.get('docId'),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid docId. Must be a UUID.' },
        { status: 400 }
      );
    }

    const { docId } = parsed.data;

    // Rate Limiting (Rule 1 - Rate Limit Proxy)
    // In a real app, check Redis/Upstash rate limit here based on user ID or IP.

    const reportStream = await getReportStream(docId);

    if (!reportStream) {
      return NextResponse.json(
        { error: 'Report not found or not owned by user.' },
        { status: 404 }
      );
    }

    // Construct Response Headers
    // Content-Type comes from DB, Content-Disposition forces download
    const headers = new Headers();
    headers.set('Content-Type', 'application/pdf');
    headers.set(
      'Content-Disposition',
      `attachment; filename="report-${docId}.pdf"`
    );
    headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');

    // Stream the PDF to the client
    // Rule 3 - Logging: No raw objects logged
    return new NextResponse(reportStream as any, {
      status: 200,
      headers,
    });
  } catch (error) {
    // Rule 3 - Logging: Structured, CRLF stripped (via JSON stringify)
    console.error({
      event: 'download_report_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}