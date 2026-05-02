"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useTenant } from "@/lib/contexts/TenantContext";
import { Badge } from "@/components/ui/badge";

export default function UserDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const { currentTenant } = useTenant();
  const [isRedirecting, setIsRedirecting] = useState(false);

  console.log('UserDashboardLayout - Component rendered, user:', !!user, 'isLoaded:', isLoaded);

  useEffect(() => {
    if (user) {
      // Check multiple sources for role metadata
      const userRole = user.publicMetadata?.role ||
                       user.unsafeMetadata?.role ||
                       (user as any).privateMetadata?.role;

      // Check if this is the specific SUPER_ADMIN email
      const email = user.primaryEmailAddress?.emailAddress;
      const isSuperAdminEmail = email === 'sucachi.123@gmail.com';

      console.log('UserDashboardLayout - User check:', { email, userRole, isSuperAdminEmail });

      // Redirect admin users to admin dashboard
      if (userRole === 'SUPER_ADMIN' || userRole === 'SUPPORT' || isSuperAdminEmail) {
        console.log('UserDashboardLayout - Redirecting admin user to admin dashboard');
        setIsRedirecting(true);
        router.replace('/admin/dashboard');
      } else {
        console.log('UserDashboardLayout - ALLOWING ACCESS: Regular user confirmed');
      }
    }
  }, [user, router]);

  // Show loading while user is not loaded
  if (!isLoaded) {
    console.log('UserDashboardLayout - Showing loading, user not loaded yet');
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
    console.log('UserDashboardLayout - No user found after loading');
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

  // Don't render anything for admin users - let the redirect happen
  if (isRedirecting || (userRole === 'SUPER_ADMIN' || userRole === 'SUPPORT' || isSuperAdminEmail)) {
    console.log('UserDashboardLayout - BLOCKING ACCESS: Admin user, redirecting');
    return null; // Return null to allow redirect to complete
  }

  console.log('UserDashboardLayout - Rendering children without sidebar (will be redirected if admin)');
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            {currentTenant ? (
              <>
                {console.log('🔍 Dashboard - currentTenant:', currentTenant)}
                <h1 className="text-2xl font-bold text-gray-900">Dashboard Contable</h1>
                <p className="text-gray-600">
                  Gestión contable para <span className="font-medium">{currentTenant.businessName}</span>
                </p>
                {currentTenant.businessRTN && (
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">
                      RTN: {currentTenant.businessRTN}
                    </Badge>
                    {currentTenant.businessAddress && (
                      <Badge variant="secondary" className="text-xs">
                        {currentTenant.businessAddress}
                      </Badge>
                    )}
                    {currentTenant.businessEmail && (
                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                        {currentTenant.businessEmail}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                      Dashboard Activo
                    </Badge>
                  </div>
                )}
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-sm text-gray-500">
                  {userRole === 'ADMIN' ? 'Administrador' : 
                   userRole === 'MANAGER' ? 'Gerente' : 
                   userRole === 'USER' ? 'Usuario' : 
                   userRole === 'VIEWER' ? 'Observador' : 'Usuario'}
                </p>
              </>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              {user.primaryEmailAddress?.emailAddress}
            </span>
            <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {user.primaryEmailAddress?.emailAddress?.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </header>
      
      {/* Page Content */}
      <main className="p-6">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </main>
    </div>
  );
}
