"use client";

/**
 * Filtro de sede. Es el control del flujo del EMPRESARIO.
 *
 * "Todas las ubicaciones" es la vista consolidada: los reportes suman todas las
 * sedes de la empresa. Solo existe si el usuario es empresario; el contador
 * administra empresas separadas y no tiene nada que consolidar.
 *
 * `location_id` NULL significa "a nivel de empresa": cuenta dentro de la
 * consolidada y NO aparece al filtrar por una sede. Por eso la lista incluye esa
 * categoria en vez de esconder las filas.
 */

import { useWorkspace } from "@/lib/contexts/WorkspaceContext";

export function LocationFilter({ className = "" }: { className?: string }) {
  const { sedes, sede, consolidando, permiteConsolidar, cambiarSede, cargando, role } = useWorkspace();

  if (role === "accountant") {
    // No hay sede que filtrar. Se dice explicitamente en vez de renderizar un
    // select vacio, que parece un bug.
    return (
      <p className={`text-[11px] text-muted-foreground ${className}`}>
        Vista de contador: sin sedes. Cada empresa se administra por separado.
      </p>
    );
  }

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor="ws-location" className="text-[11px] font-medium text-muted-foreground">
        Ubicación
      </label>

      <select
        id="ws-location"
        value={consolidando ? "ALL" : (sede?.id ?? "ALL")}
        disabled={cargando}
        onChange={(e) => void cambiarSede(e.target.value)}
        className="h-9 rounded-md border border-input bg-background px-2 text-sm disabled:opacity-50"
      >
        {permiteConsolidar && (
          <option value="ALL">Todas las ubicaciones (consolidado)</option>
        )}
        {sedes.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>

      <p className="text-[11px] text-muted-foreground">
        {consolidando
          ? "Consolidado: los reportes suman todas las sedes. Los formularios piden sede."
          : `Filtrando por ${sede?.name || "sede"}. Las nuevas transacciones heredan esta sede.`}
      </p>
    </div>
  );
}
