import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  if (request.nextUrl.pathname.startsWith('/api/avatars/')) {
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'none'; style-src 'unsafe-inline'; img-src data:; script-src 'none'; object-src 'none'; frame-ancestors 'none'; base-uri 'none';"
    );
  }
  
  return response;
}

export const config = {
  matcher: [
    '/api/avatars/:path*',
    '/profile/:path*',
  ],
};