'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SignUpPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirigir a la página de registro correcta
    router.replace('/auth/register');
  }, [router]);

  // Mostrar loader mientras redirige
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirigiendo al registro...</p>
      </div>
    </div>
  );
}
