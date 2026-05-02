"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { HeadphonesIcon, LifeBuoy, Shield, LogOut } from "lucide-react";
import { SidebarProvider } from "@/app/contexts/SidebarContext";
import RoleBasedSidebar from "@/components/RoleBasedSidebar";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function SupportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  console.log('SupportLayout - Component rendered, user:', !!user, 'isLoaded:', isLoaded);

  useEffect(() => {
    if (user) {
      // Check multiple sources for role metadata
      const userRole = user.publicMetadata?.role ||
                       user.unsafeMetadata?.role ||
                       (user as any).privateMetadata?.role;

      const email = user.primaryEmailAddress?.emailAddress;

      console.log('SupportLayout - User check:', { userRole, email });

      // Only allow SUPPORT role
      if (userRole !== 'SUPPORT') {
        console.log('SupportLayout - BLOCKING ACCESS: Not support user');
        router.replace('/dashboard');
      } else {
        console.log('SupportLayout - ALLOWING ACCESS: Support user confirmed');
      }
    }
  }, [user, router]);

  // Show loading while user is not loaded
  if (!isLoaded) {
    console.log('SupportLayout - Showing loading, user not loaded yet');
    return (
      <div className="flex items-center justify-center min-h-screen bg-orange-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-orange-600 font-medium">Verificando acceso de soporte...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('SupportLayout - No user found after loading');
    return (
      <div className="flex items-center justify-center min-h-screen bg-orange-50">
        <div className="text-center">
          <HeadphonesIcon className="h-16 w-16 text-orange-400 mx-auto mb-4" />
          <p className="text-orange-600 font-medium">Usuario no encontrado...</p>
        </div>
      </div>
    );
  }

  // Check user role
  const userRole = user.publicMetadata?.role ||
                   user.unsafeMetadata?.role ||
                   (user as any).privateMetadata?.role;

  // Only allow SUPPORT role
  if (userRole !== 'SUPPORT') {
    console.log('SupportLayout - BLOCKING ACCESS: Not support user');
    return null;
  }

  console.log('SupportLayout - Rendering children');
  
  return (
    <SidebarProvider>
      <div className="flex h-screen bg-gray-50">
        {/* Support Sidebar - Same as Admin */}
        <RoleBasedSidebar />
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Page Content */}
          <main className="flex-1 overflow-auto bg-orange-50/30">
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
