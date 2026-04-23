-- =====================================================
-- AGREGAR COLUMNAS FALTANTES A LA TABLA Customer
-- =====================================================

-- Verificar y agregar columnas faltantes una por una
DO $$
BEGIN
    RAISE NOTICE 'Verificando y agregando columnas faltantes...';
    
    -- Agregar contactCode si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Customer' 
        AND table_schema = 'public'
        AND column_name = 'contactCode'
    ) THEN
        ALTER TABLE "Customer" ADD COLUMN contactCode VARCHAR(20) UNIQUE;
        RAISE NOTICE 'Columna contactCode agregada';
    ELSE
        RAISE NOTICE 'Columna contactCode ya existe';
    END IF;

    -- Agregar contactType si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Customer' 
        AND table_schema = 'public'
        AND column_name = 'contactType'
    ) THEN
        ALTER TABLE "Customer" ADD COLUMN contactType VARCHAR(50);
        RAISE NOTICE 'Columna contactType agregada';
    ELSE
        RAISE NOTICE 'Columna contactType ya existe';
    END IF;

    -- Agregar otherTypeDescription si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Customer' 
        AND table_schema = 'public'
        AND column_name = 'otherTypeDescription'
    ) THEN
        ALTER TABLE "Customer" ADD COLUMN otherTypeDescription VARCHAR(200);
        RAISE NOTICE 'Columna otherTypeDescription agregada';
    ELSE
        RAISE NOTICE 'Columna otherTypeDescription ya existe';
    END IF;

    -- Agregar phone2 si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Customer' 
        AND table_schema = 'public'
        AND column_name = 'phone2'
    ) THEN
        ALTER TABLE "Customer" ADD COLUMN phone2 VARCHAR(20);
        RAISE NOTICE 'Columna phone2 agregada';
    ELSE
        RAISE NOTICE 'Columna phone2 ya existe';
    END IF;

    -- Agregar observations si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Customer' 
        AND table_schema = 'public'
        AND column_name = 'observations'
    ) THEN
        ALTER TABLE "Customer" ADD COLUMN observations TEXT;
        RAISE NOTICE 'Columna observations agregada';
    ELSE
        RAISE NOTICE 'Columna observations ya existe';
    END IF;

    -- Agregar accounting si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Customer' 
        AND table_schema = 'public'
        AND column_name = 'accounting'
    ) THEN
        ALTER TABLE "Customer" ADD COLUMN accounting VARCHAR(50);
        RAISE NOTICE 'Columna accounting agregada';
    ELSE
        RAISE NOTICE 'Columna accounting ya existe';
    END IF;

    -- Agregar retentions si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Customer' 
        AND table_schema = 'public'
        AND column_name = 'retentions'
    ) THEN
        ALTER TABLE "Customer" ADD COLUMN retentions VARCHAR(50);
        RAISE NOTICE 'Columna retentions agregada';
    ELSE
        RAISE NOTICE 'Columna retentions ya existe';
    END IF;

    -- Agregar taxpayerType si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Customer' 
        AND table_schema = 'public'
        AND column_name = 'taxpayerType'
    ) THEN
        ALTER TABLE "Customer" ADD COLUMN taxpayerType VARCHAR(50);
        RAISE NOTICE 'Columna taxpayerType agregada';
    ELSE
        RAISE NOTICE 'Columna taxpayerType ya existe';
    END IF;

    -- Agregar createdat si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Customer' 
        AND table_schema = 'public'
        AND column_name = 'createdat'
    ) THEN
        ALTER TABLE "Customer" ADD COLUMN createdat TIMESTAMP DEFAULT NOW();
        RAISE NOTICE 'Columna createdat agregada';
    ELSE
        RAISE NOTICE 'Columna createdat ya existe';
    END IF;

    -- Agregar updatedat si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Customer' 
        AND table_schema = 'public'
        AND column_name = 'updatedat'
    ) THEN
        ALTER TABLE "Customer" ADD COLUMN updatedat TIMESTAMP DEFAULT NOW();
        RAISE NOTICE 'Columna updatedat agregada';
    ELSE
        RAISE NOTICE 'Columna updatedat ya existe';
    END IF;

    RAISE NOTICE 'Verificación de columnas completada';
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
-- TRIGGERS PARA ACTUALIZACIÓN AUTOMÁTICA
-- =====================================================

-- Trigger para Customer (si no existe)
DROP FUNCTION IF EXISTS update_customer_updatedat() CASCADE;
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
-- COMPLETADO
-- =====================================================

SELECT 'Customer table structure updated successfully' as status;
