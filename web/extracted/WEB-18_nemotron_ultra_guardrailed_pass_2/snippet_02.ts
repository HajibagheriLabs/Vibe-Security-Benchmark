import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Server-only client for authenticated access
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    const filePath = path.join('/');

    // Authenticate user
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Verify ownership via RLS policy (filePath must start with user.id/)
    if (!filePath.startsWith(`${user.id}/`)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Download from private bucket
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from('avatars')
      .download(filePath);

    if (downloadError || !fileData) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Convert to array buffer
    const arrayBuffer = await fileData.arrayBuffer();
    
    // Return with security headers
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; img-src data:;",
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, max-age=3600, immutable',
        'Cross-Origin-Resource-Policy': 'same-origin',
      },
    });

  } catch (error) {
    console.error({ event: 'avatar_serve_error', error: error instanceof Error ? error.message : 'unknown' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}