import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_RETURN_TO = '/dashboard';
const ALLOWED_PATHS = ['/dashboard', '/settings', '/profile', '/account'];

function sanitizeReturnTo(returnTo: string | null): string {
  if (!returnTo) return DEFAULT_RETURN_TO;

  // Must be a relative path starting with a single slash
  if (!returnTo.startsWith('/') || returnTo.startsWith('//')) {
    return DEFAULT_RETURN_TO;
  }

  // Prevent protocol-relative or absolute URLs
  if (returnTo.includes('://') || returnTo.includes('\\')) {
    return DEFAULT_RETURN_TO;
  }

  // Optional: restrict to known safe paths
  if (!ALLOWED_PATHS.some((path) => returnTo === path || returnTo.startsWith(`${path}/`))) {
    return DEFAULT_RETURN_TO;
  }

  return returnTo;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const returnTo = sanitizeReturnTo(searchParams.get('returnTo'));

  const redirectUrl = new URL(returnTo, request.url);

  return NextResponse.redirect(redirectUrl);
}

export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const returnTo = sanitizeReturnTo(searchParams.get('returnTo'));

  const redirectUrl = new URL(returnTo, request.url);

  return NextResponse.redirect(redirectUrl);
}