'use client';

import { use } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Shield, 
  Lock,
  FileText,
  Scale,
  ClipboardList,
  Calendar,
  Percent,
  Activity,
  ChevronLeft,
  ChevronRight,
  Users,
  DatabaseBackup
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SecurityLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    id: string;
  }>;
}

const modules = [
  { id: 'panel-control', label: 'Panel Central', icon: Shield, href: 'panel-control' },
  { id: 'physical', label: 'Física', icon: Lock, href: 'physical' },
  { id: 'legal', label: 'Legal', icon: FileText, href: 'legal' },
  { id: 'sar', label: 'SAR', icon: Scale, href: 'sar' },
  { id: 'cai', label: 'CAI', icon: FileText, href: 'cai' },
  { id: 'cierre', label: 'Cierre', icon: Lock, href: 'cierre' },
  { id: 'reporte', label: 'Reporte', icon: ClipboardList, href: 'reporte' },
  { id: 'matrix', label: 'Matriz', icon: Calendar, href: 'matrix' },
  { id: 'retenciones', label: 'Retenciones', icon: Percent, href: 'retenciones' },
  { id: 'auditoria', label: 'Auditoría', icon: Activity, href: 'auditoria' },
  { id: 'usuarios-restringidos', label: 'Acceso Restringido', icon: Users, href: 'usuarios-restringidos' },
  { id: 'respaldo', label: 'Respaldo Info', icon: DatabaseBackup, href: 'respaldo' },
];

export default function SecurityLayout({ children, params }: SecurityLayoutProps) {
  const pathname = usePathname();
  const { id: companyId } = use(params);
  const basePath = `/companies/${companyId}/security`;

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-white border-r flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <Link href={`/companies/${companyId}/modules`}>
            <Button variant="ghost" size="sm" className="gap-2">
              <ChevronLeft className="h-4 w-4" />
              Volver a Módulos
            </Button>
          </Link>
          <div className="mt-4 flex items-center gap-2">
            <Shield className="h-6 w-6 text-indigo-600" />
            <div>
              <h1 className="font-bold text-lg">Seguridad</h1>
              <p className="text-xs text-gray-500">Sistema de Control</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-2">
          <div className="space-y-1">
            {modules.map((module) => {
              const Icon = module.icon;
              const isActive = pathname.includes(`/security/${module.href}`);
              
              return (
                <Link
                  key={module.id}
                  href={`${basePath}/${module.href}`}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-indigo-50 text-indigo-700 border-r-2 border-indigo-600"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  )}
                >
                  <Icon className={cn("h-4 w-4", isActive ? "text-indigo-600" : "text-gray-400")} />
                  <span>{module.label}</span>
                  {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t text-xs text-gray-500">
          <p>v2.0 - Módulos Independientes</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
