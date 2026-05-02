'use client';

import { SignUp } from '@clerk/nextjs';
import { Building2, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';

export default function RegisterPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [isChecking, setIsChecking] = useState(false);

  // Si el usuario ya está autenticado, redirigir al login
  useEffect(() => {
    if (isLoaded && user) {
      console.log('🔄 Usuario ya autenticado, redirigiendo al login...');
      router.push('/auth/login');
    }
  }, [isLoaded, user, router]);

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

        {/* Clerk SignUp Card */}
        <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
          <SignUp
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
            signInUrl="/auth/login"
            fallbackRedirectUrl="/auth/login"
            redirectUrl="/auth/login"
          />
        </div>

        {/* Additional Info */}
        <div className="mt-6 text-center">
          <p className="text-blue-200 text-sm">
            Al registrarte, podrás acceder a nuestro sistema contable profesional
          </p>
          <div className="mt-4">
            <p className="text-blue-300 text-sm">
              ¿Ya tienes una cuenta?{' '}
              <a 
                href="/auth/login" 
                className="text-blue-400 hover:text-blue-300 font-semibold transition-colors"
              >
                Inicia sesión aquí
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
