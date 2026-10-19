/**
 * Doble de `@clerk/nextjs/server` para `tests/sar`.
 *
 * Las rutas SAR conservan `auth()` para el guard 401 y para `updatedBy`. Aqui se
 * fija el usuario con `fijarUsuario(id)`; por defecto hay sesion.
 */
let usuario = 'u-test-1';

export async function auth() {
  return { userId: usuario };
}

export function fijarUsuario(id) {
  usuario = id;
}
