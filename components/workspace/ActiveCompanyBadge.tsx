import React from "react";
import { useWorkspace } from "@/providers/WorkspaceProvider";

type Props = {
  company: { name?: string | null } | null;
  permiteConsolidar: boolean;
  multiEmpresa: boolean;
};

export const ActiveCompanyBadge: React.FC<Props> = ({
  company,
  permiteConsolidar,
  multiEmpresa,
}) => {
  const { roleDeEmpresa, loading } = useWorkspace();

  return (
    <div className="flex items-center gap-2 rounded-lg bg-primary-100 px-3 py-1.5 text-sm">
      <span className="font-medium text-primary-800">
        {company?.name || (loading ? "Cargando empresa…" : "Sin empresa")}
      </span>
      {multiEmpresa && (
        <span className="text-xs text-primary-600">
          {permiteConsolidar ? "Cta. Consol." : "Sólo empresa"}
        </span>
      )}
      {roleDeEmpresa === "business_owner" && (
        <span className="ml-1 text-xs text-green-600">Propietario</span>
      )}
    </div>
  );
};
