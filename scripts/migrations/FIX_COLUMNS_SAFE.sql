-- =====================================================
-- AGREGAR COLUMNAS FALTANTES (MANEJO CORRECTO DE MAYÚSCULAS/MINÚSCULAS)
-- =====================================================

-- Primero verificar qué columnas ya existen (sin importar mayúsculas/minúsculas)
DO $$
DECLARE
    col_exists BOOLEAN;
BEGIN
    RAISE NOTICE 'Iniciando verificación de columnas...';
    
    -- Verificar contactCode (considerando variaciones de mayúsculas/minúsculas)
    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Customer' 
        AND table_schema = 'public'
        AND column_name ILIKE 'contactcode'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        EXECUTE 'ALTER TABLE "Customer" ADD COLUMN "contactCode" VARCHAR(20) UNIQUE';
        RAISE NOTICE 'Columna contactCode agregada';
    ELSE
        RAISE NOTICE 'Columna contactCode ya existe (con alguna variación de mayúsculas/minúsculas)';
    END IF;
    
    -- Verificar contactType
    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Customer' 
        AND table_schema = 'public'
        AND column_name ILIKE 'contacttype'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        EXECUTE 'ALTER TABLE "Customer" ADD COLUMN "contactType" VARCHAR(50)';
        RAISE NOTICE 'Columna contactType agregada';
    ELSE
        RAISE NOTICE 'Columna contactType ya existe';
    END IF;
    
    -- Verificar otherTypeDescription
    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Customer' 
        AND table_schema = 'public'
        AND column_name ILIKE 'othertypedescription'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        EXECUTE 'ALTER TABLE "Customer" ADD COLUMN "otherTypeDescription" VARCHAR(200)';
        RAISE NOTICE 'Columna otherTypeDescription agregada';
    ELSE
        RAISE NOTICE 'Columna otherTypeDescription ya existe';
    END IF;
    
    -- Verificar phone2
    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Customer' 
        AND table_schema = 'public'
        AND column_name ILIKE 'phone2'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        EXECUTE 'ALTER TABLE "Customer" ADD COLUMN "phone2" VARCHAR(20)';
        RAISE NOTICE 'Columna phone2 agregada';
    ELSE
        RAISE NOTICE 'Columna phone2 ya existe';
    END IF;
    
    -- Verificar observations
    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Customer' 
        AND table_schema = 'public'
        AND column_name ILIKE 'observations'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        EXECUTE 'ALTER TABLE "Customer" ADD COLUMN "observations" TEXT';
        RAISE NOTICE 'Columna observations agregada';
    ELSE
        RAISE NOTICE 'Columna observations ya existe';
    END IF;
    
    -- Verificar accounting
    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Customer' 
        AND table_schema = 'public'
        AND column_name ILIKE 'accounting'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        EXECUTE 'ALTER TABLE "Customer" ADD COLUMN "accounting" VARCHAR(50)';
        RAISE NOTICE 'Columna accounting agregada';
    ELSE
        RAISE NOTICE 'Columna accounting ya existe';
    END IF;
    
    -- Verificar retentions
    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Customer' 
        AND table_schema = 'public'
        AND column_name ILIKE 'retentions'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        EXECUTE 'ALTER TABLE "Customer" ADD COLUMN "retentions" VARCHAR(50)';
        RAISE NOTICE 'Columna retentions agregada';
    ELSE
        RAISE NOTICE 'Columna retentions ya existe';
    END IF;
    
    -- Verificar taxpayerType
    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Customer' 
        AND table_schema = 'public'
        AND column_name ILIKE 'taxpayertype'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        EXECUTE 'ALTER TABLE "Customer" ADD COLUMN "taxpayerType" VARCHAR(50)';
        RAISE NOTICE 'Columna taxpayerType agregada';
    ELSE
        RAISE NOTICE 'Columna taxpayerType ya existe';
    END IF;
    
    -- Verificar createdat
    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Customer' 
        AND table_schema = 'public'
        AND column_name ILIKE 'createdat'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        EXECUTE 'ALTER TABLE "Customer" ADD COLUMN "createdat" TIMESTAMP DEFAULT NOW()';
        RAISE NOTICE 'Columna createdat agregada';
    ELSE
        RAISE NOTICE 'Columna createdat ya existe';
    END IF;
    
    -- Verificar updatedat
    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Customer' 
        AND table_schema = 'public'
        AND column_name ILIKE 'updatedat'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        EXECUTE 'ALTER TABLE "Customer" ADD COLUMN "updatedat" TIMESTAMP DEFAULT NOW()';
        RAISE NOTICE 'Columna updatedat agregada';
    ELSE
        RAISE NOTICE 'Columna updatedat ya existe';
    END IF;
    
    RAISE NOTICE 'Verificación de columnas completada exitosamente';
END $$;

-- =====================================================
-- VERIFICAR ESTRUCTURA FINAL
-- =====================================================

SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default 
FROM information_schema.columns 
WHERE table_name = 'Customer' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- =====================================================
-- CREAR TABLAS RELACIONADAS SI NO EXISTEN
-- =====================================================

-- Tabla de CustomerRetentions para múltiples retenciones
CREATE TABLE IF NOT EXISTS "CustomerRetentions" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customerId TEXT NOT NULL REFERENCES "Customer"(id) ON DELETE CASCADE,
    tenantId TEXT NOT NULL,
    account VARCHAR(50) NOT NULL,
    percentage DECIMAL(5,2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
    description TEXT,
    isActive BOOLEAN DEFAULT true,
    createdat TIMESTAMP DEFAULT NOW(),
    updatedat TIMESTAMP DEFAULT NOW()
);

-- Tabla de CustomerFiles para archivos adjuntos
CREATE TABLE IF NOT EXISTS "CustomerFiles" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customerId TEXT NOT NULL REFERENCES "Customer"(id) ON DELETE CASCADE,
    tenantId TEXT NOT NULL,
    fileName VARCHAR(255) NOT NULL,
    originalName VARCHAR(255) NOT NULL,
    fileSize BIGINT NOT NULL,
    mimeType VARCHAR(100) NOT NULL,
    filePath VARCHAR(500) NOT NULL,
    fileUrl VARCHAR(500),
    description TEXT,
    isActive BOOLEAN DEFAULT true,
    createdat TIMESTAMP DEFAULT NOW(),
    updatedat TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- CONFIGURAR ROW LEVEL SECURITY
-- =====================================================

-- RLS para CustomerRetentions
ALTER TABLE "CustomerRetentions" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant isolation customer retentions" ON "CustomerRetentions";
CREATE POLICY "Tenant isolation customer retentions" ON "CustomerRetentions"
    FOR ALL
    USING (tenantId = current_setting('app.current_tenant_id', true));

-- RLS para CustomerFiles
ALTER TABLE "CustomerFiles" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant isolation customer files" ON "CustomerFiles";
CREATE POLICY "Tenant isolation customer files" ON "CustomerFiles"
    FOR ALL
    USING (tenantId = current_setting('app.current_tenant_id', true));

-- =====================================================
-- ÍNDICES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_customer_contactCode ON "Customer"(contactCode);
CREATE INDEX IF NOT EXISTS idx_customer_contactType ON "Customer"(contactType);
CREATE INDEX IF NOT EXISTS idx_customerretentions_customerid ON "CustomerRetentions"(customerId);
CREATE INDEX IF NOT EXISTS idx_customerretentions_tenantid ON "CustomerRetentions"(tenantId);
CREATE INDEX IF NOT EXISTS idx_customerfiles_customerid ON "CustomerFiles"(customerId);
CREATE INDEX IF NOT EXISTS idx_customerfiles_tenantid ON "CustomerFiles"(tenantId);

-- =====================================================
-- TRIGGER PARA ACTUALIZACIÓN AUTOMÁTICA (si no existe)
-- =====================================================

CREATE OR REPLACE FUNCTION update_customer_updatedat()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updatedat = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_customer_updatedat ON "Customer";
CREATE TRIGGER trigger_update_customer_updatedat
    BEFORE UPDATE ON "Customer"
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_updatedat();

-- =====================================================
-- RESULTADO FINAL
-- =====================================================

SELECT 'Customer table structure updated successfully - Script completed' as status;
