"use client";

import { useUser } from "@clerk/nextjs";

export default function AdminTestPage() {
  const { user, isLoaded } = useUser();

  console.log('AdminTestPage - Rendered, user:', !!user, 'isLoaded:', isLoaded);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando usuario...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">No hay usuario autenticado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Página de Prueba Admin</h1>
        
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">Información del Usuario:</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="font-medium text-gray-600">ID:</span>
              <p className="text-gray-900">{user.id}</p>
            </div>
            
            <div>
              <span className="font-medium text-gray-600">Email:</span>
              <p className="text-gray-900">{user.primaryEmailAddress?.emailAddress}</p>
            </div>
            
            <div>
              <span className="font-medium text-gray-600">Rol (Public Metadata):</span>
              <p className="text-gray-900">{user.publicMetadata?.role || 'No definido'}</p>
            </div>
            
            <div>
              <span className="font-medium text-gray-600">Rol (Unsafe Metadata):</span>
              <p className="text-gray-900">{user.unsafeMetadata?.role || 'No definido'}</p>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 rounded">
            <h3 className="font-medium text-blue-900 mb-2">Verificación de Acceso:</h3>
            <p className="text-blue-700">
              {user.publicMetadata?.role === 'SUPER_ADMIN' || user.unsafeMetadata?.role === 'SUPER_ADMIN' 
                ? '✅ Usuario tiene acceso de SUPER_ADMIN' 
                : '❌ Usuario no tiene acceso de SUPER_ADMIN'}
            </p>
          </div>
          
          <div className="mt-6 space-x-4">
            <button 
              onClick={() => window.location.href = '/admin/dashboard'}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Ir al Dashboard Admin
            </button>
            
            <button 
              onClick={() => window.location.href = '/dashboard'}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
            >
              Ir al Dashboard Normal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
