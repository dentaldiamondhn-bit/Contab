/**
 * Doble de `@/lib/workspace` para `tests/purchases`.
 *
 * Solo se usa `usuarioAppId()` (el `"User".id` del usuario de Clerk). Se fija
 * con `ponerUsuarioAppId(id)`.
 */
let usuario = null;

export async function usuarioAppId() {
  return usuario;
}

export function ponerUsuarioAppId(id) {
  usuario = id;
}
