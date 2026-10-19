export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'next/server') {
    return {
      url: new URL('../diat/next-server-stub.mjs', import.meta.url).href,
      shortCircuit: true,
    };
  }

  if (specifier === '@/lib/services/journal-service') {
    return {
      url: new URL('./journal-service-mock.mjs', import.meta.url).href,
      shortCircuit: true,
    };
  }

  if (specifier === '@/lib/services/opening-balance') {
    return {
      url: new URL('./opening-balance-mock.mjs', import.meta.url).href,
      shortCircuit: true,
    };
  }

  if (specifier === '@/lib/services/period-variations') {
    return {
      url: new URL('./variations-service-mock.mjs', import.meta.url).href,
      shortCircuit: true,
    };
  }

  if (specifier === '@/lib/tenant-resolver') {
    return {
      url: new URL('./tenant-resolver-mock.mjs', import.meta.url).href,
      shortCircuit: true,
    };
  }

  if (specifier === '@/lib/services/period-lock') {
    return {
      url: new URL('../../lib/services/period-lock.ts', import.meta.url).href,
      shortCircuit: true,
    };
  }

  if (specifier === '@/lib/services/account-audit') {
    return {
      url: new URL('../../lib/services/account-audit.ts', import.meta.url).href,
      shortCircuit: true,
    };
  }

  if (specifier === '@/lib/supabase/server-lazy') {
    return {
      url: new URL('./server-lazy-dummy.mjs', import.meta.url).href,
      shortCircuit: true,
    };
  }

  if (specifier === '@/lib/supabase/client' || specifier === '@/lib/supabase-db') {
    return {
      url: new URL('./supabase-stub.mjs', import.meta.url).href,
      shortCircuit: true,
    };
  }

  // `supplier-price-history.test.mjs` importa `lib/purchase-db.ts` REAL, y desde
  // las tareas 7 y 8 ese fichero importa los servicios de medidas. Sin estos
  // mapeos el fichero entero moria con `ERR_MODULE_NOT_FOUND: @/lib` (los 10
  // casos del historial de precios, que son los que guardan `price` en neto y
  // por unidad base, quedaban sin correr). Se cargan a los ficheros REALES, el
  // mismo conjunto que mapea `tests/purchases/loader.mjs`.
  const reales = {
    '@/lib/supplier-withholding': 'supplier-withholding',
    '@/lib/services/measure-calc': 'services/measure-calc',
    '@/lib/services/product-measures': 'services/product-measures',
    '@/lib/services/budget-service': 'services/budget-service',
    '@/lib/services/budget-calc': 'services/budget-calc',
    '@/lib/services/warehouse-service': 'services/warehouse-service',
    '@/lib/services/transfer-calc': 'services/transfer-calc',
  }[specifier];
  if (reales) {
    return {
      url: new URL(`../../lib/${reales}.ts`, import.meta.url).href,
      shortCircuit: true,
    };
  }

  return nextResolve(specifier, context);
}
