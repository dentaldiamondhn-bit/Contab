"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { UnifiedSidebar } from "@/components/UnifiedSidebar";
import { WorkspaceBar } from "@/components/workspace/WorkspaceBar";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { useSidebar } from "@/app/contexts/SidebarContext";

/**
 * Rutas que se muestran a pantalla completa, sin el chrome de la app
 * (barra de empresa + sidebar). El login desplegado en app.contabhn.com
 * ocupa toda la ventana.
 */
const RUTAS_A_PANTALLA_COMPLETA = ["/auth", "/onboarding", "/payment", "/terms"];

/**
 * Secciones que ya traen su propio chrome en su `layout.tsx`
 * (TenantHeader + WorkspaceBar + RoleBasedSidebar, o su propio sidebar).
 * Envolverlas otra vez desde la raíz producía doble header y doble sidebar.
 */
const SECCIONES_CON_SHELL_PROPIO = [
  "/dashboard",
  "/admin",
  "/accountant",
  "/support",
  "/tenant-admin",
  "/companies",
];

function esPantallaCompleta(pathname: string): boolean {
  return RUTAS_A_PANTALLA_COMPLETA.some(
    (base) => pathname === base || pathname.startsWith(`${base}/`)
  );
}

function tieneShellPropio(pathname: string): boolean {
  // Primero: comprobar si coincide exactamente con alguna sección o es hija DIRECTA
  // (no nieta). /companies es la página de LISTA; /companies/[id] es DETALLE.
  for (const base of SECCIONES_CON_SHELL_PROPIO) {
    if (pathname === base) return true;
    // Hija directa: /admin/panel, /dashboard/support, /companies (lista) NO tiene hijas directas con shell
    if (pathname.startsWith(`${base}/`) && !pathname.slice(base.length + 1).includes('/')) {
      // Excepción: /companies/[id] NO es hija directa de /companies (es una ruta dinámica distinta)
      if (base === '/companies') continue;
      return true;
    }
  }

  // `/companies/[id]` usa su propio layout con AppShell (igual que /dashboard y /companies).
  // `/companies/[id]/security` y `/companies/[id]/tax-integration` tienen
  // layout propio de pantalla completa (sidebar de módulos / main a altura fija).
  // TODAS las demás rutas bajo /companies/[id]/* (accounting, billing, inventory, etc.)
  // HEREDAN el layout del padre (/companies/[id]/layout.tsx con AppShell),
  // así que NO deben recibir shell de AppFrame.
  return (
    /^\/companies\/[^/]+$/.test(pathname) ||                         // /companies/[id] exacto
    /^\/companies\/[^/]+\/(security|tax-integration)(\/|$)/.test(pathname) ||
    /^\/companies\/[^/]+\//.test(pathname)                          // CUALQUIER hijo de /companies/[id]/*
  );
}

export function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const { collapsed, toggleCollapsed } = useSidebar();

  if (esPantallaCompleta(pathname)) {
    return <>{children}</>;
  }

  // El shell propio sigue dentro de WorkspaceShell para conservar el remontaje
  // por empresa al cambiar de empresa, pero sin añadir otro header/sidebar.
  if (tieneShellPropio(pathname)) {
    return <WorkspaceShell>{children}</WorkspaceShell>;
  }

  return (
    <WorkspaceShell>
      <div className="flex min-h-screen flex-col">
        <WorkspaceBar />
        <div className="flex flex-1">
          <UnifiedSidebar isCollapsed={collapsed} onToggleCollapse={toggleCollapsed} />
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </WorkspaceShell>
  );
}
