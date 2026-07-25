'use client';

import { usePathname } from 'next/navigation';
import RoleBasedSidebar from '@/components/RoleBasedSidebar';
import Header from './Header';
import { useTenant } from '@/lib/contexts/TenantContext';

interface LayoutWrapperProps {
  children: React.ReactNode;
  tenants: any[];
}

export default function LayoutWrapper({ children, tenants }: LayoutWrapperProps) {
  const pathname = usePathname() || '';
  const { isSuperAdmin: isGlobalSuperAdmin } = useTenant();
  const rawRole = (useTenant() as any).currentTenant?.currentUserRole;
  const userRole = isGlobalSuperAdmin ? 'SUPER_ADMIN' : (rawRole || 'VIEWER');

  // Rutas que NO deben mostrar sidebar/header (tienen su propio layout o son públicas)
  const isAuthPage = pathname.startsWith('/auth/') || pathname === '/login' || pathname === '/register';
  const isOnboarding = pathname === '/onboarding' || pathname.startsWith('/onboarding/');
  const isSupportPage = pathname.startsWith('/support');
  const isAdminPage = pathname.startsWith('/admin');
  const isDashboardPage = pathname.startsWith('/dashboard');
  const isTenantAdminPage = pathname.startsWith('/tenant-admin');
  const isAccountantPage = pathname.startsWith('/accountant');

  const skipLayout = isAuthPage || isOnboarding || isSupportPage || isAdminPage || isDashboardPage || isTenantAdminPage || isAccountantPage;

  if (skipLayout) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header tenants={tenants} />
      <div className="flex flex-1 overflow-hidden">
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
