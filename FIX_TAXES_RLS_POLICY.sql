-- =====================================================
-- VERIFICAR Y CORREGIR POLÍTICAS RLS PARA TAXES
-- =====================================================

-- Paso 1: Verificar si RLS está habilitado en Taxes
SELECT 
    '=== RLS STATUS Taxes ===' as info,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'Taxes' 
AND schemaname = 'public';

-- Paso 2: Verificar políticas existentes en Taxes
SELECT 
    '=== POLÍTICAS ACTUALES Taxes ===' as info,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'Taxes';

-- Paso 3: Verificar políticas existentes en Retentions
SELECT 
    '=== POLÍTICAS ACTUALES Retentions ===' as info,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'Retentions';

-- Paso 4: Habilitar RLS si está deshabilitado
ALTER TABLE "Taxes" ENABLE ROW LEVEL SECURITY;

-- Paso 5: Eliminar políticas existentes si las hay
DROP POLICY IF EXISTS "Tenant isolation taxes" ON "Taxes";
DROP POLICY IF EXISTS "Allow operations with tenant taxes" ON "Taxes";

-- Paso 6: Crear nueva política para Taxes
CREATE POLICY "Allow operations with tenant taxes" ON "Taxes"
    FOR ALL
    USING (tenantid IS NOT NULL AND tenantid != '')
    WITH CHECK (tenantid IS NOT NULL AND tenantid != '');

-- Paso 7: Hacer lo mismo para Retentions
ALTER TABLE "Retentions" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation retentions" ON "Retentions";
DROP POLICY IF EXISTS "Allow operations with tenant retentions" ON "Retentions";

CREATE POLICY "Allow operations with tenant retentions" ON "Retentions"
    FOR ALL
    USING (tenantid IS NOT NULL AND tenantid != '')
    WITH CHECK (tenantid IS NOT NULL AND tenantid != '');

-- Paso 8: Verificación final
SELECT 
    '=== POLÍTICAS FINALES Taxes ===' as info,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'Taxes'
ORDER BY policyname;

SELECT 
    '=== POLÍTICAS FINALES Retentions ===' as info,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'Retentions'
ORDER BY policyname;
