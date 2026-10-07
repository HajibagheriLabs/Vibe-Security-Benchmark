import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const returnTo = searchParams.get('returnTo');

  if (returnTo) {
    // Ensure returnTo starts with / to prevent open redirect vulnerabilities
    if (!returnTo.startsWith('/')) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.redirect(new URL(returnTo, request.url));
  }

  return NextResponse.redirect(new URL('/', request.url));
}