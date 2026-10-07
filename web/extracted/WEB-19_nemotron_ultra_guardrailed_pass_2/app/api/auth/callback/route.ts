import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

const ALLOWED_REDIRECT_HOSTS = new Set([
  'localhost:3000',
  'app.example.com',
]);

function isAllowedRedirectUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_REDIRECT_HOSTS.has(parsed.host);
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const returnTo = searchParams.get('returnTo') ?? '/dashboard';

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(`${origin}/login?error=auth_failed`);
    }
  }

  const redirectUrl = returnTo.startsWith('/')
    ? `${origin}${returnTo}`
    : returnTo;

  if (!isAllowedRedirectUrl(redirectUrl)) {
    return NextResponse.redirect(`${origin}/dashboard`);
  }

  return NextResponse.redirect(redirectUrl);
}