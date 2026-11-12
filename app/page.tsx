import { redirect } from "next/navigation";

/**
 * La raiz del sitio no es una pantalla: es el punto de entrada.
 *
 * Clerk devuelve al usuario autenticado a `/` despues del login, y aqui habia
 * un placeholder con cuatro tarjetas. El resultado era que, al entrar, el
 * usuario no veia su dashboard.
 *
 * `/dashboard` es el landing comun y ya resuelve el destino por rol
 * (`/admin/dashboard` para SUPER_ADMIN/SUPPORT, `/tenant-admin/dashboard` para
 * ADMIN/MANAGER y el panel del despacho para contadores). Redirigir aqui evita
 * duplicar esa decision y evita montar el chrome generico (`WorkspaceBar` +
 * `AppSidebar`) alrededor de una pantalla que tiene su propio layout.
 *
 * Sin sesion, el middleware protege `/dashboard` y manda a `/auth/login`, que
 * es el mismo comportamiento del build desplegado.
 */
export default function HomePage() {
  redirect("/dashboard");
}
