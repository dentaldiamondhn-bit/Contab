"use client";

import React from "react";
import { useWorkspace } from "@/providers/WorkspaceProvider";
import { ActiveCompanyBadge } from "./ActiveCompanyBadge";
import { CompanySelector } from "./CompanySelector";
import { LocationFilter } from "./LocationFilter";

export const WorkspaceBar: React.FC = () => {
  const {
    company,
    setCompany,
    companies,
    activeCompanyId,
    multiEmpresa,
    permiteConsolidar,
    roleDeEmpresa,
    accountantProfiles,
  } = useWorkspace();

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between flex-wrap">
          {/* Empresa activa */}
          <div className="flex items-center gap-4">
            {/* Badge de empresa activa */}
            <ActiveCompanyBadge
              company={company}
              permiteConsolidar={permiteConsolidar}
              multiEmpresa={multiEmpresa}
            />

            {/* Selector de empresa */}
            <CompanySelector
              companies={companies}
              setCompany={setCompany}
              activeCompanyId={activeCompanyId}
            />
          </div>

          {/* Filtro de ubicación */}
          <LocationFilter
            permiteConsolidar={permiteConsolidar}
            multiEmpresa={multiEmpresa}
            roleDeEmpresa={roleDeEmpresa}
          />
        </div>
      </div>
    </div>
  );
};