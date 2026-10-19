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

  // `lib/services/location-service.ts` importa `resolveTenant` de budget-service.
  // Va al fichero REAL (no a un doble): el que se prueba es el codigo que corre.
  if (specifier === '@/lib/services/budget-service') {
    return {
      url: new URL('../../lib/services/budget-service.ts', import.meta.url).href,
      shortCircuit: true,
    };
  }
  if (specifier === '@/lib/services/budget-calc') {
    return {
      url: new URL('../../lib/services/budget-calc.ts', import.meta.url).href,
      shortCircuit: true,
    };
  }
  // `lib/services/warehouse-service.ts` importa helpers puros de transfer-calc.
  if (specifier === '@/lib/services/transfer-calc') {
    return {
      url: new URL('../../lib/services/transfer-calc.ts', import.meta.url).href,
      shortCircuit: true,
    };
  }

  return nextResolve(specifier, context);
}