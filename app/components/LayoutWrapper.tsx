'use client';

import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import Header from './Header';

interface LayoutWrapperProps {
  children: React.ReactNode;
  tenants: any[];
}

export default function LayoutWrapper({ children, tenants }: LayoutWrapperProps) {
  const pathname = usePathname();
  const isOnboarding = pathname === '/onboarding' || pathname?.startsWith('/onboarding/');
  const isAuthPage = pathname?.startsWith('/auth/') || pathname === '/login' || pathname === '/register';
  const isAdminPage = pathname?.startsWith('/admin/');

  // During onboarding, auth, or admin pages, show only children without sidebar/header
  if (isOnboarding || isAuthPage || isAdminPage) {
    console.log('LayoutWrapper - Excluding layout for pathname:', pathname);
    return (
      <div className="min-h-screen bg-gray-50">
        {children}
      </div>
    );
  }

  // Normal layout with sidebar and header
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header tenants={tenants} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
