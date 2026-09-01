"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { TenantHeader } from "@/components/dashboard/TenantHeader";
import RoleBasedSidebar from "@/components/RoleBasedSidebar";

export default function AccountantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (user) {
      const userRole = user.publicMetadata?.role ||
                       user.unsafeMetadata?.role ||
                       (user as any).privateMetadata?.role;

      if (userRole !== 'ACCOUNTANT' && userRole !== 'SUPER_ADMIN') {
        setIsRedirecting(true);
        router.replace('/dashboard');
      }
    }
  }, [user, router]);

  if (!isLoaded || isRedirecting) {
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
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-cyan-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Usuario no encontrado...</p>
        </div>
      </div>
    );
  }

  const userRole = user.publicMetadata?.role ||
                   user.unsafeMetadata?.role ||
                   (user as any).privateMetadata?.role;

  if (userRole !== 'ACCOUNTANT' && userRole !== 'SUPER_ADMIN') {
    return null;
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      <TenantHeader tenants={[]} />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <RoleBasedSidebar />
        <main className="flex-1 overflow-y-auto p-6">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
