-- =====================================================
-- FIX CRÍTICO: Agregar campo authId a tabla User
-- Versión: Limpia y verificada
-- =====================================================

-- PASO 1: Agregar campo authId a la tabla User
-- Si ya existe, este comando será ignorado (IF NOT EXISTS)
ALTER TABLE "User" 
ADD COLUMN IF NOT EXISTS authId TEXT;

-- PASO 2: Crear índice para optimizar búsquedas por authId
CREATE INDEX IF NOT EXISTS idx_user_authId ON "User"(authId);

-- PASO 3: Actualizar usuarios existentes con authId temporal
-- (Esto es solo para testing - en producción los usuarios se crearán con authId real)
UPDATE "User" 
SET authId = 'temp-clerk-id-' || id 
WHERE authId IS NULL;

-- PASO 4: Verificar que todo fue aplicado correctamente
-- Verificamos la estructura de la tabla User
SELECT 
    '=== ESTRUCTURA DE TABLA USER ===' AS info;

-- Obtener todos los campos de la tabla User
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'User' 
ORDER BY ordinal_position;

-- Verificar que authId fue agregado
SELECT 
    '=== VERIFICACIÓN DE authId ===' AS info;
    
SELECT 
    count(*) as total_usuarios,
    count(authId) as usuarios_con_authId,
    count(*) - count(authId) as usuarios_sin_authId
FROM "User";

-- Verificar algunos registros
SELECT id, email, authId FROM "User" LIMIT 5;

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================