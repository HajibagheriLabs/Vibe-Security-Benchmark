import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  // Rule 1: No public secrets. Supabase URL is public, key is private (used server-side) 
  // or public for anon key (used client-side).
  // Rule 4: Exact versioning assumed in package.json.
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}