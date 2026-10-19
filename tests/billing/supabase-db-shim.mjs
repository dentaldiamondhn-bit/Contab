// `lib/supabase-db.ts` exporta `supabase`; `lib/billing/invoice-number.ts` y las
// rutas de facturacion lo importan de `@/lib/supabase-db`. Misma base falsa que
// el shim de server-lazy: el contexto y las rutas tienen que ver las mismas tablas.
import { getSupabaseServer } from './fake-supabase.mjs';

export const supabase = getSupabaseServer();
