// app/auth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Allowlist of valid redirect destinations
// Never echo user-supplied URLs directly into redirects
const ALLOWED_REDIRECT_PATHS = new Set([
  '/dashboard',
  '/account',
  '/settings',
  '/profile',
  '/',
]);

function sanitizeReturnTo(returnTo: string | null): string {
  if (!returnTo) {
    return '/dashboard';
  }

  // Strip control characters and ANSI escapes before any processing
  const sanitized = returnTo
    .replace(/[\r\n\u2028\u2029]/g, '')
    .replace(/\u001b\[[0-9;]*m/g, '');

  // Only allow exact matches from the allowlist
  if (ALLOWED_REDIRECT_PATHS.has(sanitized)) {
    return sanitized;
  }

  // Default safe redirect
  return '/dashboard';
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const returnTo = requestUrl.searchParams.get('returnTo');

  // Validate the code parameter exists
  if (!code) {
    return NextResponse.redirect(new URL('/auth/error', request.url), {
      status: 302,
    });
  }

  const cookieStore = cookies();
  
  // Create server-side Supabase client
  // Identity is verified server-side, never from client claims
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );

  // Exchange the auth code for a session
  // This happens server-side, never exposing tokens to the client
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    // Log structured error without sensitive data
    console.error({
      event: 'auth_callback_error',
      error: error.message,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.redirect(new URL('/auth/error', request.url), {
      status: 302,
    });
  }

  // Sanitize and validate the redirect destination
  const safeRedirectPath = sanitizeReturnTo(returnTo);
  const redirectUrl = new URL(safeRedirectPath, request.url);

  // Set security headers on the redirect response
  const response = NextResponse.redirect(redirectUrl, {
    status: 302,
  });

  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Frame-Options', 'DENY');

  return response;
}