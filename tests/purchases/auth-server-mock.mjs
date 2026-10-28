/**
 * Doble de `@/lib/auth-server` para `tests/purchases`.
 *
 * Las rutas de aprobacion resuelven el rol con `getUserRoleFromAuth()`. Aqui se
 * fija con `ponerRol(role)`; por defecto `VIEWER` (el mismo default del real).
 */
let rol = 'VIEWER';
let nombre = null;

export async function getUserRoleFromAuth() {
  return rol;
}

export function ponerRol(nuevo) {
  rol = nuevo;
}

/**
 * `nombreDeUsuarioActual()`: el "quien lo hizo" del workflow de O.C.
 * Por defecto `null`, igual que un usuario sin nombre resoluble, para no
 * cambiar el comportamiento de los tests existentes.
 */
export async function nombreDeUsuarioActual() {
  return nombre;
}

export function ponerNombreDeUsuario(nuevo) {
  nombre = nuevo;
}
