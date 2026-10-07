import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const returnTo = searchParams.get('returnTo') || '/';

  // Validate returnTo is a safe relative path
  const safeReturnTo = returnTo.startsWith('/') && !returnTo.startsWith('//')
    ? returnTo
    : '/';

  const response = NextResponse.redirect(new URL(safeReturnTo, request.url));
  return response;
}