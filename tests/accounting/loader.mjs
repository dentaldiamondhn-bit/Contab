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

  return nextResolve(specifier, context);
}
