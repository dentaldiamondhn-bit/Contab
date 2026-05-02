-- =====================================================
-- FIX CRÍTICO: Agregar campo authId a tabla User
-- =====================================================

-- Paso 1: Agregar campo authId a la tabla User
ALTER TABLE "User" 
ADD COLUMN IF NOT EXISTS authId TEXT;

-- Paso 2: Crear índice para optimizar búsquedas por authId
CREATE INDEX IF NOT EXISTS idx_user_authId ON "User"(authId);

-- Paso 3: Actualizar usuarios existentes con authId temporal
-- (Esto es solo para testing - en producción los usuarios se crearán con authId real)
UPDATE "User" 
SET authId = 'temp-clerk-id-' || id 
WHERE authId IS NULL;

-- Paso 4: Verificar el campo agregado
SELECT 
    id, 
    email, 
    tenantid, 
    role, 
    authId,
    createdat
FROM "User" 
LIMIT 5;

-- =====================================================
-- COMENTARIOS
-- =====================================================

-- authId es CRÍTICO para:
-- 1. Integración con Clerk Authentication
-- 2. Onboarding saveOnboardingData()
-- 3. Asociación usuario-tenant correcta
-- 4. Row Level Security por usuario

-- Sin authId, el onboarding fallará en:
-- - saveOnboardingData() al buscar usuario por authId
-- - Asociación correcta de usuarios con tenants
-- - Autenticación en el sistema

-- Este fix resuelve el issue crítico #1 del onboarding.
