import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const querySchema = z.object({
  docId: z.string().uuid(),
});

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) {
    return new NextResponse('Invalid docId', { status: 400 });
  }

  const { docId } = parsed.data;

  const { data: doc, error } = await supabase
    .from('documents')
    .select('id, owner_id, storage_path, mime_type, filename')
    .eq('id', docId)
    .eq('owner_id', user.id)
    .single();

  if (error || !doc) {
    return new NextResponse('Not Found', { status: 404 });
  }

  if (doc.mime_type !== 'application/pdf') {
    return new NextResponse('Unsupported file type', { status: 400 });
  }

  const { data: fileData, error: downloadError } = await supabase.storage
    .from('documents')
    .download(doc.storage_path);

  if (downloadError || !fileData) {
    return new NextResponse('File not found', { status: 404 });
  }

  const arrayBuffer = await fileData.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(doc.filename)}"`,
      'Content-Length': buffer.length.toString(),
      'Cache-Control': 'private, no-store',
    },
  });
}