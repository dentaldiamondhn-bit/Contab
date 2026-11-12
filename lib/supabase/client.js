import { createBrowserClient } from '@supabase/ssr';

/**
 * Creates a Supabase browser client for use in Client Components.
 * Consumers call this as const supabase = createSupabaseClient();
 * and use it directly for table queries and RPC calls.
 */
export function createSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      'Supabase env vars (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY) are not defined.'
    );
  }

  return createBrowserClient(url, key);
}
