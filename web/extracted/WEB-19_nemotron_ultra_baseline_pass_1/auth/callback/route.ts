import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const returnTo = searchParams.get('returnTo');

  // Validate returnTo to prevent open redirect attacks
  const safeReturnTo = isSafeRedirectUrl(returnTo) ? returnTo : '/';

  // In a real implementation, you would handle the auth callback here
  // (e.g., exchange code for tokens, set session cookies, etc.)
  
  return NextResponse.redirect(new URL(safeReturnTo, request.url));
}

function isSafeRedirectUrl(url: string | null): boolean {
  if (!url) return false;
  
  try {
    const parsed = new URL(url, 'http://localhost');
    // Only allow relative paths (no protocol, no host)
    return !parsed.protocol || parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}