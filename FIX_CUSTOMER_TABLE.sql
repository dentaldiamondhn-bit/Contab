-- =====================================================
-- VERIFICAR Y ACTUALIZAR TABLA Customer
-- =====================================================

-- Primero, verificar la estructura actual de la tabla Customer
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'Customer' 
AND table_schema = current_schema()
ORDER BY ordinal_position;

-- =====================================================
-- SI LA TABLA NO EXISTE, CREARLA CON LA ESTRUCTURA CORRECTA
-- =====================================================

-- Crear tabla Customer si no existe
CREATE TABLE IF NOT EXISTS "Customer" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    tenantId TEXT NOT NULL,
    rtn TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    creditLimit BIGINT DEFAULT 0,
    currentBalance BIGINT DEFAULT 0,
    isActive BOOLEAN DEFAULT true,
    createdat TIMESTAMP DEFAULT NOW(),
    updatedat TIMESTAMP DEFAULT NOW(),
    UNIQUE(rtn, tenantId)
);

-- =====================================================
-- SI LA TABLA EXISTE PERO CON NOMBRES INCORRECTOS, ACTUALIZAR COLUMNAS
-- =====================================================

-- Verificar y actualizar nombres de columnas si es necesario
DO $$
BEGIN
    -- Verificar si existe la columna tenantId
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Customer' 
        AND table_schema = current_schema()
        AND column_name = 'tenantid'
    ) THEN
        -- Renombrar tenantid a tenantId
        ALTER TABLE "Customer" RENAME COLUMN tenantid TO tenantId;
        RAISE NOTICE 'Columna tenantid renombrada a tenantId';
    END IF;

    -- Verificar si existe createdAt y renombrar a createdat
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Customer' 
        AND table_schema = current_schema()
        AND column_name = 'createdAt'
    ) THEN
        -- Renombrar createdAt a createdat
        ALTER TABLE "Customer" RENAME COLUMN createdAt TO createdat;
        RAISE NOTICE 'Columna createdAt renombrada a createdat';
    END IF;

    -- Verificar si existe updatedAt y renombrar a updatedat
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Customer' 
        AND table_schema = current_schema()
        AND column_name = 'updatedAt'
    ) THEN
        -- Renombrar updatedAt a updatedat
        ALTER TABLE "Customer" RENAME COLUMN updatedAt TO updatedat;
        RAISE NOTICE 'Columna updatedAt renombrada a updatedat';
    END IF;

    -- Agregar columnas faltantes si no existen
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Customer' 
        AND table_schema = current_schema()
        AND column_name = 'tenantId'
    ) THEN
        ALTER TABLE "Customer" ADD COLUMN tenantId TEXT NOT NULL DEFAULT 'default';
        RAISE NOTICE 'Columna tenantId agregada';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Customer' 
        AND table_schema = current_schema()
        AND column_name = 'createdat'
    ) THEN
        ALTER TABLE "Customer" ADD COLUMN createdat TIMESTAMP DEFAULT NOW();
        RAISE NOTICE 'Columna createdat agregada';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Customer' 
        AND table_schema = current_schema()
        AND column_name = 'updatedat'
    ) THEN
        ALTER TABLE "Customer" ADD COLUMN updatedat TIMESTAMP DEFAULT NOW();
        RAISE NOTICE 'Columna updatedat agregada';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Customer' 
        AND table_schema = current_schema()
        AND column_name = 'creditLimit'
    ) THEN
        ALTER TABLE "Customer" ADD COLUMN creditLimit BIGINT DEFAULT 0;
        RAISE NOTICE 'Columna creditLimit agregada';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Customer' 
        AND table_schema = current_schema()
        AND column_name = 'currentBalance'
    ) THEN
        ALTER TABLE "Customer" ADD COLUMN currentBalance BIGINT DEFAULT 0;
        RAISE NOTICE 'Columna currentBalance agregada';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Customer' 
        AND table_schema = current_schema()
        AND column_name = 'isActive'
    ) THEN
        ALTER TABLE "Customer" ADD COLUMN isActive BOOLEAN DEFAULT true;
        RAISE NOTICE 'Columna isActive agregada';
    END IF;
END $$;

-- =====================================================
-- CREAR ÍNDICES SI NO EXISTEN
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_customer_tenant ON "Customer"(tenantId);
CREATE INDEX IF NOT EXISTS idx_customer_rtn ON "Customer"(rtn);
CREATE INDEX IF NOT EXISTS idx_customer_active ON "Customer"(isActive);
CREATE INDEX IF NOT EXISTS idx_customer_created_at ON "Customer"(createdat);

-- =====================================================
-- CONFIGURAR ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation" ON "Customer";

CREATE POLICY "Tenant isolation" ON "Customer"
    FOR ALL
    USING (tenantId = current_setting('app.current_tenant_id', true));

-- =====================================================
-- INSERTAR DATOS DE EJEMPLO SI LA TABLA ESTÁ VACÍA
-- =====================================================

INSERT INTO "Customer" (
    tenantId,
    rtn,
    name,
    email,
    phone,
    address,
    creditLimit,
    currentBalance,
    isActive,
    createdat,
    updatedat
) 
SELECT 
    'default' as tenantId,
    '0801-1999-00001' as rtn,
    'Constructora Hondureña S.A.' as name,
    'info@constructorahn.hn' as email,
    '+504 2234-5678' as phone,
    'Boulevard Suyapa, Tegucigalpa, Honduras' as address,
    5000000 as creditLimit,
    1250000 as currentBalance,
    true as isActive,
    NOW() as createdat,
    NOW() as updatedat
WHERE NOT EXISTS (SELECT 1 FROM "Customer" LIMIT 1);

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
AND table_schema = current_schema()
ORDER BY ordinal_position;

-- =====================================================
-- MOSTRAR DATOS DE EJEMPLO
-- =====================================================

SELECT * FROM "Customer" LIMIT 5;
