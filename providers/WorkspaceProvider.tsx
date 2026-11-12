"use client";

import React, {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useWorkspace as useWorkspaceReal } from "@/lib/contexts/WorkspaceContext";

/**
 * Adaptador del contexto de trabajo real (`lib/contexts/WorkspaceContext`).
 *
 * Antes este archivo era un provider independiente con `companies: []` y la
 * empresa leida de localStorage. Los componentes de `components/workspace/*`
 * lo consumian, asi que la barra siempre mostraba "Sin empresa" aunque
 * `/api/workspace` respondiera con la empresa y la sede del usuario.
 *
 * Ahora NO guarda estado propio: traduce el contexto real (`empresa`,
 * `empresas`, `sede`, `sedes`, `role`) a la forma que ya usan esos
 * componentes, de modo que la empresa activa sale siempre de la membresia
 * validada por el servidor y no de una copia local.
 */

export type WorkspaceCompany = {
  id: string;
  name: string | null;
  rtn: string | null;
};

export type WorkspaceLocation = {
  id: string;
  code: string;
  name: string;
  is_default: boolean;
};

type WorkspaceContextValue = {
  company: WorkspaceCompany | null;
  setCompany: (company: WorkspaceCompany | string | null | undefined) => void;
  companies: WorkspaceCompany[];
  activeCompanyId: string | null;
  setActiveCompanyId: (id: string | null) => void;
  location: string | null;
  setLocation: (location: string | null | undefined) => void;
  locations: WorkspaceLocation[];
  multiEmpresa: boolean;
  permiteConsolidar: boolean;
  roleDeEmpresa: string | null;
  accountantProfiles: any[];
  loading: boolean;
  error: string | null;
};

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(
  undefined
);

export const WorkspaceProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const real = useWorkspaceReal();
  const {
    empresa,
    empresas,
    activeCompanyId,
    sede,
    sedes,
    multiEmpresa,
    permiteConsolidar,
    role,
    cargando,
    error,
    cambiarEmpresa,
    cambiarSede,
  } = real;

  const valor = useMemo<WorkspaceContextValue>(() => {
    const companies: WorkspaceCompany[] = empresas.map((e) => ({
      id: e.id,
      name: e.name,
      rtn: e.rtn,
    }));

    const company: WorkspaceCompany | null = empresa
      ? { id: empresa.id, name: empresa.name, rtn: empresa.rtn }
      : null;

    // El servidor confirma la empresa: si el id no cambio, no se vuelve a pedir.
    const cambiarA = (id: string | null | undefined) => {
      if (!id || id === empresa?.id) return;
      void cambiarEmpresa(id);
    };

    return {
      company,
      setCompany: (next) =>
        cambiarA(typeof next === "string" ? next : next?.id),
      companies,
      activeCompanyId,
      setActiveCompanyId: (id) => cambiarA(id),
      location: sede?.id ?? null,
      setLocation: (next) => {
        // `null` = todas las sedes. El contexto real solo lo permite al
        // propietario; al contador le responde con un error visible.
        if (next === null || next === undefined) {
          if (permiteConsolidar) void cambiarSede("ALL");
          return;
        }
        if (next !== sede?.id) void cambiarSede(next);
      },
      locations: sedes,
      multiEmpresa,
      permiteConsolidar,
      roleDeEmpresa: role,
      accountantProfiles: [],
      loading: cargando,
      error,
    };
  }, [
    empresa,
    empresas,
    activeCompanyId,
    sede,
    sedes,
    multiEmpresa,
    permiteConsolidar,
    role,
    cargando,
    error,
    cambiarEmpresa,
    cambiarSede,
  ]);

  return (
    <WorkspaceContext.Provider value={valor}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = (): WorkspaceContextValue => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
};

export { WorkspaceContext };
