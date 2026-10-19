// `lib/supabase-db.ts` exporta `supabase`; las rutas SAR lo importan de
// `@/lib/supabase-db`. Misma base falsa que el shim de server-lazy.
import { getSupabaseServer } from './fake-supabase.mjs';

export const supabase = getSupabaseServer();
