"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "@/components/dashboard/AppShell";

/**
 * Módulos que traen su propio chrome de pantalla completa y por eso NO deben
 * recibir la shell general (si no, saldrían doble header/sidebar):
 * seguridad tiene su propio `<aside>` de módulos y tax-integration su propio
 * layout a altura fija.
 */
const RUTAS_CON_SHELL_PROPIA = /^\/companies\/[^/]+\/(security|tax-integration)(\/|$)/;

/**
 * Layout de la sección de empresas.
 *
 * Comparte `AppShell` con `/dashboard` para que el tema, el header, la barra de
 * empresa/sede, el sidebar y el padding del contenido sean exactamente los
 * mismos en `/companies`, en `/companies/[id]` y en sus pantallas internas
 * (módulos, contabilidad, inventario, RR. HH., etc.). Antes estas rutas se
 * renderizaban sueltas desde `AppFrame` y se veían distintas al dashboard.
 */
export default function CompaniesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";

  if (RUTAS_CON_SHELL_PROPIA.test(pathname)) {
    return <>{children}</>;
  }

  return <AppShell>{children}</AppShell>;
}
