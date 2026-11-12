import { auth } from "@clerk/nextjs/server";

export interface AuthUser {
  id: string;
  /** Alias de `id`, conservado para los consumidores existentes. */
  userId: string;
  email: string | null;
  tenantId: string | null;
  role?: string | null;
}

/**
 * Resolves the caller's identity from the Clerk session.
 *
 * Accepts the incoming request explicitly when called from middleware
 * (`middleware.ts` passes `req`); the request is not needed because `auth()`
 * already resolves the current request context in both middleware and route
 * handlers. It stays in the signature for backwards compatibility.
 *
 * Antes leia unicamente el header `Authorization`. Un `fetch` del navegador no
 * manda ese header, asi que toda peticion autenticada por cookie de sesion
 * (que es como funciona Clerk) se veia como anonima y las rutas respondian 401.
 */
export async function getAuthUser(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  request?: { headers: Headers }
): Promise<AuthUser | null> {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId) return null;

    const metadata = (sessionClaims?.metadata as Record<string, unknown>) || {};
    const email = (sessionClaims as { email?: string } | null)?.email ?? null;

    return {
      id: userId,
      userId,
      email,
      tenantId: typeof metadata.tenantId === "string" ? metadata.tenantId : null,
      role: typeof metadata.role === "string" ? metadata.role : null,
    };
  } catch (error) {
    console.error("Error in getAuthUser:", error);
    return null;
  }
}
