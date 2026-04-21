'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Cliente Supabase lazy-loaded
let supabase: any = null;

async function getSupabaseClient() {
  if (!supabase) {
    const { createClient } = await import('@supabase/supabase-js');
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return supabase;
}

export default function TestLoginPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      console.log('Intentando login con:', loginData.email);
      
      // Crear cliente dinámicamente
      const supabase = await getSupabaseClient();

      // Método 1: Intentar signInWithPassword
      console.log('Probando signInWithPassword...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password
      });

      console.log('Respuesta signInWithPassword:', { data, error });

      if (error) {
        // Método 2: Si falla, intentar con diferentes parámetros
        console.log('Probando con opciones adicionales...');
        const { data: data2, error: error2 } = await supabase.auth.signInWithPassword({
          email: loginData.email,
          password: loginData.password,
          options: {
            // Intentar sin opciones adicionales
          }
        });

        console.log('Respuesta con opciones:', { data: data2, error: error2 });

        if (error2) {
          throw error2;
        }

        if (data2.user) {
          setMessage('✅ Login exitoso con opciones adicionales! Redirigiendo...');
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 1000);
        }
      } else {
        if (data.user) {
          setMessage('✅ Login exitoso con signInWithPassword! Redirigiendo...');
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 1000);
        }
      }

    } catch (error: any) {
      console.error('Error en login:', error);
      setError(error.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const testSession = async () => {
    try {
      const supabase = createClient(
        'https://kudsqsbxbmviesiaesct.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1ZHNxc2J4Ym12aWVzaWFlc2N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0ODUyOTEsImV4cCI6MjA5MDA2MTI5MX0.5VPBy5IqGXcNxC_4LWop4QWcgAm1NRGKzI-mhBSzms0'
      );

      console.log('Probando getCurrentSession...');
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      console.log('Sesión actual:', { sessionData, error: sessionError });

      if (sessionError) {
        setError(`Error de sesión: ${sessionError.message}`);
      } else {
        setMessage(`Sesión activa: ${sessionData.session ? 'Sí' : 'No'}`);
      }
    } catch (error: any) {
      console.error('Error probando sesión:', error);
      setError(error.message || 'Error al verificar sesión');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Branding */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center mb-4">
            <div className="bg-blue-600 p-4 rounded-full">
              <span className="text-white text-3xl font-bold">C</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Contab</h1>
          <p className="text-gray-600 mt-2">Sistema Contable Profesional</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">Login de Prueba</h2>
            <p className="text-gray-600 mt-1">Prueba diferentes métodos de autenticación</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Correo Electrónico
              </label>
              <input
                id="email"
                type="email"
                placeholder="tu@correo.com"
                value={loginData.email}
                onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                placeholder="•••••••"
                value={loginData.password}
                onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            {/* Success Message */}
            {message && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12c0 5.514 3.793 9.92 7.5v3c0 1.657 3.343 3.876 5.5v1c0 1.657 3.343 3.876 5.5z" />
                  </svg>
                  Intentando login...
                </>
              ) : 'Iniciar Sesión'}
            </button>
          </form>

          {/* Test Session Button */}
          <div className="mt-4">
            <button
              onClick={testSession}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              Verificar Sesión Actual
            </button>
          </div>

          <div className="mt-6 text-center">
            <a href="/auth/login" className="text-sm text-blue-600 hover:text-blue-500">
              ← Volver al login original
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
