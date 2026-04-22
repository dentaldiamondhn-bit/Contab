'use client';

import { useState } from 'react';

// Cliente Supabase lazy-loaded
let supabase: any = null;

async function getSupabaseClient(url: string, key: string) {
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(url, key);
}

export default function ResetPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');

  const resetPassword = async () => {
    if (!supabaseUrl || !supabaseKey) {
      setError('Por favor ingresa la URL y la clave de Supabase');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      // Crear cliente dinámicamente
      const supabase = await getSupabaseClient(supabaseUrl, supabaseKey);

      console.log('Reseteando contraseña para admin@contab.com...');
      
      // Usar el admin API para resetear contraseña
      const { data, error } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email: 'admin@contab.com',
        options: {
          redirectTo: `${window.location.origin}/auth/reset-password`
        }
      });

      console.log('Respuesta generateLink:', { data, error });

      if (error) {
        throw error;
      }

      setMessage('✅ Enlace de reseteo generado! Revisa tu email.');
      console.log('Enlace de reseteo:', data.properties?.action_link);

    } catch (error: any) {
      console.error('Error en resetPassword:', error);
      setError(error.message || 'Error reseteando contraseña');
    } finally {
      setLoading(false);
    }
  };

  const updatePasswordDirectly = async () => {
    if (!supabaseUrl || !supabaseKey) {
      setError('Por favor ingresa la URL y la clave de Supabase');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      // Crear cliente dinámicamente
      const supabase = await getSupabaseClient(supabaseUrl, supabaseKey);

      console.log('Actualizando contraseña directamente...');
      
      // Primero obtener el usuario
      const { data: userList, error: listError } = await supabase.auth.admin.listUsers();
      
      if (listError) {
        throw listError;
      }

      const adminUser = userList.users.find(u => u.email === 'admin@contab.com');
      
      if (!adminUser) {
        throw new Error('Usuario admin@contab.com no encontrado');
      }

      console.log('Usuario encontrado:', adminUser);

      // Actualizar la contraseña directamente
      const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
        adminUser.id,
        { 
          password: 'admin123',
          email_confirm: true 
        }
      );

      console.log('Respuesta updateUserById:', { updateData, updateError });

      if (updateError) {
        throw updateError;
      }

      setMessage('✅ Contraseña actualizada directamente a "admin123"! Ahora puedes hacer login.');
      console.log('Usuario actualizado:', updateData);

    } catch (error: any) {
      console.error('Error en updatePasswordDirectly:', error);
      setError(error.message || 'Error actualizando contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">Resetear Contraseña Admin</h2>
            <p className="text-gray-600 mt-1">Restablecer la contraseña del usuario administrador</p>
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
                    Supabase Service Role Key
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
              <h3 className="font-medium text-blue-900 mb-2">Usuario a modificar:</h3>
              <div className="text-sm text-blue-800 space-y-1">
                <p><strong>Email:</strong> admin@contab.com</p>
                <p><strong>Nueva Contraseña:</strong> admin123</p>
              </div>
            </div>

            {/* Botones */}
            <div className="space-y-3">
              <button
                onClick={resetPassword}
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Enviando enlace de reseteo...
                  </>
                ) : '1. Enviar Enlace de Reseteo por Email'}
              </button>

              <button
                onClick={updatePasswordDirectly}
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Actualizando directamente...
                  </>
                ) : '2. Actualizar Contraseña Directamente (Recomendado)'}
              </button>
            </div>

            {/* Mensajes */}
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
