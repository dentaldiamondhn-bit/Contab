"use client";

import { useUser } from "@clerk/nextjs";
import { useState } from "react";
import Link from "next/link";
import TenantsModule from "@/components/admin/panel/TenantsModule";
import SecurityModule from "@/components/admin/panel/SecurityModule";
import SystemConfigModule from "@/components/admin/panel/SystemConfigModule";
import BillingModule from "@/components/admin/panel/BillingModule";
import IntegrationsModule from "@/components/admin/panel/IntegrationsModule";
import SupportModule from "@/components/admin/panel/SupportModule";
import TenantActivityPage from "@/app/admin/activity/page";

type ModuleKey = "tenants" | "security" | "system" | "billing" | "integrations" | "support" | "activity";

interface ModuleDef {
  key: ModuleKey | "link";
  label: string;
  icon: string;
  group: string;
  href?: string;
}

const modules: ModuleDef[] = [
  { key: "tenants", label: "Empresas / Tenants", icon: "🏢", group: "Operaciones" },
  { key: "security", label: "Seguridad y Usuarios", icon: "🔐", group: "Operaciones" },
  { key: "activity", label: "Actividad y Renovaciones", icon: "📅", group: "Operaciones" },
  { key: "billing", label: "Planes y Facturación", icon: "💳", group: "SaaS" },
  { key: "system", label: "Configuración Global", icon: "⚙️", group: "Sistema" },
  { key: "integrations", label: "Integraciones", icon: "🔌", group: "Sistema" },
  { key: "support", label: "Mantenimiento y Soporte", icon: "🛠️", group: "Soporte" },
  { key: "link", label: "Configuración", icon: "🔧", group: "Accesos Directos", href: "/admin/settings" },
  { key: "link", label: "Logs y Auditoría", icon: "📋", group: "Accesos Directos", href: "/admin/audit" },
  { key: "link", label: "Reportes Globales", icon: "📊", group: "Accesos Directos", href: "/admin/reports" },
];

export default function AdminPanelPage() {
  const { user, isLoaded } = useUser();
  const [activeModule, setActiveModule] = useState<ModuleKey>("tenants");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const groups = [...new Set(modules.map((m) => m.group))];

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-gray-50 rounded-lg overflow-hidden border">
      <aside
        className={`${sidebarOpen ? "w-64" : "w-16"} bg-white border-r border-gray-200 flex flex-col transition-all duration-200`}
      >
        <div className="p-3 border-b border-gray-100 flex items-center justify-between">
          {sidebarOpen && <span className="text-sm font-semibold text-gray-700">Módulos</span>}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 rounded hover:bg-gray-100 text-gray-500"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sidebarOpen ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"} />
            </svg>
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {groups.map((group) => (
            <div key={group} className="mb-2">
              {sidebarOpen && (
                <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  {group}
                </div>
              )}
              {modules
                .filter((m) => m.group === group)
                .map((m, i) => {
                  if (m.href) {
                    return (
                      <Link
                        key={`${m.key}-${i}`}
                        href={m.href}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        title={m.label}
                      >
                        <span className="text-lg flex-shrink-0">{m.icon}</span>
                        {sidebarOpen && <span className="truncate">{m.label}</span>}
                      </Link>
                    );
                  }
                  return (
                    <button
                      key={`${m.key}-${i}`}
                      onClick={() => setActiveModule(m.key as ModuleKey)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                        activeModule === m.key
                          ? "bg-blue-50 text-blue-700 border-r-2 border-blue-600 font-medium"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                      title={m.label}
                    >
                      <span className="text-lg flex-shrink-0">{m.icon}</span>
                      {sidebarOpen && <span className="truncate">{m.label}</span>}
                    </button>
                  );
                })}
            </div>
          ))}
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="p-6">
          {activeModule === "tenants" && <TenantsModule />}
          {activeModule === "security" && <SecurityModule />}
          {activeModule === "system" && <SystemConfigModule />}
          {activeModule === "billing" && <BillingModule />}
          {activeModule === "integrations" && <IntegrationsModule />}
          {activeModule === "support" && <SupportModule />}
          {activeModule === "activity" && <TenantActivityPage />}
        </div>
      </main>
    </div>
  );
}
