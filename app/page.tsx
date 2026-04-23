'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to auth callback for proper role-based routing
    router.push('/auth/callback');
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
          <span className="text-white text-2xl font-bold">C</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Contab</h1>
        <p className="text-gray-600 mb-4">Cargando...</p>
        <div className="inline-flex items-center">
          <svg className="animate-spin h-5 w-5 mr-2 text-blue-600" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm text-gray-600">Iniciando...</span>
        </div>
      </div>
    </div>
  );
}
