// Rate limiting para login
interface LoginAttempt {
  count: number;
  firstAttempt: number;
  lastAttempt: number;
  blocked: boolean;
  blockedUntil?: number;
}

const RATE_LIMIT_MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutos
const RATE_LIMIT_BLOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutos

// Almacenamiento en memoria (para producción usar Redis o similar)
const loginAttempts = new Map<string, LoginAttempt>();

export function checkRateLimit(identifier: string): { allowed: boolean; remainingAttempts: number; blockTimeLeft?: number } {
  const now = Date.now();
  const attempt = loginAttempts.get(identifier);
  
  if (!attempt) {
    return { allowed: true, remainingAttempts: RATE_LIMIT_MAX_ATTEMPTS };
  }
  
  // Si está bloqueado, verificar si el bloqueo expiró
  if (attempt.blocked) {
    if (attempt.blockedUntil && now < attempt.blockedUntil) {
      const blockTimeLeft = Math.ceil((attempt.blockedUntil - now) / 1000 / 60);
      return { allowed: false, remainingAttempts: 0, blockTimeLeft };
    }
    // Desbloquear si expiró
    attempt.blocked = false;
    attempt.count = 0;
    attempt.blockedUntil = undefined;
  }
  
  // Verificar si la ventana de tiempo expiró
  if (now - attempt.firstAttempt > RATE_LIMIT_WINDOW_MS) {
    // Resetear contador
    attempt.count = 0;
    attempt.firstAttempt = now;
    return { allowed: true, remainingAttempts: RATE_LIMIT_MAX_ATTEMPTS };
  }
  
  const remainingAttempts = Math.max(0, RATE_LIMIT_MAX_ATTEMPTS - attempt.count);
  return { allowed: remainingAttempts > 0, remainingAttempts };
}

export function recordFailedAttempt(identifier: string): void {
  const now = Date.now();
  const attempt = loginAttempts.get(identifier);
  
  if (!attempt) {
    loginAttempts.set(identifier, {
      count: 1,
      firstAttempt: now,
      lastAttempt: now,
      blocked: false
    });
    return;
  }
  
  // Verificar si la ventana expiró
  if (now - attempt.firstAttempt > RATE_LIMIT_WINDOW_MS) {
    attempt.count = 1;
    attempt.firstAttempt = now;
    attempt.lastAttempt = now;
    attempt.blocked = false;
    attempt.blockedUntil = undefined;
  } else {
    attempt.count++;
    attempt.lastAttempt = now;
    
    // Bloquear si excede el límite
    if (attempt.count >= RATE_LIMIT_MAX_ATTEMPTS) {
      attempt.blocked = true;
      attempt.blockedUntil = now + RATE_LIMIT_BLOCK_DURATION_MS;
    }
  }
}

export function recordSuccessfulAttempt(identifier: string): void {
  // Limpiar intentos fallidos después de login exitoso
  loginAttempts.delete(identifier);
}

// Validación de email
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validación de contraseña
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Mínimo 8 caracteres');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Al menos una mayúscula');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Al menos una minúscula');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Al menos un número');
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Al menos un símbolo especial');
  }
  
  return { valid: errors.length === 0, errors };
}

// Sanitización de entrada
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remover < y > para prevenir XSS básico
    .slice(0, 255); // Limitar longitud
}
