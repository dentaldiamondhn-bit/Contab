/**
 * Doble de `@/lib/auth-server` para `tests/purchases`.
 *
 * Las rutas de aprobacion resuelven el rol con `getUserRoleFromAuth()`. Aqui se
 * fija con `ponerRol(role)`; por defecto `VIEWER` (el mismo default del real).
 */
let rol = 'VIEWER';

export async function getUserRoleFromAuth() {
  return rol;
}

export function ponerRol(nuevo) {
  rol = nuevo;
}
