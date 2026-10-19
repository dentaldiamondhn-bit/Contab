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

  // Contexto de empresa REAL: el test de la ruta de productos importa sus dos
  // helpers por alias (la suite de servicios los resolvia por ruta relativa).
  if (specifier === '@/lib/tenant-resolver') {
    return {
      url: new URL('../../lib/tenant-resolver.ts', import.meta.url).href,
      shortCircuit: true,
    };
  }
  if (specifier === '@/lib/company-scope') {
    return {
      url: new URL('../../lib/company-scope.ts', import.meta.url).href,
      shortCircuit: true,
    };
  }

  // Servicio de medidas (lo crea la Tarea 4). El mapeo se anade ya para que la
  // suite de inventario pueda importarlo en cuanto exista; hoy nadie lo importa,
  // asi que apuntar a un fichero inexistente no rompe nada.
  if (specifier === '@/lib/services/product-measures') {
    return {
      url: new URL('../../lib/services/product-measures.ts', import.meta.url).href,
      shortCircuit: true,
    };
  }
  // Aritmetica pura de medidas (medio de `product-measures`): fichero real.
  if (specifier === '@/lib/services/measure-calc') {
    return {
      url: new URL('../../lib/services/measure-calc.ts', import.meta.url).href,
      shortCircuit: true,
    };
  }

  // `product-measures` importa `isMigrationMissingError` de warehouse-service
  // (unico sitio donde vive el helper). Se resuelve al fichero REAL; sus propios
  // imports por alias ya estan mapeados arriba.
  if (specifier === '@/lib/services/warehouse-service') {
    return {
      url: new URL('../../lib/services/warehouse-service.ts', import.meta.url).href,
      shortCircuit: true,
    };
  }

  return nextResolve(specifier, context);
}