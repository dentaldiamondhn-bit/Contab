'use client';

import { useSidebar } from "../contexts/SidebarContext";
import { TenantHeader } from "@/components/dashboard/TenantHeader";

interface HeaderProps {
  tenants: any[];
}

export default function Header({ tenants }: HeaderProps) {
  const { collapsed, toggleCollapsed } = useSidebar();

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Botón para colapsar/expandir sidebar */}
          <button
            onClick={toggleCollapsed}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            title={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          {/* Logo Principal */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">C</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Contab</h1>
              <p className="text-sm text-gray-500">Sistema de Contabilidad Profesional</p>
            </div>
          </div>
        </div>
        
        {/* Selector de Tenant */}
        <TenantHeader tenants={tenants} />
      </div>
    </header>
  );
}
