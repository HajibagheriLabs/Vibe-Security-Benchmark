// app/api/download-report/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Readable } from 'stream';
import { z } from 'zod';

// Security: Validate docId is a UUID to prevent injection and path traversal
const querySchema = z.object({
  docId: z.string().uuid('Invalid document ID format'),
});

export async function GET(request: NextRequest) {
  try {
    // Security: Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const validationResult = querySchema.safeParse({
      docId: searchParams.get('docId'),
    });

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid document ID' },
        { status: 400 }
      );
    }

    const { docId } = validationResult.data;

    // Security: Authenticate user via server-side session
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Security: Ownership check inside the WHERE clause - returns 404 for non-owned docs
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, file_path, file_name, mime_type, owner_id')
      .eq('id', docId)
      .eq('owner_id', user.id)
      .single();

    if (docError || !document) {
      // Security: Return 404 to prevent resource enumeration
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Security: Download file from storage with server-side credentials
    const { data: fileData, error: storageError } = await supabase.storage
      .from('reports')
      .download(document.file_path);

    if (storageError || !fileData) {
      console.error('Storage error:', storageError?.message);
      return NextResponse.json(
        { error: 'Failed to retrieve document' },
        { status: 500 }
      );
    }

    // Convert Blob to Buffer for streaming
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Security: Set appropriate headers for PDF streaming
    const headers = new Headers();
    headers.set('Content-Type', document.mime_type || 'application/pdf');
    headers.set(
      'Content-Disposition',
      `attachment; filename="${sanitizeFilename(document.file_name)}"`
    );
    headers.set('Content-Length', buffer.length.toString());
    headers.set('Cache-Control', 'private, no-store');
    headers.set('X-Content-Type-Options', 'nosniff');

    // Convert Buffer to Readable stream for efficient streaming
    const stream = Readable.from(buffer);

    return new NextResponse(stream as any, {
      headers,
      status: 200,
    });
  } catch (error) {
    // Security: Log structured error without sensitive data
    console.error(
      JSON.stringify({
        event: 'download_report_error',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    );
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Security: Sanitize filename to prevent header injection
function sanitizeFilename(filename: string): string {
  // Remove any CR/LF characters that could enable header injection
  const sanitized = filename
    .replace(/[\r\n\u2028\u2029]/g, '')
    .replace(/[^\w\s.-]/g, '_')
    .trim();
  
  return sanitized || 'report.pdf';
}