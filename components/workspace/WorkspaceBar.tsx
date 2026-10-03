"use client";

/**
 * Barra de contexto: la empresa y la sede activas, siempre visibles.
 *
 * El requisito es "ver en todo momento cual es la empresa activa". El sidebar
 * no sirve para eso porque en pantalla chica se colapsa, y el selector escondido
 * es la causa clasica de que alguien de contabilidad termine cargando datos de
 * la empresa equivocada creyendo que esta en la suya.
 *
 * Aqui conviven los dos controles porque son los dos flujos del onboarding y el
 * usuario no sabe todavia en cual esta: el contador cambia de empresa, el
 * empresario cambia de sede. `LocationFilter` ya se oculta solo cuando el rol
 * de la empresa activa no tiene sedes.
 */

import { ActiveCompanyBadge, CompanySelector } from "@/components/workspace/CompanySelector";
import { LocationFilter } from "@/components/workspace/LocationFilter";
import { useWorkspace } from "@/lib/contexts/WorkspaceContext";

export function WorkspaceBar({ className = "" }: { className?: string }) {
  const { error, cargando } = useWorkspace();

  if (error) {
    return (
      <div className={`border-b border-destructive/30 bg-destructive/5 px-4 py-2 text-xs text-destructive ${className}`}>
        {error}
      </div>
    );
  }

  return (
    <div
      className={`flex flex-wrap items-end gap-x-4 gap-y-2 border-b border-border bg-background px-4 py-2 ${className}`}
      aria-busy={cargando}
    >
      <ActiveCompanyBadge />
      <CompanySelector />
      <LocationFilter />
    </div>
  );
}
