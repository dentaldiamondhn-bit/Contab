"use client";

export default function AdminTestSimplePage() {
  console.log('AdminTestSimplePage - Component loaded');
  console.log('AdminTestSimplePage - Current URL:', typeof window !== 'undefined' ? window.location.href : 'SSR');

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Página de Prueba Admin Simple</h1>
        
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">Verificación de Ruta Admin</h2>
          
          <div className="space-y-2">
            <p className="text-gray-600">✅ Esta página está en: /admin/test-simple</p>
            <p className="text-gray-600">✅ Si puedes ver esto, las rutas de admin funcionan</p>
            <p className="text-gray-600">✅ El problema está específicamente en /admin/dashboard</p>
          </div>
          
          <div className="mt-6 space-x-4">
            <button 
              onClick={() => window.location.href = '/admin/dashboard'}
              className="bg-cyan-600 text-white px-4 py-2 rounded hover:bg-cyan-700"
            >
              Ir a Admin Dashboard
            </button>
            
            <button 
              onClick={() => window.location.href = '/dashboard'}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
            >
              Ir a Dashboard Normal
            </button>
            
            <button 
              onClick={() => window.location.href = '/'}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Ir a Inicio
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
