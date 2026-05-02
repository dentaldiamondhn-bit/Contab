'use client';

import { SignIn, useUser } from '@clerk/nextjs';
import { Building2, Shield, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [checkingOnboarding, setCheckingOnboarding] = useState(false);
  const [shouldCheckOnboarding, setShouldCheckOnboarding] = useState(false);

  // Debug inicial
  console.log('🔍 Estado inicial:', { 
    isLoaded, 
    user: user ? 'exists' : 'null', 
    userId: user?.id,
    shouldCheckOnboarding,
    checkingOnboarding 
  });

  // Verificar si el usuario necesita onboarding después de iniciar sesión
  useEffect(() => {
    if (shouldCheckOnboarding && isLoaded && user) {
      // Esperar 1 segundo antes de verificar para que el usuario vea la interfaz
      const timer = setTimeout(() => {
        checkOnboardingStatus();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [shouldCheckOnboarding, isLoaded, user]);

  // Detectar cuando el usuario acaba de iniciar sesión
  useEffect(() => {
    // Solo activar verificación si el usuario está autenticado (user existe)
    if (isLoaded && user && !shouldCheckOnboarding) {
      console.log('👤 Usuario autenticado detectado, activando verificación...');
      // Esperar un momento antes de activar la verificación
      const timer = setTimeout(() => {
        setShouldCheckOnboarding(true);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [isLoaded, user, shouldCheckOnboarding]);

  const checkOnboardingStatus = async () => {
    // Guard clause: no verificar si no hay usuario autenticado
    if (!user) {
      console.log('❌ No hay usuario autenticado, cancelando verificación');
      setCheckingOnboarding(false);
      return;
    }
    
    setCheckingOnboarding(true);
    
    try {
      console.log('🔍 Verificando estado de onboarding...');
      console.log('👤 Estado del usuario:', { isLoaded, user: user ? 'exists' : 'null', userId: user?.id });
      
      // Verificar si el usuario tiene un tenant asociado
      const response = await fetch('/api/tenant/check-user-tenant', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('📡 API Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('📊 API Response data:', data);
        
        // Si no tiene tenant o necesita onboarding, redirigir
        if (!data.hasTenant || data.needsOnboarding) {
          console.log('🔄 Usuario necesita onboarding, redirigiendo a /onboarding...');
          setTimeout(() => {
            router.replace('/onboarding');
          }, 2000); // 2 segundos para mostrar el proceso
        } else {
          // Si ya tiene todo configurado, ir al dashboard
          console.log('✅ Usuario configurado, redirigiendo al dashboard...');
          setTimeout(() => {
            router.replace('/dashboard');
          }, 100);
        }
      } else {
        // Si hay error, ir al dashboard por defecto
        console.log('⚠️ Error verificando onboarding, yendo al dashboard...');
        setTimeout(() => {
          router.replace('/dashboard');
        }, 100);
      }
    } catch (error) {
      console.error('❌ Error verificando onboarding:', error);
      // En caso de error, ir al dashboard
      setTimeout(() => {
        router.replace('/dashboard');
      }, 100);
    } finally {
      setCheckingOnboarding(false);
    }
  };

  // Si está verificando onboarding, mostrar overlay
  if (checkingOnboarding) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 text-center max-w-sm">
          <Loader2 className="h-8 w-8 text-blue-600 animate-spin mb-4 mx-auto" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Verificando tu cuenta...</h2>
          <p className="text-gray-600 text-sm">Estamos configurando tu experiencia personalizada</p>
          <p className="text-gray-500 text-xs mt-2">Serás redirigido al onboarding en unos segundos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      {/* Floating shapes for visual interest */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" />
      <div className="absolute bottom-20 right-20 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }} />

      <div className="w-full max-w-md relative z-10">
        {/* Logo and Branding */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center mb-4">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-4 rounded-2xl shadow-2xl">
              <Building2 className="h-10 w-10 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Contab</h1>
          <p className="text-blue-200 mt-2 text-lg">Sistema Contable Profesional</p>
          <div className="flex items-center justify-center gap-2 mt-3">
            <Shield className="h-4 w-4 text-green-400" />
            <span className="text-sm text-green-400">Compatible SAR • Seguro • Confiable</span>
          </div>
        </div>

        {/* Clerk SignIn Card - Solo mostrar si no está autenticado o está cargando */}
        {(!isLoaded || !user) && (
          <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
            <SignIn
              routing="hash"
              appearance={{
                elements: {
                  rootBox: "w-full flex justify-center",
                  card: "shadow-none w-full p-8",
                  form: "w-full",
                  socialButtonsBlockButton: "w-full py-3 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all",
                  formButtonPrimary: "w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-lg shadow-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all transform hover:scale-[1.02] active:scale-[0.98]",
                  footerAction: "w-full text-center flex justify-center items-center",
                  footerActionLink: "font-semibold text-blue-600 hover:text-blue-800 transition-colors",
                  formFieldInput: "w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
                  formFieldLabel: "w-full block text-sm font-medium text-gray-700 mb-1.5",
                  headerTitle: "w-full text-2xl font-bold text-gray-900 text-center",
                  headerSubtitle: "w-full text-gray-600 text-center",
                  dividerLine: "border-gray-300",
                  dividerText: "text-gray-500",
                  identityPreview: "text-gray-700",
                  formField: "space-y-4",
                  formButton: "w-full",
                  socialButtonsBlock: "w-full",
                  socialButtonsBlockButtons: "space-y-2",
                  socialButtonsBlockButtonType: "icon",
                  socialButtonsBlockButtonIcon: "w-5 h-5",
                  footer: "w-full mt-6 text-center",
                  footerActionText: "text-gray-600",
                  header: "w-full text-center mb-6",
                  identityPreviewText: "text-gray-700",
                  identityPreviewCard: "bg-gray-50 border border-gray-200 rounded-lg p-4",
                  identityPreviewCardAvatar: "w-12 h-12",
                  identityPreviewCardText: "text-gray-900",
                  identityPreviewCardSecondaryText: "text-gray-600",
                }
              }}
              fallbackRedirectUrl="/auth/login" // Mantener en login para que nuestro useEffect se ejecute
            />
          </div>
        )}

        {/* Mensaje para usuarios autenticados */}
        {isLoaded && user && !checkingOnboarding && !shouldCheckOnboarding && (
          <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 overflow-hidden p-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Bienvenido de nuevo</h2>
            <p className="text-gray-600 mb-4">Preparando tu experiencia...</p>
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        )}

        {/* Mensaje cuando se está por verificar */}
        {isLoaded && user && !checkingOnboarding && shouldCheckOnboarding && (
          <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 overflow-hidden p-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Sesión iniciada</h2>
            <p className="text-gray-600 mb-4">Verificando tu configuración...</p>
            <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        )}

        {/* Additional Info */}
        <div className="mt-6 text-center">
          <p className="text-blue-200 text-sm">
            Al iniciar sesión, serás redirigido automáticamente al onboarding si eres un nuevo usuario
          </p>
        </div>
      </div>
    </div>
  );
}
