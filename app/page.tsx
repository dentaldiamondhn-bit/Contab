export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-center mb-4">Contab</h1>
        <p className="text-gray-600 text-center mb-6">
          Sistema de Contabilidad y Facturación
        </p>
        <div className="space-y-4">
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            <p className="font-semibold">✅ Servidor Funcionando</p>
            <p className="text-sm">Next.js está corriendo correctamente</p>
          </div>
          <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
            <p className="font-semibold">ℹ️ Información</p>
            <p className="text-sm">Si ves esta página, el servidor funciona</p>
            <p className="text-sm">El problema está en la red local</p>
          </div>
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
            <p className="font-semibold">⚠️ Acción Requerida</p>
            <p className="text-sm">1. Revisa firewall de Windows</p>
            <p className="text-sm">2. Deshabilita antivirus temporalmente</p>
            <p className="text-sm">3. Reinicia el navegador</p>
            <p className="text-sm">4. Limpia caché del navegador</p>
          </div>
        </div>
      </div>
    </div>
  );
}
