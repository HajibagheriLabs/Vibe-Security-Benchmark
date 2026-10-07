import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session'; // Assumed utility for verified session retrieval
import { validateReturnTo } from '@/lib/redirect';

export async function GET(request: NextRequest) {
  // 1. Authenticate: Verify the session token/cookie exists and is valid.
  const session = await getSession();
  if (!session) {
    // No session found; redirect to login.
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 2. Read returnTo parameter from query string.
  const returnTo = request.nextUrl.searchParams.get('returnTo');

  // 3. Validate returnTo against allowlist to prevent open redirect.
  //    Returns a safe URL string or null if invalid.
  const targetUrl = validateReturnTo(returnTo);

  // 4. Redirect user.
  //    Using a 302 redirect ensures the browser updates the address bar.
  return NextResponse.redirect(new URL(targetUrl ?? '/dashboard', request.url));
}