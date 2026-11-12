'use client';

import { useSignUp, useUser } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { Shield, Eye, EyeOff, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useEffect, useState, Suspense, FormEvent } from 'react';

const inputClass = "w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500";
const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";
const buttonClass = "w-full py-3.5 px-4 border border-transparent rounded-lg shadow-lg text-sm font-semibold text-white bg-gradient-to-r from-cyan-600 to-cyan-600 hover:from-cyan-700 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-all transform hover:scale-[1.02] active:scale-[0.98]";

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoaded } = useUser();
  const { signUp } = useSignUp();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [emailExists, setEmailExists] = useState<boolean | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);

  const redirectUrl = searchParams.get('redirect_url') || '/onboarding';

  useEffect(() => {
    if (isLoaded && user) {
      router.push(redirectUrl);
    }
  }, [isLoaded, user, router, redirectUrl]);

  const getPasswordStrength = (input: string): { strength: number; label: string; color: string } => {
    let strength = 0;
    if (input.length >= 8) strength++;
    if (/[a-z]/.test(input)) strength++;
    if (/[A-Z]/.test(input)) strength++;
    if (/[0-9]/.test(input)) strength++;
    if (/[^a-zA-Z0-9]/.test(input)) strength++;
    const labels = ['Muy débil', 'Débil', 'Regular', 'Buena', 'Fuerte'];
    const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-cyan-500', 'bg-green-500'];
    return {
      strength,
      label: labels[strength - 1] || 'Muy débil',
      color: colors[strength - 1] || 'bg-red-500',
    };
  };

  const extractError = (err: any): string => {
    const message = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || err?.message;
    return message || 'Ocurrió un error al registrarse. Inténtalo de nuevo.';
  };

  const checkEmail = async (email: string) => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailExists(null);
      return;
    }
    setCheckingEmail(true);
    try {
      const res = await fetch(`/api/auth/check-email?email=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      setEmailExists(!!data.exists);
    } catch {
      setEmailExists(null);
    } finally {
      setCheckingEmail(false);
    }
  };

  const checkUsername = async (uname: string) => {
    const trimmed = uname.trim();
    if (trimmed.length < 3 || !/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      setUsernameAvailable(null);
      setUsernameSuggestions([]);
      return;
    }
    setCheckingUsername(true);
    try {
      const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      if (data.available) {
        setUsernameAvailable(true);
        setUsernameSuggestions([]);
      } else if (data.exists) {
        setUsernameAvailable(false);
        setUsernameSuggestions(data.suggestions || []);
      } else {
        setUsernameAvailable(null);
        setUsernameSuggestions([]);
      }
    } catch {
      setUsernameAvailable(null);
    } finally {
      setCheckingUsername(false);
    }
  };

  const completeAndRedirect = async () => {
    if (signUp) {
      const finalizeRes = await signUp.finalize();
      if (finalizeRes.error) {
        setError(extractError(finalizeRes.error));
        return;
      }
    }
    setSuccess(true);
    setTimeout(() => router.push(redirectUrl), 2000);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!firstName.trim()) {
      setError('El nombre es requerido.');
      return;
    }
    if (!lastName.trim()) {
      setError('El apellido es requerido.');
      return;
    }
    if (!username.trim() || username.trim().length < 3) {
      setError('El usuario debe tener al menos 3 caracteres.');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
      setError('El usuario solo puede contener letras, números y guión bajo.');
      return;
    }
    if (usernameAvailable === false) {
      setError('Usuario no disponible. Elige una de las sugerencias.');
      return;
    }
    if (!emailAddress.trim()) {
      setError('El correo es requerido.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress.trim())) {
      setError('Ingresa un correo válido.');
      return;
    }
    if (emailExists === true) {
      setError('Este correo ya está registrado. Usa otro correo o inicia sesión.');
      return;
    }
    if (!password) {
      setError('La contraseña es requerida.');
      return;
    }
    if (!confirmPassword) {
      setError('Confirma tu contraseña.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener mínimo 8 caracteres.');
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setError('La contraseña debe tener al menos 1 mayúscula.');
      return;
    }
    if (!/[^a-zA-Z0-9]/.test(password)) {
      setError('La contraseña debe tener al menos 1 símbolo (ej: !@#$%).');
      return;
    }
    if (!signUp) {
      setError('El sistema de autenticación aún se está cargando. Inténtalo de nuevo.');
      return;
    }

    setIsSubmitting(true);
    try {
      let { error: createError } = await signUp.create({
        firstName,
        lastName,
        emailAddress,
        username: username.trim(),
        unsafeMetadata: { username: username.trim() },
      });
      if (createError) {
        const msg = extractError(createError).toLowerCase();
        // Si username no está habilitado en Clerk Dashboard, reintentar sin username
        if (msg.includes('username')) {
          const retry = await signUp.create({
            firstName,
            lastName,
            emailAddress,
            unsafeMetadata: { username: username.trim() },
          });
          createError = retry.error;
          if (createError) {
            setError(extractError(createError));
            return;
          }
        } else {
          setError(extractError(createError));
          return;
        }
      }

      const { error: passwordError } = await signUp.password({ password });
      if (passwordError) {
        setError(extractError(passwordError));
        return;
      }

      // Verificación obligatoria por correo para confirmar que la dirección está en uso y es correcta
      const { error: sendError } = await signUp.verifications.sendEmailCode();
      if (!sendError) {
        setPendingVerification(true);
        return;
      }
      // Fallback: si el envío falla porque Clerk no lo requiere pero el registro ya está completo
      if (signUp.status === 'complete') {
        await completeAndRedirect();
      } else if (signUp.unverifiedFields?.includes('email_address')) {
        setError(extractError(sendError));
        return;
      } else {
        // Si no requiere verificación pero tampoco está completo, mostrar error
        setError(extractError(sendError));
        return;
      }
    } catch (err: any) {
      setError(extractError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      if (!signUp) {
        setError('El sistema de autenticación aún se está cargando.');
        return;
      }
      const { error: verifyError } = await signUp.verifications.verifyEmailCode({ code: verificationCode });
      if (verifyError) {
        setError(extractError(verifyError));
        return;
      }
      if (signUp.status === 'complete') {
        await completeAndRedirect();
      } else {
        setError('No se pudo completar la verificación.');
      }
    } catch (err: any) {
      setError(extractError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

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

        <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 overflow-hidden p-8">
          {success ? (
            <div className="text-center py-6">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">¡Cuenta creada!</h2>
              <p className="text-gray-600 mt-2">Serás redirigido en unos segundos...</p>
            </div>
          ) : !pendingVerification ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Crear cuenta</h2>
                <p className="text-gray-600 mt-1">Completa tus datos para comenzar</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Nombre</label>
                  <input type="text" className={inputClass} value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Juan" autoComplete="given-name" required disabled={isSubmitting} />
                </div>
                <div>
                  <label className={labelClass}>Apellido</label>
                  <input type="text" className={inputClass} value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Pérez" autoComplete="family-name" required disabled={isSubmitting} />
                </div>
              </div>

              {/* Apartado Usuario */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <label className={labelClass}>Usuario</label>
                <input
                  type="text"
                  className={`${inputClass} ${usernameAvailable === false ? 'border-red-400 focus:ring-red-500 focus:border-red-500' : usernameAvailable === true ? 'border-green-400 focus:ring-green-500 focus:border-green-500' : ''}`}
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setUsernameAvailable(null); setUsernameSuggestions([]); }}
                  onBlur={() => checkUsername(username)}
                  placeholder="ej: juanperez123"
                  autoComplete="username"
                  required
                  disabled={isSubmitting}
                  minLength={3}
                />
                {checkingUsername && <p className="text-xs text-gray-500 mt-1">Verificando usuario...</p>}
                {!checkingUsername && usernameAvailable === true && <p className="text-xs text-green-600 mt-1">Usuario disponible</p>}
                {!checkingUsername && usernameAvailable === false && (
                  <div className="mt-2">
                    <p className="text-xs text-red-600">Usuario no disponible</p>
                    {usernameSuggestions.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-600 mb-1">Sugerencias:</p>
                        <div className="flex flex-wrap gap-2">
                          {usernameSuggestions.map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => { setUsername(s); setUsernameAvailable(true); setUsernameSuggestions([]); }}
                              className="px-2.5 py-1 text-xs font-medium bg-white border border-cyan-300 text-cyan-700 rounded-full hover:bg-cyan-50 transition-colors"
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {usernameAvailable === null && !checkingUsername && <p className="text-xs text-gray-500 mt-1">Elige tu nombre de usuario único</p>}
              </div>

              <div>
                <label className={labelClass}>Correo electrónico</label>
                <input
                  type="email"
                  className={`${inputClass} ${emailExists === true ? 'border-red-400 focus:ring-red-500 focus:border-red-500' : emailExists === false ? 'border-green-400 focus:ring-green-500 focus:border-green-500' : ''}`}
                  value={emailAddress}
                  onChange={(e) => { setEmailAddress(e.target.value); setEmailExists(null); }}
                  onBlur={() => checkEmail(emailAddress)}
                  placeholder="tu@empresa.com"
                  autoComplete="email"
                  required
                  disabled={isSubmitting}
                />
                {checkingEmail && <p className="text-xs text-gray-500 mt-1">Verificando correo...</p>}
                {!checkingEmail && emailExists === true && <p className="text-xs text-red-600 mt-1">Este correo ya está registrado</p>}
                {!checkingEmail && emailExists === false && emailAddress && <p className="text-xs text-green-600 mt-1">Correo disponible</p>}
              </div>

              <div>
                <label className={labelClass}>Contraseña</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} className={`${inputClass} pr-12`} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="new-password" minLength={8} required disabled={isSubmitting} />
                  <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700" aria-label={showPassword ? 'Ocultar' : 'Mostrar'}>
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {password && (
                  <div className="mt-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className={`h-full ${getPasswordStrength(password).color} transition-all`} style={{ width: `${(getPasswordStrength(password).strength / 5) * 100}%` }} />
                      </div>
                      <span className="text-xs text-gray-500">{getPasswordStrength(password).label}</span>
                    </div>
                  </div>
                )}
                {/* Indicaciones de contraseña */}
                <ul className="mt-2 space-y-1 text-xs">
                  <li className={`flex items-center gap-1.5 ${password.length >= 8 ? 'text-green-600' : 'text-gray-500'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${password.length >= 8 ? 'bg-green-600' : 'bg-gray-400'}`} /> Minimo 8 caracteres
                  </li>
                  <li className={`flex items-center gap-1.5 ${/[A-Z]/.test(password) ? 'text-green-600' : 'text-gray-500'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${/[A-Z]/.test(password) ? 'bg-green-600' : 'bg-gray-400'}`} /> 1 mayúscula (A-Z)
                  </li>
                  <li className={`flex items-center gap-1.5 ${/[^a-zA-Z0-9]/.test(password) ? 'text-green-600' : 'text-gray-500'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${/[^a-zA-Z0-9]/.test(password) ? 'bg-green-600' : 'bg-gray-400'}`} /> 1 símbolo (ej: !@#$%)
                  </li>
                </ul>
              </div>

              <div>
                <label className={labelClass}>Verificar contraseña</label>
                <div className="relative">
                  <input type={showConfirmPassword ? 'text' : 'password'} className={`${inputClass} pr-12 ${confirmPassword && password !== confirmPassword ? 'border-red-400 focus:ring-red-500 focus:border-red-500' : ''}`} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" autoComplete="new-password" minLength={8} required disabled={isSubmitting} />
                  <button type="button" onClick={() => setShowConfirmPassword((v) => !v)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700" aria-label={showConfirmPassword ? 'Ocultar' : 'Mostrar'}>
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && <p className="text-xs text-red-600 mt-1">Las contraseñas no coinciden</p>}
                {confirmPassword && password === confirmPassword && password.length >= 8 && <p className="text-xs text-green-600 mt-1">Las contraseñas coinciden</p>}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button type="submit" className={buttonClass} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : 'Registrarse'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Verifica tu correo</h2>
                <p className="text-gray-600 mt-1">Hemos enviado un código de confirmación a <strong>{emailAddress}</strong>. Revisa tu bandeja de entrada (y spam) e ingresa el código para confirmar que la dirección es correcta y está en uso.</p>
              </div>
              <div>
                <label className={labelClass}>Código de verificación</label>
                <input type="text" className={inputClass} value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} placeholder="6 dígitos" inputMode="numeric" autoComplete="one-time-code" required disabled={isSubmitting} />
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              <button type="submit" className={buttonClass} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : 'Verificar'}
              </button>
            </form>
          )}
        </div>

        <div className="mt-6 text-center">
          <p className="text-cyan-200 text-sm">Al registrarte, podrás acceder a nuestro sistema contable profesional</p>
          <div className="mt-4">
            <p className="text-cyan-300 text-sm">¿Ya tienes una cuenta? <a href={`/auth/login${redirectUrl && redirectUrl !== '/auth/login' ? `?redirect_url=${encodeURIComponent(redirectUrl)}` : ''}`} className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors">Inicia sesión aquí</a></p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div></div>}>
      <RegisterContent />
    </Suspense>
  );
}
