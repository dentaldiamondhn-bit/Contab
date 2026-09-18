export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'next/server') {
    return {
      url: new URL('../diat/next-server-stub.mjs', import.meta.url).href,
      shortCircuit: true,
    };
  }

  if (specifier === '@/lib/services/warehouse-service') {
    return {
      url: new URL('./warehouse-service-mock.mjs', import.meta.url).href,
      shortCircuit: true,
    };
  }

  return nextResolve(specifier, context);
}
