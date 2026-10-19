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
  if (specifier === 'next/server') {
    return {
      url: new URL('../diat/next-server-stub.mjs', import.meta.url).href,
      shortCircuit: true,
    };
  }

  if (specifier === '@/lib/tenant-resolver') {
    return {
      url: new URL('./tenant-resolver-mock.mjs', import.meta.url).href,
      shortCircuit: true,
    };
  }

  if (specifier === '@/lib/supabase/server-lazy') {
    return {
      url: new URL('./supabase-server-mock.mjs', import.meta.url).href,
      shortCircuit: true,
    };
  }

  if (specifier === '@/lib/purchase-db') {
    return {
      url: new URL('../../lib/purchase-db.ts', import.meta.url).href,
      shortCircuit: true,
    };
  }

  if (specifier === '@/lib/purchase-orders-db') {
    return {
      url: new URL('../../lib/purchase-orders-db.ts', import.meta.url).href,
      shortCircuit: true,
    };
  }

  if (specifier === '@/lib/purchase-returns-db') {
    return {
      url: new URL('../../lib/purchase-returns-db.ts', import.meta.url).href,
      shortCircuit: true,
    };
  }

  if (specifier === '@/lib/bank-reconciliation-db') {
    return {
      url: new URL('../../lib/bank-reconciliation-db.ts', import.meta.url).href,
      shortCircuit: true,
    };
  }

  if (specifier === '@/lib/supplier-cai') {
    return {
      url: new URL('../../lib/supplier-cai.ts', import.meta.url).href,
      shortCircuit: true,
    };
  }

  if (specifier === '@/lib/supplier-withholding') {
    return {
      url: new URL('../../lib/supplier-withholding.ts', import.meta.url).href,
      shortCircuit: true,
    };
  }

  // Escritor contable canonico (Transaction + JournalEntry). Se carga REAL para
  // que el asiento de compra/pago se pruebe contra el codigo que corre.
  if (specifier === '@/lib/services/journal-service') {
    return {
      url: new URL('../../lib/services/journal-service.ts', import.meta.url).href,
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

  if (specifier === '@/lib/auth-server') {
    return {
      url: new URL('./auth-server-mock.mjs', import.meta.url).href,
      shortCircuit: true,
    };
  }

  if (specifier === '@/lib/workspace') {
    return {
      url: new URL('./workspace-mock.mjs', import.meta.url).href,
      shortCircuit: true,
    };
  }

  // Aritmetica pura de medidas: fichero real. `purchase-db.ts` aun NO la importa;
  // el mapeo queda puesto para cuando la Tarea 7 (compras) lo haga.
  if (specifier === '@/lib/services/measure-calc') {
    return {
      url: new URL('../../lib/services/measure-calc.ts', import.meta.url).href,
      shortCircuit: true,
    };
  }

  return nextResolve(specifier, context);
}