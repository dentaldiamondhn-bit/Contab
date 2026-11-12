import React from "react";
import { useWorkspace } from "@/providers/WorkspaceProvider";

type Props = {
  permiteConsolidar: boolean;
  multiEmpresa: boolean;
  roleDeEmpresa: string | undefined;
};

export const LocationFilter: React.FC<Props> = ({
  permiteConsolidar,
  multiEmpresa,
}) => {
  const { location, setLocation, locations, loading } = useWorkspace();

  return (
    <div className="flex items-center gap-4">
      <label className="sr-only" htmlFor="sede-activa">
        Sede
      </label>
      <select
        id="sede-activa"
        value={location ?? ""}
        onChange={(e) => setLocation(e.target.value || null)}
        disabled={loading || locations.length === 0}
        className="rounded border py-1.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
      >
        {/* Consolidar (todas las sedes) solo existe para el propietario. */}
        {permiteConsolidar && <option value="">Todas las sedes</option>}
        {locations.map((sede) => (
          <option key={sede.id} value={sede.id}>
            {sede.name}
          </option>
        ))}
      </select>

      {permiteConsolidar && multiEmpresa && (
        <span className="text-xs text-gray-500">Consolidado entre empresas</span>
      )}
    </div>
  );
};
