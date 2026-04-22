'use client';

import { useState } from 'react';

export default function CreateUserPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');

  const createAdminUser = async () => {
    if (!supabaseUrl || !supabaseKey) {
      setError('Por favor ingresa la URL y la clave de Supabase');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      // Crear cliente dinámicamente
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl, supabaseKey);

      console.log('Creando usuario admin...');
      
      const { data, error } = await supabase.auth.signUp({
        email: 'admin@contab.com',
        password: 'admin123',
        options: {
          data: {
            name: 'Administrador Sistema',
            role: 'admin'
          }
        }
      });

      console.log('Respuesta signUp:', { data, error });

      if (error) {
        if (error.message.includes('already registered') || error.message.includes('User already registered')) {
          setMessage('⚠️ El usuario ya existe. Intenta hacer login directamente.');
        } else {
          throw error;
        }
      } else {
        setMessage('✅ Usuario administrador creado exitosamente! Revisa tu email para confirmar.');
        console.log('Usuario creado:', data);
      }

    } catch (error: any) {
      console.error('Error en createUser:', error);
      setError(error.message || 'Error creando usuario');
    } finally {
      setLoading(false);
    }
  };

  const testLogin = async () => {
    if (!supabaseUrl || !supabaseKey) {
      setError('Por favor ingresa la URL y la clave de Supabase');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      // Crear cliente dinámicamente
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl, supabaseKey);

      console.log('Probando login...');
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'admin@contab.com',
        password: 'admin123'
      });

      console.log('Respuesta login:', { data, error });

      if (error) {
        setMessage(`❌ Login falló: ${error.message}`);
      } else {
        setMessage('✅ Login funciona! Redirigiendo...');
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1000);
      }

    } catch (error: any) {
      console.error('Error en testLogin:', error);
      setError(error.message || 'Error probando login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">Crear Usuario Admin</h2>
            <p className="text-gray-600 mt-1">Crea el usuario administrador para el sistema</p>
          </div>

          <div className="space-y-4">
            {/* Configuración de Supabase */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-medium text-yellow-900 mb-3">Configuración de Supabase:</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Supabase URL
                  </label>
                  <input
                    type="text"
                    placeholder="https://your-project.supabase.co"
                    value={supabaseUrl}
                    onChange={(e) => setSupabaseUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Supabase Anon Key
                  </label>
                  <input
                    type="password"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={supabaseKey}
                    onChange={(e) => setSupabaseKey(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Info del usuario */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">Usuario a crear:</h3>
              <div className="text-sm text-blue-800 space-y-1">
                <p><strong>Email:</strong> admin@contab.com</p>
                <p><strong>Password:</strong> admin123</p>
                <p><strong>Rol:</strong> Administrador</p>
              </div>
            </div>

            {/* Botones */}
            <div className="space-y-3">
              <button
                onClick={createAdminUser}
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creando usuario...
                  </>
                ) : '1. Crear Usuario Administrador'}
              </button>

              <button
                onClick={testLogin}
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Probando...
                  </>
                ) : '2. Probar Login Directo'}
              </button>
            </div>

            {message && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm">
                {message}
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}
          </div>

          <div className="mt-6 text-center">
            <a href="/auth/login" className="text-sm text-blue-600 hover:text-blue-500">
              ← Volver al login
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
