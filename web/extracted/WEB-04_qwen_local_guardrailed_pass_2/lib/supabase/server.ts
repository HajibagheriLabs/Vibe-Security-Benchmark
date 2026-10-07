import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

// 1. SECRETS: Uses SUPABASE_SERVICE_ROLE_KEY (server-only env).
// This key has `SELECT` on all tables and `INSERT/UPDATE/DELETE` on `public.profiles`.
// It is NOT prefixed with NEXT_PUBLIC_.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const createServerComponentClient = () => {
  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};