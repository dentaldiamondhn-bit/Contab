'use client';

import { useState, useEffect } from 'react';

export default function AutoLoginPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // Auto-login después de 5 segundos
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoLogin();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleAutoLogin = async () => {
    setLoading(true);
    setMessage('Iniciando sesión automática...');

    try {
      // Simular login exitoso
      console.log('Login automático iniciado');
      
      // Simular delay para efecto visual
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setMessage('✅ Sesión iniciada exitosamente! Redirigiendo...');
      
      // Redirigir al dashboard
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1000);

    } catch (error: any) {
      console.error('Error en auto login:', error);
      setMessage('❌ Error al iniciar sesión automáticamente');
      setLoading(false);
    }
  };

  const handleManualLogin = () => {
    handleAutoLogin();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-cyan-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Branding */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center mb-4">
            <div className="bg-cyan-50 p-4 rounded-full shadow-lg border border-cyan-200">
              <img src="/logo.png" alt="Diamond Accounting" className="h-8 w-8 object-contain" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Diamond Accounting</h1>
          <p className="text-gray-600 mt-2">Sistema Contable Profesional</p>
        </div>

        {/* Auto Login Card */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">Acceso Automático</h2>
            <p className="text-gray-600 mt-1">Ingresando al sistema sin autenticación</p>
          </div>

          {/* Countdown Timer */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-cyan-100 rounded-full mb-4">
              <span className="text-3xl font-bold text-cyan-600">{countdown}</span>
            </div>
            <p className="text-sm text-gray-600">
              Accediendo automáticamente en {countdown} segundos...
            </p>
          </div>

          {/* Status Message */}
          {message && (
            <div className={`mb-6 p-4 rounded-md text-sm ${
              message.includes('✅') 
                ? 'bg-green-50 border border-green-200 text-green-700' 
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
              {message}
            </div>
          )}

          {/* Manual Login Button */}
          <button
            onClick={handleManualLogin}
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed mb-4"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Accediendo...
              </>
            ) : 'Ingresar Ahora'}
          </button>

          {/* Info Section */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-medium text-yellow-900 mb-2">🔓 Modo Desarrollo</h3>
            <div className="text-sm text-yellow-800 space-y-1">
              <p>• Sin autenticación requerida</p>
              <p>• Acceso directo al dashboard</p>
              <p>• Para pruebas y desarrollo</p>
              <p>• Configurar autenticación más tarde</p>
            </div>
          </div>

          <div className="mt-6 text-center">
            <a href="/auth/login" className="text-sm text-cyan-600 hover:text-cyan-500">
              ← Ir al login con credenciales
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
