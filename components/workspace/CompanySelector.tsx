"use client";

/**
 * Selector de empresa activa. Es el control del flujo del CONTADOR.
 *
 * Muestra nombre y RTN siempre, porque con dos empresas que se llaman igual
 * (o con nombres parecidos) el nombre solo no basta para saber que se esta
 * viendo la contabilidad correcta. El RTN es lo que distingue una empresa de
 * otra de verdad, y es un dato que el usuario ya conoce.
 */

import { useWorkspace } from "@/lib/contexts/WorkspaceContext";

export function CompanySelector() {
  const { empresas, empresa, cargando, cambiarEmpresa, role } = useWorkspace();

  if (cargando && !empresa) {
    return <div className="text-xs text-muted-foreground">Cargando empresa…</div>;
  }
  if (empresas.length === 0) {
    return <div className="text-xs text-destructive">Sin empresa asignada</div>;
  }

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="ws-company" className="text-[11px] font-medium text-muted-foreground">
        {role === "accountant" ? "Empresa que administras" : "Tu empresa"}
      </label>

      <select
        id="ws-company"
        value={empresa?.id ?? ""}
        disabled={cargando}
        onChange={(e) => void cambiarEmpresa(e.target.value)}
        className="h-9 rounded-md border border-input bg-background px-2 text-sm disabled:opacity-50"
      >
        {empresas.map((e) => (
          <option key={e.id} value={e.id}>
            {e.name || "(sin nombre)"}
            {e.rtn ? ` — RTN ${e.rtn}` : ""}
          </option>
        ))}
      </select>

      {empresas.length > 1 && (
        <p className="text-[11px] text-muted-foreground">
          {empresas.length} empresas. Cada una tiene su contabilidad separada: no se mezclan.
        </p>
      )}
    </div>
  );
}

/**
 * Badge con la empresa activa, para tenerla a la vista en cualquier pantalla.
 * El requisito es que se vea "en todo momento" cual es la empresa activa; el
 * selector esta en el sidebar, que no siempre esta visible.
 */
export function ActiveCompanyBadge({ className = "" }: { className?: string }) {
  const { empresa, role } = useWorkspace();
  if (!empresa) return null;

  return (
    <div
      className={`flex items-center gap-2 rounded-md border border-border bg-muted/50 px-2 py-1 text-xs ${className}`}
      role="status"
      aria-live="polite"
    >
      <span className="font-medium truncate">{empresa.name || "(sin nombre)"}</span>
      {empresa.rtn && <span className="text-muted-foreground shrink-0">RTN {empresa.rtn}</span>}
      {role === "accountant" && (
        <span className="shrink-0 rounded border border-border px-1 text-[10px] uppercase tracking-wide">
          contador
        </span>
      )}
    </div>
  );
}
