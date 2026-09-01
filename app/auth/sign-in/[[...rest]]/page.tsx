'use client';

import { SignIn } from '@clerk/nextjs';
import { Shield } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function SignInContent() {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect_url') || '/onboarding';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="absolute top-20 left-20 w-72 h-72 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" />
      <div className="absolute bottom-20 right-20 w-72 h-72 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }} />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="flex justify-center items-center mb-4">
            <div className="bg-cyan-50 p-3 rounded-2xl shadow-2xl border border-cyan-200">
              <img src="/logo.png" alt="Diamond Accounting" className="h-10 w-10 object-contain" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Diamond Accounting</h1>
          <p className="text-cyan-200 mt-2 text-lg">Sistema Contable Profesional</p>
          <div className="flex items-center justify-center gap-2 mt-3">
            <Shield className="h-4 w-4 text-green-400" />
            <span className="text-sm text-green-400">Compatible SAR • Seguro • Confiable</span>
          </div>
        </div>

        <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20">
          <SignIn
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-none p-0",
                headerTitle: "text-2xl font-bold text-gray-900 text-center",
                headerSubtitle: "text-gray-600 text-center",
                formButtonPrimary: "w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-lg shadow-lg text-sm font-semibold text-white bg-gradient-to-r from-cyan-600 to-cyan-600 hover:from-cyan-700 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-all transform hover:scale-[1.02] active:scale-[0.98]",
                formFieldLabel: "block text-sm font-medium text-gray-700 mb-1.5",
                formFieldInput: "w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500",
                footerActionLink: "font-semibold text-cyan-600 hover:text-cyan-800 transition-colors",
                socialButtonsBlockButton: "w-full py-3 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-all",
                dividerLine: "border-gray-300",
                dividerText: "text-gray-500",
              },
            }}
            fallbackRedirectUrl="/dashboard"
            signUpUrl={`/auth/register?redirect_url=${encodeURIComponent(redirectUrl)}`}
          />
        </div>

        <div className="text-center mt-8 text-sm text-cyan-200">
          <p>© 2024 Contab - Sistema Contable Profesional</p>
          <p className="mt-1">Cumple con normativas SAR y estándares de seguridad</p>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
      </div>
    }>
      <SignInContent />
    </Suspense>
  );
}
