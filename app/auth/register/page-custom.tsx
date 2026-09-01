'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Building2, Shield, AlertCircle, CheckCircle, UserPlus } from 'lucide-react';
import { 
  isValidEmail,
  validatePassword,
  sanitizeInput
} from '@/lib/login-security';

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

interface ValidationErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'business_owner'
  });
  
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState({
    firstName: false,
    lastName: false,
    email: false,
    password: false,
    confirmPassword: false
  });

  const validateField = (name: string, value: string): string | undefined => {
    switch (name) {
      case 'firstName':
        if (!value.trim()) return 'El nombre es requerido';
        if (value.trim().length < 2) return 'Mínimo 2 caracteres';
        return undefined;
      case 'lastName':
        if (!value.trim()) return 'El apellido es requerido';
        if (value.trim().length < 2) return 'Mínimo 2 caracteres';
        return undefined;
      case 'email':
        if (!value.trim()) return 'El correo es requerido';
        if (!isValidEmail(value)) return 'Ingresa un correo válido';
        return undefined;
      case 'password':
        if (!value) return 'La contraseña es requerida';
        const passwordValidation = validatePassword(value);
        if (!passwordValidation.valid) {
          return passwordValidation.errors.join(', ');
        }
        return undefined;
      case 'confirmPassword':
        if (!value) return 'Confirma tu contraseña';
        if (value !== formData.password) return 'Las contraseñas no coinciden';
        return undefined;
      default:
        return undefined;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const sanitized = name === 'email' ? sanitizeInput(value) : value;
    
    setFormData(prev => ({ ...prev, [name]: sanitized }));
    
    if (touched[name as keyof typeof touched]) {
      const error = validateField(name, sanitized);
      setValidationErrors(prev => ({ ...prev, [name]: error }));
      
      // Special case: re-validate confirmPassword when password changes
      if (name === 'password' && formData.confirmPassword) {
        const confirmError = validateField('confirmPassword', formData.confirmPassword);
        setValidationErrors(prev => ({ ...prev, confirmPassword: confirmError }));
      }
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, value);
    setValidationErrors(prev => ({ ...prev, [name]: error }));
  };

  const isFormValid = () => {
    const errors = {
      firstName: validateField('firstName', formData.firstName),
      lastName: validateField('lastName', formData.lastName),
      email: validateField('email', formData.email),
      password: validateField('password', formData.password),
      confirmPassword: validateField('confirmPassword', formData.confirmPassword)
    };
    
    setValidationErrors(errors);
    return !Object.values(errors).some(error => error !== undefined);
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Mark all fields as touched
    setTouched({
      firstName: true,
      lastName: true,
      email: true,
      password: true,
      confirmPassword: true
    });
    
    if (!isFormValid()) {
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      // 1. Create user in Supabase Auth
      const client = await getSupabaseClient();
      const { data: authData, error: authError } = await client.auth.signUp({
        email: formData.email.toLowerCase().trim(),
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName.trim(),
            last_name: formData.lastName.trim(),
            role: formData.role
          }
        }
      });

      if (authError) {
        throw authError;
      }

      if (authData.user) {
        // 2. Create user record in our database
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: authData.user.id,
            email: formData.email.toLowerCase().trim(),
            firstName: formData.firstName.trim(),
            lastName: formData.lastName.trim(),
            role: formData.role,
            authId: authData.user.id
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Error al crear usuario en la base de datos');
        }

        setSuccess(true);
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/auth/login');
        }, 3000);
      }
    } catch (error: any) {
      console.error('Error en registro:', error);
      
      // Handle specific error messages
      if (error.message?.includes('User already registered')) {
        setError('Este correo ya está registrado. Intenta iniciar sesión.');
      } else if (error.message?.includes('email')) {
        setError('El correo electrónico no es válido o ya está en uso.');
      } else if (error.message?.includes('password')) {
        setError('La contraseña no cumple con los requisitos de seguridad.');
      } else {
        setError(error.message || 'Error al crear la cuenta. Intenta nuevamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = (password: string): { strength: number; label: string; color: string } => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    const labels = ['Muy débil', 'Débil', 'Regular', 'Buena', 'Fuerte'];
    const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-cyan-500', 'bg-green-500'];
    
    return {
      strength,
      label: labels[strength - 1] || 'Muy débil',
      color: colors[strength - 1] || 'bg-red-500'
    };
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">¡Cuenta creada!</h2>
            <p className="text-gray-600 mb-4">
              Tu cuenta ha sido creada exitosamente. Te hemos enviado un correo de confirmación.
            </p>
            <p className="text-sm text-gray-500">
              Redirigiendo al login en unos segundos...
            </p>
          </div>
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
      
      {/* Floating shapes */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" />
      <div className="absolute bottom-20 right-20 w-72 h-72 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }} />
      
      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="flex justify-center items-center mb-3">
            <div className="bg-cyan-50 p-3 rounded-2xl shadow-2xl border border-cyan-200">
              <img src="/logo.png" alt="Diamond Accounting" className="h-8 w-8 object-contain" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Diamond Accounting</h1>
          <p className="text-cyan-200 mt-1">Crear nueva cuenta</p>
        </div>

        {/* Register Card */}
        <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-white/20">
          <div className="text-center mb-5">
            <h2 className="text-xl font-semibold text-gray-900">Regístrate</h2>
            <p className="text-gray-500 text-sm mt-1">Completa tus datos para comenzar</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  name="firstName"
                  type="text"
                  placeholder="Juan"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  disabled={loading}
                  className={`w-full px-3 py-2 border rounded-lg text-sm ${
                    validationErrors.firstName && touched.firstName
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-300'
                  } ${loading ? 'opacity-50' : ''}`}
                />
                {validationErrors.firstName && touched.firstName && (
                  <p className="text-xs text-red-600 mt-1">{validationErrors.firstName}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
                <input
                  name="lastName"
                  type="text"
                  placeholder="Pérez"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  disabled={loading}
                  className={`w-full px-3 py-2 border rounded-lg text-sm ${
                    validationErrors.lastName && touched.lastName
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-300'
                  } ${loading ? 'opacity-50' : ''}`}
                />
                {validationErrors.lastName && touched.lastName && (
                  <p className="text-xs text-red-600 mt-1">{validationErrors.lastName}</p>
                )}
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
              <input
                name="email"
                type="email"
                placeholder="tu@empresa.com"
                value={formData.email}
                onChange={handleInputChange}
                onBlur={handleBlur}
                disabled={loading}
                className={`w-full px-3 py-2 border rounded-lg text-sm ${
                  validationErrors.email && touched.email
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-300'
                } ${loading ? 'opacity-50' : ''}`}
              />
              {validationErrors.email && touched.email && (
                <p className="text-xs text-red-600 mt-1">{validationErrors.email}</p>
              )}
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de cuenta</label>
              <select
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              >
                <option value="business_owner">Dueño de empresa</option>
                <option value="accountant">Contador</option>
              </select>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  disabled={loading}
                  className={`w-full px-3 py-2 border rounded-lg text-sm pr-10 ${
                    validationErrors.password && touched.password
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-300'
                  } ${loading ? 'opacity-50' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              
              {/* Password Strength */}
              {formData.password && (
                <div className="mt-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${getPasswordStrength(formData.password).color} transition-all`}
                        style={{ width: `${(getPasswordStrength(formData.password).strength / 5) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">{getPasswordStrength(formData.password).label}</span>
                  </div>
                  <ul className="text-xs text-gray-500 mt-1 space-y-0.5">
                    <li className={formData.password.length >= 8 ? 'text-green-600' : ''}>• Mínimo 8 caracteres</li>
                    <li className={/[A-Z]/.test(formData.password) ? 'text-green-600' : ''}>• Una mayúscula</li>
                    <li className={/[0-9]/.test(formData.password) ? 'text-green-600' : ''}>• Un número</li>
                    <li className={/[^a-zA-Z0-9]/.test(formData.password) ? 'text-green-600' : ''}>• Un símbolo especial</li>
                  </ul>
                </div>
              )}
              
              {validationErrors.password && touched.password && (
                <p className="text-xs text-red-600 mt-1">{validationErrors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Contraseña</label>
              <div className="relative">
                <input
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  disabled={loading}
                  className={`w-full px-3 py-2 border rounded-lg text-sm pr-10 ${
                    validationErrors.confirmPassword && touched.confirmPassword
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-300'
                  } ${loading ? 'opacity-50' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={loading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {validationErrors.confirmPassword && touched.confirmPassword && (
                <p className="text-xs text-red-600 mt-1">{validationErrors.confirmPassword}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 border border-transparent rounded-lg shadow-lg text-sm font-semibold text-white bg-gradient-to-r from-cyan-600 to-cyan-600 hover:from-cyan-700 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 mr-2 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12c0 4.42 3.582 8 8 8V6z"></path>
                  </svg>
                  Creando cuenta...
                </>
              ) : (
                'Crear Cuenta'
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-5 pt-4 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-600">
              ¿Ya tienes una cuenta?{' '}
              <Link href="/auth/login" className="font-semibold text-cyan-600 hover:text-cyan-800">
                Inicia sesión
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-cyan-200">
          <p>© 2024 Contab - Sistema Contable Profesional</p>
        </div>
      </div>
    </div>
  );
}
