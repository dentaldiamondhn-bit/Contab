"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
      // TEMPORAL: Permitir acceso para pruebas
      const isTestEmail = email === 'dentaldiamondhn@gmail.com' || email === 'sucachi.123@gmail.com';

      console.log('SupportLayout - User check:', { userRole, email, isTestEmail });

      // Allow SUPPORT role or test emails
      if (userRole !== 'SUPPORT' && !isTestEmail) {
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando usuario...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('SupportLayout - No user found after loading');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600 mx-auto mb-4"></div>
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
  // TEMPORAL: Permitir acceso para pruebas
  const isTestEmail = email === 'dentaldiamondhn@gmail.com' || email === 'sucachi.123@gmail.com';

  // Don't render anything for non-support users
  if (userRole !== 'SUPPORT' && !isTestEmail) {
    console.log('SupportLayout - BLOCKING ACCESS: Not support user');
    return null;
  }

  console.log('SupportLayout - Rendering children');
  
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-green-600 text-white px-6 py-4 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-2xl font-bold">Panel de Soporte</h1>
              <p className="text-green-100">
                Visión global del sistema
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm">
                {user.primaryEmailAddress?.emailAddress}
              </span>
              <div className="w-8 h-8 bg-green-700 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user.primaryEmailAddress?.emailAddress?.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </header>
        
        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
