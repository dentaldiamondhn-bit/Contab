const SERVICE_MOCK = new URL('./pdf-services-mock.mjs', import.meta.url).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'next/server') {
    return {
      url: new URL('../diat/next-server-stub.mjs', import.meta.url).href,
      shortCircuit: true,
    };
  }

  if (specifier === '@/lib/supabase/server-lazy') {
    return {
      url: new URL('./server-lazy-stub.mjs', import.meta.url).href,
      shortCircuit: true,
    };
  }

  if (specifier === '@/lib/services/pdf-documents') {
    return {
      url: new URL('../../lib/services/pdf-documents.ts', import.meta.url).href,
      shortCircuit: true,
    };
  }

  if (
    specifier === '@/lib/services/budget-service' ||
    specifier === '@/lib/services/warehouse-service' ||
    specifier === '@/lib/services/diat-generator' ||
    specifier === '@/lib/services/pdf-document-builder' ||
    specifier === '@/lib/services/pdf-data' ||
    specifier === '@/lib/services/period-variations'
  ) {
    return { url: SERVICE_MOCK, shortCircuit: true };
  }

  return nextResolve(specifier, context);
}
