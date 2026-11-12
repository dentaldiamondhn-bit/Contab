/**
 * Carga `lib/purchase-db.ts` REAL (no un doble) para poder probar el
 * aislamiento contra el codigo que se ejecuta, no contra una reimplementacion.
 *
 * Node 24 con `--experimental-strip-types` ejecuta el TS, pero no resuelve el
 * alias `@/`. Este loader solo mapea los tres imports que la libreria usa:
 *  - `@/lib/tenant-resolver` -> solo necesita `ErrorDeEmpresa`
 *  - `@/lib/supabase/server-lazy` -> el cliente se inyecta en las pruebas
 *  - `@supabase/supabase-js` -> solo es `import type`, pero se mapea por si acaso
 */
export async function resolve(specifier, context, nextResolve) {
  if (specifier === '@/lib/tenant-resolver') {
    return {
      url: new URL('./tenant-resolver-mock.mjs', import.meta.url).href,
      shortCircuit: true,
    };
  }

  if (specifier === '@/lib/supabase/server-lazy') {
    return {
      url: new URL('../accounting/server-lazy-dummy.mjs', import.meta.url).href,
      shortCircuit: true,
    };
  }

  if (specifier === '@/lib/purchase-db') {
    return {
      url: new URL('../../lib/purchase-db.ts', import.meta.url).href,
      shortCircuit: true,
    };
  }

  return nextResolve(specifier, context);
}