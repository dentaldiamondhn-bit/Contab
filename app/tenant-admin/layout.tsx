"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Badge } from "@/components/ui/badge";
import { useTenant } from "@/lib/contexts/TenantContext";

export default function TenantAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const { currentTenant } = useTenant();
  const [isRedirecting, setIsRedirecting] = useState(false);

  console.log('TenantAdminLayout - Component rendered, user:', !!user, 'isLoaded:', isLoaded);

  useEffect(() => {
    if (user) {
      // Check multiple sources for role metadata
      const userRole = user.publicMetadata?.role ||
                       user.unsafeMetadata?.role ||
                       (user as any).privateMetadata?.role;

      // Check if this is the specific SUPER_ADMIN email
      const email = user.primaryEmailAddress?.emailAddress;
      const isSuperAdminEmail = email === 'sucachi.123@gmail.com';

      console.log('TenantAdminLayout - User check:', { email, userRole, isSuperAdminEmail });

      // Allow access to ADMIN, MANAGER, and SUPER_ADMIN
      if (!['ADMIN', 'MANAGER', 'SUPER_ADMIN'].includes(userRole as string) && !isSuperAdminEmail) {
        console.log('TenantAdminLayout - BLOCKING ACCESS: Not admin user');
        router.replace('/dashboard');
      } else {
        console.log('TenantAdminLayout - ALLOWING ACCESS: Admin user confirmed');
      }
    }
  }, [user, router]);

  // Show loading while user is not loaded
  if (!isLoaded) {
    console.log('TenantAdminLayout - Showing loading, user not loaded yet');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando usuario...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('TenantAdminLayout - No user found after loading');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Usuario no encontrado...</p>
        </div>
      </div>
    );
  }

  // Check user role
  const userRole = user.publicMetadata?.role ||
                   user.unsafeMetadata?.role ||
                   (user as any).privateMetadata?.role;
  const email = user.primaryEmailAddress?.emailAddress;
  const isSuperAdminEmail = email === 'sucachi.123@gmail.com';

  // Don't render anything for non-admin users
  if (!['ADMIN', 'MANAGER', 'SUPER_ADMIN'].includes(userRole as string) && !isSuperAdminEmail) {
    console.log('TenantAdminLayout - BLOCKING ACCESS: Not admin user');
    return null;
  }

  console.log('TenantAdminLayout - Rendering children without SidebarProvider');
  
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">Panel de Administración</h1>
              <p className="text-gray-600">
                Gestión de <span className="font-medium">{currentTenant?.businessName || 'Empresa'}</span>
              </p>
              {currentTenant?.businessRTN && (
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    RTN: {currentTenant.businessRTN}
                  </Badge>
                  {currentTenant.businessAddress && (
                    <Badge variant="secondary" className="text-xs">
                      {currentTenant.businessAddress}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                    Admin Activo
                  </Badge>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {user.primaryEmailAddress?.emailAddress}
              </span>
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user.primaryEmailAddress?.emailAddress?.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </header>
        
        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
