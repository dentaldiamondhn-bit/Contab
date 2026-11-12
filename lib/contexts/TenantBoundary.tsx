"use client";

/**
 * Adaptador de conveniencia sobre el workspace real.
 *
 * Este proyecto YA tiene el contexto de empresa/sede en `WorkspaceContext`
 * (cookie `active_company_id` -> header -> `/api/workspace` validado contra
 * `user_company_access`, generacion anti-race y purga de `ws_*`). NO se crea un
 * segundo modelo de estado en paralelo: `TenantBoundary` es una capa FINA que
 * expone la API corta `useTenantUI()` y delega en `useWorkspace()`.
 *
 * Diferencias a proposito con un boundary "de tutorial" (localStorage + hard
 * reload + `?company_id`):
 * - `changeCompany` NO escribe localStorage ni hace `window.location.href`:
 *   llama a `cambiarEmpresa`, que valida la membresia en el servidor, aborta las
 *   respuestas en vuelo, sube la generacion y navega a `/companies/[id]`.
 * - El remontaje del arbol NO lo hace este componente: lo hace `WorkspaceShell`
 *   (`key={activeCompanyId}`). Anadir otra `key` aqui remontaria dos veces.
 * - `locationId === "ALL"` significa consolidado, y solo existe para el
 *   empresario (`permiteConsolidar`); el contador no consolida entre empresas.
 */

import { createContext, useContext, useMemo, type ReactNode } from "react";
import {
  useWorkspace,
  type EmpresaActiva,
  type RolEspacio,
  type SedeActiva,
} from "@/lib/contexts/WorkspaceContext";

export type TenantUIContextType = {
  /** `activeCompanyId`: la empresa comprometida con la UI. Es la `key` del arbol. */
  companyId: string | null;
  /** Id de sede activa, o `"ALL"` para la vista consolidada. */
  locationId: string | "ALL";
  /** Cambia la empresa activa (validado en servidor). */
  changeCompany: (newCompanyId: string) => void;
  /** Cambia la sede activa, o `"ALL"` para consolidar. */
  changeLocation: (newLocationId: string | "ALL") => void;
  /** Rol en la empresa ACTIVA (no del usuario entero). */
  role: RolEspacio | null;
  cargando: boolean;
  error: string | null;
  empresas: EmpresaActiva[];
  sedes: SedeActiva[];
  /** Solo true si el rol de la empresa activa es empresario. */
  permiteConsolidar: boolean;
};

const TenantUIContext = createContext<TenantUIContextType | undefined>(undefined);

export function TenantBoundary({ children }: { children: ReactNode }) {
  const ws = useWorkspace();

  const valor = useMemo<TenantUIContextType>(
    () => ({
      companyId: ws.activeCompanyId,
      locationId: ws.consolidando ? "ALL" : (ws.sede?.id ?? "ALL"),
      changeCompany: (newCompanyId) => {
        void ws.cambiarEmpresa(newCompanyId);
      },
      changeLocation: (newLocationId) => {
        void ws.cambiarSede(newLocationId);
      },
      role: ws.role,
      cargando: ws.cargando,
      error: ws.error,
      empresas: ws.empresas,
      sedes: ws.sedes,
      permiteConsolidar: ws.permiteConsolidar,
    }),
    [ws]
  );

  return <TenantUIContext.Provider value={valor}>{children}</TenantUIContext.Provider>;
}

export function useTenantUI(): TenantUIContextType {
  const c = useContext(TenantUIContext);
  if (c === undefined) {
    throw new Error("useTenantUI debe usarse dentro de un <TenantBoundary />");
  }
  return c;
}
