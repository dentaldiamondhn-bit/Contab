"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import RoleBasedSidebar from "@/components/RoleBasedSidebar";
import ErrorBoundary from "@/components/ErrorBoundary";
import { SidebarProvider } from "@/app/contexts/SidebarContext";

export default function UserDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoaded } = useUser();
  const router = useRouter();
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

  console.log('UserDashboardLayout - Rendering children with RoleBasedSidebar');
  
  return (
    <SidebarProvider>
      <div className="flex h-screen bg-gray-50">
      {/* User Sidebar */}
      <RoleBasedSidebar />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-500">
                {userRole === 'ADMIN' ? 'Administrador' : 
                 userRole === 'MANAGER' ? 'Gerente' : 
                 userRole === 'USER' ? 'Usuario' : 
                 userRole === 'VIEWER' ? 'Observador' : 'Usuario'}
              </p>
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
        <main className="flex-1 overflow-auto">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </div>
    </SidebarProvider>
  );
}
