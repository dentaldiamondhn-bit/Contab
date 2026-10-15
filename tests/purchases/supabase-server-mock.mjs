/**
 * Doble de `@/lib/supabase/server-lazy` para poder probar las RUTAS de
 * `/api/purchase-orders` con un supabase falso inyectado (las rutas llaman a
 * `getSupabaseServer()`, no reciben el cliente como parámetro).
 *
 * `ponerSupabase(sb)` fija la instancia que devolverán las rutas; los tests de
 * `lib/purchase-db.ts` no la usan (pasan el cliente a mano), así que el valor
 * por defecto vacío no les afecta.
 */
let instancia = {};

export function getSupabaseServer() {
  return instancia;
}

export function ponerSupabase(sb) {
  instancia = sb;
}