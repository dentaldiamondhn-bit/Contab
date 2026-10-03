"use client";

/**
 * Selector combinado de empresa + ubicacion, sobre `useTenantUI()`.
 *
 * Es el equivalente corto de `WorkspaceBar` (badge + `CompanySelector` +
 * `LocationFilter`) para pantallas que quieren el control embebido. La logica es
 * la misma: el contador solo cambia de empresa; el empresario tambien elige sede
 * y puede ver el consolidado (`"ALL"`).
 *
 * Las props son opcionales: si no se pasan, se toman del contexto de workspace
 * (`empresas`/`sedes`), que es la fuente de verdad validada en servidor.
 */

import { useTenantUI } from "@/lib/contexts/TenantBoundary";

export interface Company {
  id: string;
  name: string;
}

export interface Location {
  id: string;
  name: string;
}

interface Props {
  userRole?: "accountant" | "business_owner";
  companies?: Company[];
  locations?: Location[];
  className?: string;
}

export function CompanyLocationSelector({ userRole, companies, locations, className = "" }: Props) {
  const { companyId, locationId, changeCompany, changeLocation, role, empresas, sedes, permiteConsolidar } =
    useTenantUI();

  const rol = userRole ?? role ?? "accountant";
  const listaEmpresas: Company[] =
    companies ?? empresas.map((e) => ({ id: e.id, name: e.name || "(sin nombre)" }));
  const listaSedes: Location[] = locations ?? sedes.map((s) => ({ id: s.id, name: s.name }));

  return (
    <div className={`flex items-center gap-4 rounded-lg border bg-muted/40 p-2 ${className}`}>
      <div className="flex flex-col">
        <span className="text-xs font-semibold uppercase text-muted-foreground">Empresa:</span>
        <select
          value={companyId || ""}
          onChange={(e) => changeCompany(e.target.value)}
          className="rounded-md border bg-background p-1.5 text-sm font-medium"
        >
          <option value="" disabled>
            Seleccionar Empresa
          </option>
          {listaEmpresas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {rol === "business_owner" && (
        <div className="flex flex-col border-l pl-4">
          <span className="text-xs font-semibold uppercase text-muted-foreground">Ubicación / Vista:</span>
          <select
            value={locationId}
            onChange={(e) => changeLocation(e.target.value)}
            className="rounded-md border bg-background p-1.5 text-sm font-medium"
          >
            {permiteConsolidar && <option value="ALL">🌐 Todas las Ubicaciones (Consolidado)</option>}
            {listaSedes.map((loc) => (
              <option key={loc.id} value={loc.id}>
                📍 {loc.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
