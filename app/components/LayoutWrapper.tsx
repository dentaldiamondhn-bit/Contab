'use client';

import { usePathname } from 'next/navigation';
import RoleBasedSidebar from '@/components/RoleBasedSidebar';
import Header from './Header';
import { useTenant } from '@/lib/contexts/TenantContext'; // Importamos tu contexto de Tenant
import { ShieldAlert } from 'lucide-react';
import { UserRole } from '@/types/auth';

interface LayoutWrapperProps {
  children: React.ReactNode;
  tenants: any[];
}

export default function LayoutWrapper({ children, tenants }: LayoutWrapperProps) {
  const pathname = usePathname() || '';
  
  // Obtenemos la información del Tenant actual y el rol asignado al usuario
  const { currentTenant, isSuperAdmin: isGlobalSuperAdmin } = useTenant();
  
  // Validación robusta del rol del tenant actual
  const rawRole = (currentTenant as any)?.currentUserRole;
  const userRole: UserRole = isGlobalSuperAdmin ? 'SUPER_ADMIN' : ((rawRole as UserRole) || 'VIEWER');

  // --- Detección de Rutas Públicas o de Sistema (Sin Layout) ---
  const isOnboarding = pathname === '/onboarding' || pathname.startsWith('/onboarding/');
  const isAuthPage = pathname.startsWith('/auth/') || pathname === '/login' || pathname === '/register';
  const isSupportPage = pathname === '/support' || pathname.startsWith('/support/');

  // --- Mapeo de Rutas según Niveles de Acceso Requeridos ---
  
  // 1. Administración Global (Solo TI / Creador de la plataforma)
  const isSuperAdminRoute = pathname.startsWith('/super-admin/');

  // 2. Gestión Administrativa (Configuración de empresa, rangos del CAI, cierres de periodo)
  const isManagerRoute = pathname.startsWith('/settings/') || 
                         pathname.startsWith('/billing/') || 
                         pathname.includes('/modules/cai');

  // 3. Operaciones de Escritura (Crear pólizas, registrar retenciones, escaneo OCR)
  const isDataEntryRoute = pathname.includes('/modules/transactions') || 
                           pathname.includes('/modules/withholdings') ||
                           pathname.includes('/modules/ocr');

  // --- Evaluación Jerárquica de Permisos (RBAC) ---
  const hasAccess = (() => {
    if (isSuperAdminRoute) return userRole === 'SUPER_ADMIN';
    
    if (isManagerRoute) return ['SUPER_ADMIN', 'MANAGER'].includes(userRole);
    
    if (isDataEntryRoute) return ['SUPER_ADMIN', 'MANAGER', 'USER'].includes(userRole);
    
    // Cualquier otra ruta del dashboard (Libros contables, balances, reportes) es accesible por todos
    return ['SUPER_ADMIN', 'MANAGER', 'USER', 'VIEWER'].includes(userRole);
  })();

  // Renderizado para pantallas fuera del ecosistema del Dashboard (Login, Registro, Soporte, etc.)
  if (isOnboarding || isAuthPage || isSupportPage) {
    return (
      <div className="min-h-screen bg-gray-50">
        {children}
      </div>
    );
  }

  // Pantalla de bloqueo si intenta forzar una ruta para la que su rol no tiene autorización
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-xl shadow-lg max-w-md w-full text-center border border-red-100">
          <div className="bg-red-50 p-3 rounded-full w-fit mx-auto text-red-600 mb-4">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Acceso Denegado</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Tu nivel de acceso actual (<strong>{userRole}</strong>) no cuenta con las credenciales necesarias para modificar o visualizar esta sección.
          </p>
          <p className="text-xs text-slate-400 mt-4">
            Si consideras que esto es un error, solicita un cambio de rol al administrador de la empresa.
          </p>
        </div>
      </div>
    );
  }

  // Layout normal de la aplicación inyectando el rol al Sidebar
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header tenants={tenants} />
      <div className="flex flex-1 overflow-hidden">
        {/* Le pasamos el rol al Sidebar para que oculte o muestre las pestañas correspondientes */}
        <RoleBasedSidebar currentRole={userRole} />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}