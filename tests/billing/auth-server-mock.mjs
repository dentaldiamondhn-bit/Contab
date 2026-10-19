/**
 * Doble de `@clerk/nextjs/server`: la ruta de emision lo importa de forma
 * dinamica como ultimo recurso para deducir el tenant. En estos tests el tenant
 * siempre sale del contexto (header), asi que `auth()` solo tiene que no romper.
 */
export async function auth() {
  return { userId: null };
}
