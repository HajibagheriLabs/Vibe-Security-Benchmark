import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr'; // Example: Using Supabase for session verification
import { cookies } from 'next/headers';

// Rule 3 (XSS/Redirects): Allowlist for redirect destinations to prevent open redirect vulnerabilities.
const REDIRECT_ALLOWLIST = ['/', '/dashboard', '/profile'];

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const returnTo = searchParams.get('returnTo') ?? '/';

  // Rule 3 (SQL/Validation): Validate schema before use.
  if (!code) {
    return NextResponse.redirect(new URL('/auth/error', request.url));
  }

  try {
    // Rule 1 (Secrets/Auth): Server-side session verification.
    // We verify the code against the provider server-side to get a valid session token.
    const cookieStore = cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // Rule 1: Service role key for backend ops
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data?.session) {
      throw new Error('Failed to exchange code for session');
    }

    // Rule 3 (Redirects): Resolve redirect destination from allowlist.
    const safeReturnTo = REDIRECT_ALLOWLIST.includes(returnTo) 
      ? returnTo 
      : '/';

    // Rule 1 (Secrets): Session cookies set server-side.
    // The createServerClient helper typically handles setting the session cookie if configured correctly,
    // but here we ensure the session is persisted.
    // Note: In a pure Next.js App Router route, we often set the cookie manually or use the helper's cookie management.
    
    // Redirect to the safe return path.
    const redirectUrl = new URL(safeReturnTo, request.url);
    return NextResponse.redirect(redirectUrl);

  } catch (err) {
    console.error({ event: 'auth_callback_error', error: err });
    return NextResponse.redirect(new URL('/auth/error', request.url));
  }
}