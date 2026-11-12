"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  console.log('AdminDashboardLayout - Component rendered, user:', !!user, 'isLoaded:', isLoaded);

  useEffect(() => {
    if (user) {
      // Check multiple sources for role metadata
      const userRole = user.publicMetadata?.role || 
                       user.unsafeMetadata?.role ||
                       (user as any).privateMetadata?.role;
      
      // Check if this is the specific SUPER_ADMIN email
      const email = user.primaryEmailAddress?.emailAddress;
      const isSuperAdminEmail = email === 'sucachi.123@gmail.com';
      
      console.log('AdminDashboardLayout - User check:', { email, userRole, isSuperAdminEmail });
      
      if (!['SUPER_ADMIN', 'SUPPORT'].includes(userRole as string) && !isSuperAdminEmail) {
        console.log('AdminDashboardLayout - BLOCKING ACCESS: Not admin user');
        router.replace('/dashboard');
      } else {
        console.log('AdminDashboardLayout - ALLOWING ACCESS: Admin user confirmed');
      }
    }
  }, [user, router]);

  // Show loading while user is not loaded
  if (!isLoaded) {
    console.log('AdminDashboardLayout - Showing loading, user not loaded yet');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-cyan-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando usuario...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('AdminDashboardLayout - No user found after loading');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-cyan-600 mx-auto mb-4"></div>
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
  
  if (!['SUPER_ADMIN', 'SUPPORT'].includes(userRole as string) && !isSuperAdminEmail) {
    console.log('AdminDashboardLayout - BLOCKING ACCESS: Not admin user');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-cyan-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Acceso no autorizado...</p>
        </div>
      </div>
    );
  }

  console.log('AdminDashboardLayout - Rendering children');
  
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 relative z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Panel Administrativo</h1>
            <p className="text-sm text-gray-500">
              {userRole === 'SUPER_ADMIN' ? 'Super Administrador' : 'Soporte Técnico'}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              {user.primaryEmailAddress?.emailAddress}
            </span>
            <div className="w-8 h-8 bg-cyan-600 rounded-full flex items-center justify-center">
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
  );
}
