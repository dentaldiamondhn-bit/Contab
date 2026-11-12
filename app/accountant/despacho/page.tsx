import { redirect } from "next/navigation";

/**
 * La vista del despacho vive en `/dashboard`, que es la landing comun: al entrar
 * por aqui el contador caia en el dashboard viejo de UNA empresa, que es lo que
 * reportaba.
 *
 * Esta ruta queda como alias para no romper el enlace guardado en el sidebar ni
 * los marcadores. Un unico destino, para que no haya dos versiones del panel
 * divergiendo.
 *
 * Nota: `/accountant/despacho` antes renderizaba esto mismo dentro del layout de
 * `/accountant`, que exige rol `ACCOUNTANT` en Clerk. Para un contador cuyo Clerk
 * diga ADMIN/MANAGER ese layout lo echaba a `/dashboard`, asi que el panel era
 * inalcanzable desde el sidebar. Servirlo en `/dashboard` evita depender de ese
 * rol global (ver AGENTS.md 1b: el rol es por empresa, sale de
 * `user_company_access.relationship`).
 */
export default function DespachoRedirect() {
  redirect("/dashboard");
}