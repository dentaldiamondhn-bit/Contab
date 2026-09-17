-- =====================================================
-- FIXES CRÍTICOS: Usuarios y Módulo de Retenciones
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

-- =====================================================
-- ACTUALIZACIONES PARA MÓDULO DE RETENCIONES
-- =====================================================

-- Paso 5: Crear la tabla Withholding si no existe
CREATE TABLE IF NOT EXISTS "Withholding" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenantId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "invoiceDate" TIMESTAMP WITH TIME ZONE NOT NULL,
    "providerName" TEXT NOT NULL,
    "providerRTN" TEXT NOT NULL,
    "providerAddress" TEXT,
    "amount" BIGINT NOT NULL, -- Almacenado en centavos
    "withholdingAmount" BIGINT NOT NULL,
    "withholdingRate" DOUBLE PRECISION NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT DEFAULT 'PENDING', -- PENDING, PAID, CANCELLED
    "receiptNumber" TEXT,
    "cancellationReason" TEXT,
    "paymentDate" TIMESTAMP WITH TIME ZONE,
    "period" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Paso 5.1: Asegurar RLS en la tabla
ALTER TABLE "Withholding" ENABLE ROW LEVEL SECURITY;

-- Política para que los usuarios solo vean las retenciones de su empresa
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_policy' AND tablename = 'Withholding') THEN
        CREATE POLICY tenant_isolation_policy ON "Withholding" 
        USING ("tenantId" = current_setting('app.current_tenant_id', true));
    END IF;
END $$;

-- Política para permitir a los administradores insertar nuevas retenciones de su propio tenant
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'admin_insert_withholding_policy' AND tablename = 'Withholding') THEN
        CREATE POLICY admin_insert_withholding_policy ON "Withholding" 
        FOR INSERT 
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM "User" u
                WHERE u.authid = auth.uid()::text 
                AND u.role IN ('ADMIN', 'SUPER_ADMIN', 'MANAGER')
                AND u.tenantid = "Withholding"."tenantId"
            )
        );
    END IF;
END $$;

-- Paso 6: Función RPC para obtener el siguiente número de retención
-- Esta función previene duplicados en un entorno multi-usuario (Atómica)
CREATE OR REPLACE FUNCTION get_next_withholding_number(cai_id_param UUID)
RETURNS TEXT AS $$
DECLARE
    cai_record RECORD;
BEGIN
    -- Actualizar y obtener el registro en un solo paso para bloquear la fila
    UPDATE "CAI"
    SET "currentNumber" = "currentNumber" + 1
    WHERE id = cai_id_param
    RETURNING * INTO cai_record;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'CAI con ID % no encontrado', cai_id_param;
    END IF;

    -- Validación de rango de autorización
    IF cai_record."currentNumber" > cai_record."rangeEnd" THEN
        RAISE EXCEPTION 'Rango de CAI agotado. No se pueden emitir más documentos.';
    END IF;

    -- Formato estándar hondureño: Establecimiento-PuntoEmision-TipoDocumento-Correlativo
    RETURN cai_record."establishmentCode" || '-' || 
           cai_record."pointOfSaleCode" || '-05-' || 
           LPAD(cai_record."currentNumber"::text, 8, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear índice para búsquedas rápidas por número de recibo
CREATE INDEX IF NOT EXISTS idx_withholding_receipt ON "Withholding"("receiptNumber");

-- Paso 4: Verificar el campo agregado
SELECT 
    id, 
    email, 
    tenantid, 
    role, 
    authid,
    createdat
FROM "User" 
LIMIT 5;

-- =====================================================
-- VERIFICACIÓN FINAL
-- =====================================================

-- Verificar que el campo authId existe
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'User' AND column_name = 'authid';

-- Contar usuarios con authId
SELECT COUNT(*) as users_with_authid 
FROM "User" 
WHERE authid IS NOT NULL;
