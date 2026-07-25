"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { TenantProvider } from "@/lib/contexts/TenantContext";
import RoleBasedSidebar from "@/components/RoleBasedSidebar";
import { TenantHeader } from "@/components/dashboard/TenantHeader";

export default function TenantAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isLoaded && mounted) {
      if (!user) {
        router.replace('/auth/login');
      }
    }
  }, [isLoaded, mounted, user, router]);

  if (!isLoaded || !mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <TenantProvider>
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <RoleBasedSidebar />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <TenantHeader tenants={[]} />

          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </main>
        </div>
      </div>
    </TenantProvider>
  );
}
