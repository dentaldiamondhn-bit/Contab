"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AuthCallbackPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    // Debug logging
    console.log('AuthCallback - User data:', {
      isLoaded,
      hasUser: !!user,
      userId: user?.id,
      email: user?.primaryEmailAddress?.emailAddress,
      metadata: user?.publicMetadata,
      unsafeMetadata: user?.unsafeMetadata
    });

    if (user) {
      // Try multiple sources for role metadata
      const userRole = user.publicMetadata?.role || 
                       user.unsafeMetadata?.role ||
                       (user as any).privateMetadata?.role;

      console.log('AuthCallback - Detected role:', userRole);

      // Check if this is the specific SUPER_ADMIN email
      const email = user.primaryEmailAddress?.emailAddress;
      const isSuperAdminEmail = email === 'sucachi.123@gmail.com';
      
      console.log('AuthCallback - Email check:', { email, isSuperAdminEmail });

      // Determine redirect based on role or email
      let redirectUrl = '/dashboard'; // default
      
      if (userRole === 'SUPER_ADMIN' || userRole === 'SUPPORT' || isSuperAdminEmail) {
        redirectUrl = '/admin/dashboard';
        console.log('AuthCallback - Redirecting to admin dashboard');
      } else {
        console.log('AuthCallback - Redirecting to regular dashboard');
      }

      console.log('AuthCallback - Final redirect URL:', redirectUrl);
      
      // Add a small delay to ensure everything is loaded
      setTimeout(() => {
        router.replace(redirectUrl);
      }, 100);
      
    } else {
      console.log('AuthCallback - No user found, redirecting to login');
      // Si no hay usuario, redirigir al login
      router.replace('/auth/login');
    }
  }, [user, isLoaded, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
          <span className="text-white text-2xl font-bold">C</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Contab</h1>
        <p className="text-gray-600 mb-4">Redirigiendo...</p>
        <div className="inline-flex items-center">
          <svg className="animate-spin h-5 w-5 mr-2 text-blue-600" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm text-gray-600">Iniciando sesión...</span>
        </div>
      </div>
    </div>
  );
}
