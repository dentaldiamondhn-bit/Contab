-- =====================================================
-- FIX CRÍTICO: Agregar campo authId a tabla User
-- =====================================================
-- EJECUTAR EN SUPABASE DASHBOARD > SQL EDITOR
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
-- VERIFICACIÓN FINAL
-- =====================================================

-- Verificar que el campo authId existe
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'User' AND column_name = 'authId';

-- Contar usuarios con authId
SELECT COUNT(*) as users_with_authid 
FROM "User" 
WHERE authId IS NOT NULL;
