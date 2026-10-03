export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'next/server') {
    return {
      url: new URL('./next-server-stub.mjs', import.meta.url).href,
      shortCircuit: true,
    };
  }

  if (specifier === '@/lib/services/diat-generator') {
    return {
      url: new URL('./diat-generator-mock.mjs', import.meta.url).href,
      shortCircuit: true,
    };
  }

  // La ruta resuelve la empresa con el contexto compartido en vez de confiar en
  // `?companyId`, asi que hay que doublear los dos modulos que usa para eso.
  if (specifier === '@/lib/tenant-resolver') {
    return {
      url: new URL('./tenant-resolver-mock.mjs', import.meta.url).href,
      shortCircuit: true,
    };
  }

  if (specifier === '@/lib/purchase-db') {
    return {
      url: new URL('./purchase-db-mock.mjs', import.meta.url).href,
      shortCircuit: true,
    };
  }

  return nextResolve(specifier, context);
}