export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'next/server') {
    return {
      url: new URL('../diat/next-server-stub.mjs', import.meta.url).href,
      shortCircuit: true,
    };
  }

  // El servicio se mockea: probar aqui el kardex real seria replicar la suite
  // de warehouse. Lo que se prueba es el agrupado y el mapeo de la ruta.
  if (specifier === '@/lib/services/warehouse-service') {
    return {
      url: new URL('./warehouse-service-mock.mjs', import.meta.url).href,
      shortCircuit: true,
    };
  }

  // `contextoDeEmpresa` (real) y la propia ruta leen almacenes/productos por
  // aqui: un doble con companies/warehouse/product basta, y el aislamiento por
  // company_id se prueba contra las fixtures.
  if (specifier === '@/lib/supabase/server-lazy') {
    return {
      url: new URL('./fake-db.mjs', import.meta.url).href,
      shortCircuit: true,
    };
  }

  // Node no resuelve el alias `@/` de Next: se apunta al fichero REAL, que es
  // el que se prueba (mismo patron que budget-service en el loader de inventory).
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

  return nextResolve(specifier, context);
}
