export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'next/server') {
    return {
      url: new URL('../diat/next-server-stub.mjs', import.meta.url).href,
      shortCircuit: true,
    };
  }

  // `lib/tenant-resolver.ts` se prueba REAL: el orden `[id]` -> header de
  // sesion -> x-company-id es parte de lo que se verifica.
  if (specifier === '@/lib/tenant-resolver') {
    return {
      url: new URL('../../lib/tenant-resolver.ts', import.meta.url).href,
      shortCircuit: true,
    };
  }

  // Ambos caminos de Supabase caen al MISMO falso: el contexto (`server-lazy`)
  // y las rutas (`supabase-db`) tienen que ver las mismas tablas.
  if (specifier === '@/lib/supabase/server-lazy') {
    return {
      url: new URL('./server-lazy-shim.mjs', import.meta.url).href,
      shortCircuit: true,
    };
  }
  if (specifier === '@/lib/supabase-db') {
    return {
      url: new URL('./supabase-db-shim.mjs', import.meta.url).href,
      shortCircuit: true,
    };
  }

  return nextResolve(specifier, context);
}
