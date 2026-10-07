// app/api/auth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Allowlist of permitted redirect destinations
// Security: Prevents open redirect attacks by only allowing known-safe paths
const ALLOWED_REDIRECT_PATHS = new Set([
  '/dashboard',
  '/profile',
  '/settings',
  '/account',
  '/',
]);

function sanitizeReturnTo(returnTo: string | null): string {
  // Default to dashboard if no returnTo provided
  if (!returnTo) {
    return '/dashboard';
  }

  // Strip control characters and normalize
  const cleaned = returnTo.replace(/[\r\n\u2028\u2029]/g, '').trim();

  // Only allow same-origin relative paths from the allowlist
  if (ALLOWED_REDIRECT_PATHS.has(cleaned)) {
    return cleaned;
  }

  // Reject absolute URLs, protocol-relative URLs, and unknown paths
  return '/dashboard';
}

export async function GET(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const returnTo = requestUrl.searchParams.get('returnTo');

    // Validate the auth code exists
    if (!code) {
      return NextResponse.redirect(new URL('/login?error=missing_code', request.url));
    }

    // Exchange the auth code for a session
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            cookieStore.set(name, value, options);
          },
          remove(name: string, options: any) {
            cookieStore.set(name, '', { ...options, maxAge: 0 });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      // Log structured error without sensitive data
      console.error({
        event: 'auth_callback_error',
        errorType: error.name,
        // Do not log the full error object as it may contain sensitive info
      });
      return NextResponse.redirect(new URL('/login?error=auth_failed', request.url));
    }

    // Sanitize and validate the redirect destination
    const safeRedirectPath = sanitizeReturnTo(returnTo);
    const redirectUrl = new URL(safeRedirectPath, request.url);

    // Set security headers on the redirect response
    const response = NextResponse.redirect(redirectUrl);
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('X-Frame-Options', 'DENY');

    return response;
  } catch (error) {
    // Log structured error without sensitive data
    console.error({
      event: 'auth_callback_unexpected_error',
      errorType: error instanceof Error ? error.name : 'unknown',
    });
    return NextResponse.redirect(new URL('/login?error=unexpected', request.url));
  }
}