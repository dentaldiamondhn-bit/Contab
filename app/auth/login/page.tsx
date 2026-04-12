'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Building2, Shield, AlertCircle } from 'lucide-react';
import { 
  checkRateLimit, 
  recordFailedAttempt, 
  recordSuccessfulAttempt,
  isValidEmail,
  sanitizeInput
} from '@/lib/login-security';

// Cliente Supabase lazy-loaded para evitar errores de módulos Node.js
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

interface ValidationErrors {
  email?: string;
  password?: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState(5);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockTimeLeft, setBlockTimeLeft] = useState<number | undefined>();
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState({ email: false, password: false });

  // Check rate limit on mount
  useEffect(() => {
    const identifier = getIdentifier();
    const rateLimit = checkRateLimit(identifier);
    setAttemptsRemaining(rateLimit.remainingAttempts);
    setIsBlocked(!rateLimit.allowed);
    setBlockTimeLeft(rateLimit.blockTimeLeft);
  }, []);

  // Countdown timer for block
  useEffect(() => {
    if (isBlocked && blockTimeLeft) {
      const interval = setInterval(() => {
        setBlockTimeLeft((prev) => {
          if (prev && prev > 1) return prev - 1;
          // Unblock when time expires
          setIsBlocked(false);
          return undefined;
        });
      }, 60000); // Update every minute
      return () => clearInterval(interval);
    }
  }, [isBlocked, blockTimeLeft]);

  const getIdentifier = () => {
    // Use a combination of email and IP-like identifier
    return `login_${loginData.email.toLowerCase().trim()}`;
  };

  // Real-time validation
  const validateField = (name: string, value: string): string | undefined => {
    switch (name) {
      case 'email':
        if (!value.trim()) return 'El correo es requerido';
        if (!isValidEmail(value)) return 'Ingresa un correo válido';
        return undefined;
      case 'password':
        if (!value) return 'La contraseña es requerida';
        if (value.length < 6) return 'Mínimo 6 caracteres';
        return undefined;
      default:
        return undefined;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const sanitized = name === 'email' ? sanitizeInput(value) : value;
    
    setLoginData(prev => ({ ...prev, [name]: sanitized }));
    
    // Real-time validation
    if (touched[name as keyof typeof touched]) {
      const error = validateField(name, sanitized);
      setValidationErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, value);
    setValidationErrors(prev => ({ ...prev, [name]: error }));
  };

  const isFormValid = () => {
    const emailError = validateField('email', loginData.email);
    const passwordError = validateField('password', loginData.password);
    return !emailError && !passwordError && !isBlocked;
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Validate all fields
    setTouched({ email: true, password: true });
    const emailError = validateField('email', loginData.email);
    const passwordError = validateField('password', loginData.password);
    setValidationErrors({ email: emailError, password: passwordError });
    
    if (emailError || passwordError || isBlocked) {
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      const identifier = getIdentifier();
      
      // Check rate limit before attempting login
      const rateLimit = checkRateLimit(identifier);
      if (!rateLimit.allowed) {
        setIsBlocked(true);
        setBlockTimeLeft(rateLimit.blockTimeLeft);
        throw new Error(`Demasiados intentos fallidos. Intenta nuevamente en ${rateLimit.blockTimeLeft} minutos.`);
      }
      
      const client = await getSupabaseClient();
      const { data, error } = await client.auth.signInWithPassword({
        email: loginData.email.toLowerCase().trim(),
        password: loginData.password
      });

      if (error) {
        recordFailedAttempt(identifier);
        const updatedRateLimit = checkRateLimit(identifier);
        setAttemptsRemaining(updatedRateLimit.remainingAttempts);
        
        if (!updatedRateLimit.allowed) {
          setIsBlocked(true);
          setBlockTimeLeft(updatedRateLimit.blockTimeLeft);
          throw new Error(`Cuenta bloqueada por seguridad. Intenta nuevamente en ${updatedRateLimit.blockTimeLeft} minutos.`);
        }
        
        throw error;
      }

      if (data.user) {
        recordSuccessfulAttempt(identifier);
        
        // Handle remember me
        if (rememberMe) {
          localStorage.setItem('rememberedEmail', loginData.email);
        } else {
          localStorage.removeItem('rememberedEmail');
        }
        
        // Check if user has completed onboarding
        const hasCompletedOnboarding = localStorage.getItem('onboardingComplete');
        const userMode = localStorage.getItem('userMode');
        
        if (!hasCompletedOnboarding || !userMode) {
          router.push('/onboarding');
        } else {
          router.push(userMode === 'accountant' ? '/companies' : '/dashboard');
        }
      } else {
        throw new Error('No se pudo iniciar sesión');
      }
    } catch (error: any) {
      setError(error.message || 'Error al iniciar sesión. Verifica tus credenciales.');
    } finally {
      setLoading(false);
    }
  };

  // Load remembered email on mount
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      setLoginData(prev => ({ ...prev, email: rememberedEmail }));
      setRememberMe(true);
    }
  }, []);

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

        {/* Login Card */}
        <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">Bienvenido de vuelta</h2>
            <p className="text-gray-500 mt-1">Ingresa tus credenciales para continuar</p>
          </div>

          {/* Rate Limit Warning */}
          {isBlocked && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">Cuenta temporalmente bloqueada</p>
                <p className="text-sm text-red-600">Demasiados intentos fallidos. Intenta nuevamente en {blockTimeLeft} minutos.</p>
              </div>
            </div>
          )}
          
          {!isBlocked && attemptsRemaining < 5 && attemptsRemaining > 0 && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-700">
                {attemptsRemaining} {attemptsRemaining === 1 ? 'intento restante' : 'intentos restantes'} antes del bloqueo temporal.
              </p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Correo Electrónico
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="tu@empresa.com"
                value={loginData.email}
                onChange={handleInputChange}
                onBlur={handleBlur}
                disabled={isBlocked || loading}
                className={`w-full px-4 py-3 border rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  validationErrors.email && touched.email
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-200 bg-red-50'
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                } ${(isBlocked || loading) ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
              {validationErrors.email && touched.email && (
                <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {validationErrors.email}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={loginData.password}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  disabled={isBlocked || loading}
                  className={`w-full px-4 py-3 border rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12 ${
                    validationErrors.password && touched.password
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200 bg-red-50'
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                  } ${(isBlocked || loading) ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isBlocked || loading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 transition-colors rounded-md hover:bg-gray-100"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {validationErrors.password && touched.password && (
                <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {validationErrors.password}
                </p>
              )}
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                />
                <span className="ml-2 text-sm text-gray-600">Recordarme</span>
              </label>
              <Link href="/auth/reset-password" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            {/* Error Message */}
            {error && !isBlocked && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || isBlocked}
              className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-lg shadow-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12c0 4.42 3.582 8 8 8V6z"></path>
                  </svg>
                  Iniciando sesión...
                </>
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </form>

          {/* Register Link */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-center text-sm text-gray-600">
              ¿No tienes una cuenta?{' '}
              <Link href="/auth/register" className="font-semibold text-blue-600 hover:text-blue-800 transition-colors">
                Regístrate aquí
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-blue-200">
          <p>© 2024 Contab - Sistema Contable Profesional</p>
          <p className="mt-1">Cumple con normativas SAR y estándares de seguridad</p>
        </div>
      </div>
    </div>
  );
}
