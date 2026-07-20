-- Script para verificar la tabla tenant y los nombres correctos
-- Esto resolverá el problema de foreign key constraint

-- 1. Verificar todas las tablas que contienen "tenant"
SELECT 
    'Tablas con tenant:' as info,
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name ILIKE '%tenant%' 
   OR table_name ILIKE '%Tenant%'
ORDER BY table_name;

-- 2. Verificar estructura de la tabla Tenant (si existe)
SELECT 
    'Tenant columns:' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'Tenant'
ORDER BY ordinal_position;

-- 3. Verificar estructura de la tabla tenant (si existe)
SELECT 
    'tenant columns:' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'tenant'
ORDER BY ordinal_position;

-- 4. Verificar todos los tenants disponibles en todas las tablas posibles
-- Intentar con la tabla Tenant
SELECT 
    'Tenants en tabla Tenant:' as info,
    *
FROM "Tenant"
LIMIT 5;

-- Intentar con la tabla tenant
SELECT 
    'Tenants en tabla tenant:' as info,
    *
FROM "tenant"
LIMIT 5;

-- 5. Verificar la constraint de foreign key
SELECT 
    'Foreign key constraints:' as info,
    tc.constraint_name,
    tc.table_name, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'users';
