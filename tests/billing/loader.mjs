export function resolve(specifier, context, nextResolve) {
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
  // y las rutas / la logica de correlativo (`supabase-db`) ven las mismas tablas.
  if (specifier === '@/lib/supabase/server-lazy') {
    return { url: new URL('./server-lazy-shim.mjs', import.meta.url).href, shortCircuit: true };
  }
  if (specifier === '@/lib/supabase-db') {
    return { url: new URL('./supabase-db-shim.mjs', import.meta.url).href, shortCircuit: true };
  }
  if (specifier === '@/lib/accounting/resolve-account') {
    return { url: new URL('./resolve-account-mock.mjs', import.meta.url).href, shortCircuit: true };
  }
  if (specifier === '@/lib/services/stock-sale') {
    return { url: new URL('./stock-sale-mock.mjs', import.meta.url).href, shortCircuit: true };
  }
  if (specifier === '@/lib/billing/invoice-number') {
    return { url: new URL('../../lib/billing/invoice-number.ts', import.meta.url).href, shortCircuit: true };
  }
  if (specifier === '@/lib/billing/issuer-sanitizer') {
    return { url: new URL('../../lib/billing/issuer-sanitizer.ts', import.meta.url).href, shortCircuit: true };
  }

  return nextResolve(specifier, context);
}
