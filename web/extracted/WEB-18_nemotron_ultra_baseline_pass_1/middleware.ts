import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Add security headers for avatar uploads
  if (request.nextUrl.pathname.startsWith('/api/upload')) {
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  }

  // Add caching headers for served avatars
  if (request.nextUrl.pathname.startsWith('/uploads/avatars/')) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; img-src data:");
  }

  return response;
}

export const config = {
  matcher: [
    '/api/upload/:path*',
    '/uploads/avatars/:path*',
  ],
};