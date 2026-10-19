// Carga las rutas SAR reales de `app/api/accounting/*` contra el supabase falso.
//
// `lib/tenant-resolver.ts` y `lib/purchase-db` (solo `exigirEmpresa`) se prueban
// reales: el contexto `[id]/?companyId/header -> empresa validada` es parte de lo
// que se verifica. Los SERVICIOS SAR se doblan (no es lo que se prueba aqui), y
// `@clerk/nextjs/server` se dobla para fijar el usuario.
export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'next/server') {
    return { url: new URL('../diat/next-server-stub.mjs', import.meta.url).href, shortCircuit: true };
  }
  if (specifier === '@clerk/nextjs/server') {
    return { url: new URL('./auth-server-mock.mjs', import.meta.url).href, shortCircuit: true };
  }
  if (specifier === '@/lib/tenant-resolver') {
    return { url: new URL('../../lib/tenant-resolver.ts', import.meta.url).href, shortCircuit: true };
  }
  if (specifier === '@/lib/purchase-db') {
    return { url: new URL('./purchase-db-mock.mjs', import.meta.url).href, shortCircuit: true };
  }
  // Los dos caminos de Supabase caen al MISMO falso: el contexto (`server-lazy`)
  // y las rutas (`supabase-db`) tienen que ver las mismas tablas.
  if (specifier === '@/lib/supabase/server-lazy') {
    return { url: new URL('./server-lazy-shim.mjs', import.meta.url).href, shortCircuit: true };
  }
  if (specifier === '@/lib/supabase-db') {
    return { url: new URL('./supabase-db-shim.mjs', import.meta.url).href, shortCircuit: true };
  }
  if (specifier === '@/lib/services/det-uploader') {
    return { url: new URL('./det-uploader-service.mjs', import.meta.url).href, shortCircuit: true };
  }
  if (specifier === '@/lib/services/sar-session') {
    return { url: new URL('./sar-session-service.mjs', import.meta.url).href, shortCircuit: true };
  }
  if (specifier === '@/lib/services/diat-generator') {
    return { url: new URL('./diat-generator-service.mjs', import.meta.url).href, shortCircuit: true };
  }
  if (specifier === '@/lib/services/diat-uploader') {
    return { url: new URL('./diat-uploader-service.mjs', import.meta.url).href, shortCircuit: true };
  }
  if (specifier === '@/lib/services/annual-tax-uploader') {
    return { url: new URL('./annual-tax-uploader-service.mjs', import.meta.url).href, shortCircuit: true };
  }

  return nextResolve(specifier, context);
}
