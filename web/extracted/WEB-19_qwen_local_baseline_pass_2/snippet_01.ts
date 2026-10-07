import { NextRequest, NextResponse } from 'next/server';
import { parse } from 'url';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const returnTo = searchParams.get('returnTo') ?? '/';

  // Validate returnTo to prevent open redirect vulnerabilities
  const parsedUrl = parse(returnTo);
  const isSafe = !parsedUrl?.hostname || parsedUrl.hostname === request.headers.get('host');

  if (!isSafe) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Simulate session creation (e.g., via cookies or JWT)
  const response = NextResponse.redirect(new URL(returnTo, request.url));
  response.cookies.set('session_token', 'example-session-token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });

  return response;
}