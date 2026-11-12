export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'next/server') {
    return {
      url: new URL('../diat/next-server-stub.mjs', import.meta.url).href,
      shortCircuit: true,
    };
  }

  // Aqui NO se mockea `@/lib/tenant-resolver`: el objeto de estas pruebas es el
  // real, con el orden de resolucion `[id]` -> `?companyId` -> `x-company-id`.
  if (specifier === '@/lib/supabase/server-lazy') {
    return {
      url: new URL('./fake-companies.mjs', import.meta.url).href,
      shortCircuit: true,
    };
  }

  return nextResolve(specifier, context);
}