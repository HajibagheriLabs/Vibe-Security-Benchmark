import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_REDIRECT = '/dashboard';
const ALLOWED_PATHS = ['/dashboard', '/settings', '/profile', '/'];

function isAllowedReturnPath(path: string): boolean {
  // Only allow relative paths to prevent open redirect vulnerabilities
  if (!path.startsWith('/') || path.startsWith('//')) {
    return false;
  }
  
  return ALLOWED_PATHS.some(
    (allowedPath) => path === allowedPath || path.startsWith(`${allowedPath}/`)
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const returnTo = searchParams.get('returnTo');

  // Validate and sanitize the returnTo parameter
  const redirectPath = returnTo && isAllowedReturnPath(returnTo) 
    ? returnTo 
    : DEFAULT_REDIRECT;

  // Create the redirect response
  const response = NextResponse.redirect(new URL(redirectPath, request.url));

  // Clear any auth-related cookies if needed (example)
  response.cookies.delete('auth_pending');

  return response;
}

export async function POST(request: NextRequest) {
  // Handle POST callbacks as well (e.g., for form-based auth flows)
  return GET(request);
}