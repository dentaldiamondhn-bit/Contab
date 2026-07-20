"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Badge } from "@/components/ui/badge";
import { useTenant } from "@/lib/contexts/TenantContext";
import { TenantProvider } from "@/lib/contexts/TenantContext";
import Sidebar from "@/app/components/Sidebar";
import Header from "@/app/components/Header";

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

  console.log('TenantAdminLayout - Rendering children without TenantProvider');
   
  return (
    <TenantProvider>
      <div className="flex h-screen bg-gray-50">
        {/* Sidebar */}
        <Sidebar />
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <Header tenants={[]} />
          <main className="flex-1 overflow-auto">
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </main>
        </div>
      </div>
    </TenantProvider>
  );
}