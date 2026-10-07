// app/api/download-report/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Readable } from 'stream';
import { z } from 'zod';

// Security: Validate docId as UUID to prevent injection and enumeration
const querySchema = z.object({
  docId: z.string().uuid({
    message: 'Invalid document ID format',
  }),
});

export async function GET(request: NextRequest) {
  try {
    // Security: Authenticate user from verified session
    const supabase = await createClient();
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

    // Security: Validate query parameters with explicit schema
    const { searchParams } = new URL(request.url);
    const validationResult = querySchema.safeParse({
      docId: searchParams.get('docId'),
    });

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request parameters' },
        { status: 400 }
      );
    }

    const { docId } = validationResult.data;

    // Security: Ownership predicate inside WHERE clause - return 404 for non-owned docs
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, file_path, mime_type, file_name, owner_id')
      .eq('id', docId)
      .eq('owner_id', user.id)
      .single();

    if (docError || !document) {
      // Security: 404 prevents resource enumeration
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Security: Verify it's actually a PDF
    if (document.mime_type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Invalid document type' },
        { status: 400 }
      );
    }

    // Security: Download from storage with server-side credentials only
    const { data: fileData, error: storageError } = await supabase.storage
      .from('reports')
      .download(document.file_path);

    if (storageError || !fileData) {
      console.error({
        event: 'storage_download_error',
        userId: user.id,
        docId,
        error: storageError?.message,
      });
      return NextResponse.json(
        { error: 'Failed to retrieve document' },
        { status: 500 }
      );
    }

    // Security: Sanitize filename for Content-Disposition header
    const sanitizedFileName = document.file_name
      .replace(/[\r\n\u2028\u2029]/g, '')
      .replace(/[^\w\s.-]/g, '_');

    // Stream the PDF to client
    const stream = Readable.from(fileData.stream() as any);
    const readableStream = new ReadableStream({
      start(controller) {
        stream.on('data', (chunk) => {
          controller.enqueue(chunk);
        });
        stream.on('end', () => {
          controller.close();
        });
        stream.on('error', (err) => {
          controller.error(err);
        });
      },
    });

    return new NextResponse(readableStream, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${sanitizedFileName}"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    // Security: Log structured error without sensitive data
    console.error({
      event: 'download_report_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}