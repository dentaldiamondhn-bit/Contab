-- =====================================================
-- TABLA Customer - VERSIÓN COMPATIBLE CON ESTRUCTURA EXISTENTE
-- =====================================================

-- Verificar estructura actual
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'Customer' 
AND table_schema = current_schema()
ORDER BY ordinal_position;

-- =====================================================
-- ACTUALIZAR COLUMNAS A NOMBRES CORRECTOS (si es necesario)
-- =====================================================

-- Verificar estructura actual y mostrar columnas existentes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'Customer' 
AND table_schema = current_schema()
ORDER BY ordinal_position;

-- =====================================================
-- SOLO AGREGAR COLUMNAS QUE REALMENTE NO EXISTEN
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'Verificando columnas existentes...';
    
    -- Solo agregar columnas que realmente no existen
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Customer' 
        AND table_schema = current_schema()
        AND column_name = 'contactCode'
    ) THEN
        ALTER TABLE "Customer" ADD COLUMN contactCode VARCHAR(20) UNIQUE;
        RAISE NOTICE 'Columna contactCode agregada';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Customer' 
        AND table_schema = current_schema()
        AND column_name = 'contactType'
    ) THEN
        ALTER TABLE "Customer" ADD COLUMN contactType VARCHAR(50);
        RAISE NOTICE 'Columna contactType agregada';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Customer' 
        AND table_schema = current_schema()
        AND column_name = 'otherTypeDescription'
    ) THEN
        ALTER TABLE "Customer" ADD COLUMN otherTypeDescription VARCHAR(200);
        RAISE NOTICE 'Columna otherTypeDescription agregada';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Customer' 
        AND table_schema = current_schema()
        AND column_name = 'phone2'
    ) THEN
        ALTER TABLE "Customer" ADD COLUMN phone2 VARCHAR(20);
        RAISE NOTICE 'Columna phone2 agregada';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Customer' 
        AND table_schema = current_schema()
        AND column_name = 'observations'
    ) THEN
        ALTER TABLE "Customer" ADD COLUMN observations TEXT;
        RAISE NOTICE 'Columna observations agregada';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Customer' 
        AND table_schema = current_schema()
        AND column_name = 'accounting'
    ) THEN
        ALTER TABLE "Customer" ADD COLUMN accounting VARCHAR(50);
        RAISE NOTICE 'Columna accounting agregada';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Customer' 
        AND table_schema = current_schema()
        AND column_name = 'retentions'
    ) THEN
        ALTER TABLE "Customer" ADD COLUMN retentions VARCHAR(50);
        RAISE NOTICE 'Columna retentions agregada';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Customer' 
        AND table_schema = current_schema()
        AND column_name = 'retentionAccount'
    ) THEN
        ALTER TABLE "Customer" ADD COLUMN retentionAccount VARCHAR(50);
        RAISE NOTICE 'Columna retentionAccount agregada';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Customer' 
        AND table_schema = current_schema()
        AND column_name = 'retentionPercentage'
    ) THEN
        ALTER TABLE "Customer" ADD COLUMN retentionPercentage DECIMAL(5,2);
        RAISE NOTICE 'Columna retentionPercentage agregada';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Customer' 
        AND table_schema = current_schema()
        AND column_name = 'taxpayerType'
    ) THEN
        ALTER TABLE "Customer" ADD COLUMN taxpayerType VARCHAR(50);
        RAISE NOTICE 'Columna taxpayerType agregada';
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
END $$;

-- =====================================================
-- CREAR TABLAS DE IMPUESTOS Y RETENCIONES
-- =====================================================

-- Tabla de Impuestos
CREATE TABLE IF NOT EXISTS "Taxes" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenantId VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('IVA', 'ISR', 'ISV', 'OTRO')),
    rate DECIMAL(5,2) NOT NULL CHECK (rate >= 0 AND rate <= 100),
    description TEXT,
    isActive BOOLEAN DEFAULT true,
    createdat TIMESTAMP DEFAULT NOW(),
    updatedat TIMESTAMP DEFAULT NOW()
);

-- Tabla de Retenciones
CREATE TABLE IF NOT EXISTS "Retentions" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenantId VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('IVA', 'ISR', 'ISV', 'OTRO')),
    rate DECIMAL(5,2) NOT NULL CHECK (rate >= 0 AND rate <= 100),
    description TEXT,
    isActive BOOLEAN DEFAULT true,
    createdat TIMESTAMP DEFAULT NOW(),
    updatedat TIMESTAMP DEFAULT NOW()
);

-- Tabla de Impuestos por Cliente
CREATE TABLE IF NOT EXISTS "CustomerTaxes" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customerId TEXT NOT NULL REFERENCES "Customer"(id) ON DELETE CASCADE,
    tenantId VARCHAR(255) NOT NULL,
    taxId UUID REFERENCES "Taxes"(id) ON DELETE CASCADE,
    retentionId UUID REFERENCES "Retentions"(id) ON DELETE CASCADE,
    customRate DECIMAL(5,2),
    customDescription TEXT,
    isActive BOOLEAN DEFAULT true,
    createdat TIMESTAMP DEFAULT NOW(),
    updatedat TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- CREAR ÍNDICES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_customer_tenantid ON "Customer"(tenantid);
CREATE INDEX IF NOT EXISTS idx_customer_rtn ON "Customer"(rtn);
CREATE INDEX IF NOT EXISTS idx_customer_isActive ON "Customer"(isActive);
CREATE INDEX IF NOT EXISTS idx_customer_createdat ON "Customer"(createdat);
CREATE INDEX IF NOT EXISTS idx_customer_contactCode ON "Customer"(contactCode);

-- Índices para Taxes
CREATE INDEX IF NOT EXISTS idx_taxes_tenantid ON "Taxes"(tenantId);
CREATE INDEX IF NOT EXISTS idx_taxes_type ON "Taxes"(type);
CREATE INDEX IF NOT EXISTS idx_taxes_isActive ON "Taxes"(isActive);

-- Índices para Retentions
CREATE INDEX IF NOT EXISTS idx_retentions_tenantid ON "Retentions"(tenantId);
CREATE INDEX IF NOT EXISTS idx_retentions_type ON "Retentions"(type);
CREATE INDEX IF NOT EXISTS idx_retentions_isActive ON "Retentions"(isActive);

-- Índices para CustomerTaxes
CREATE INDEX IF NOT EXISTS idx_customertaxes_customerid ON "CustomerTaxes"(customerId);
CREATE INDEX IF NOT EXISTS idx_customertaxes_tenantid ON "CustomerTaxes"(tenantId);
CREATE INDEX IF NOT EXISTS idx_customertaxes_taxid ON "CustomerTaxes"(taxId);
CREATE INDEX IF NOT EXISTS idx_customertaxes_retentionid ON "CustomerTaxes"(retentionId);

-- =====================================================
-- CONFIGURAR ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation" ON "Customer";

-- Crear política que funcione con tenantid en minúsculas
CREATE POLICY "Tenant isolation" ON "Customer"
    FOR ALL
    USING (tenantid = current_setting('app.current_tenant_id', true));

-- Configurar RLS para Taxes
ALTER TABLE "Taxes" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant isolation taxes" ON "Taxes";
CREATE POLICY "Tenant isolation taxes" ON "Taxes"
    FOR ALL
    USING (tenantId = current_setting('app.current_tenant_id', true));

-- Configurar RLS para Retentions
ALTER TABLE "Retentions" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant isolation retentions" ON "Retentions";
CREATE POLICY "Tenant isolation retentions" ON "Retentions"
    FOR ALL
    USING (tenantId = current_setting('app.current_tenant_id', true));

-- Configurar RLS para CustomerTaxes
ALTER TABLE "CustomerTaxes" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant isolation customer taxes" ON "CustomerTaxes";
CREATE POLICY "Tenant isolation customer taxes" ON "CustomerTaxes"
    FOR ALL
    USING (tenantId = current_setting('app.current_tenant_id', true));

-- =====================================================
-- INSERTAR DATOS DE EJEMPLO
-- =====================================================

-- Datos de ejemplo para Customer
INSERT INTO "Customer" (
    tenantid,
    rtn,
    name,
    email,
    phone,
    phone2,
    address,
    contactType,
    otherTypeDescription,
    observations,
    contactCode,
    accounting,
    retentions,
    retentionAccount,
    retentionPercentage,
    taxpayerType,
    isActive,
    createdat,
    updatedat
) VALUES
    ('default', '0801-1999-00001', 'Constructora Hondureña S.A.', 'info@constructorahn.hn', '+504 2234-5678', '+504 2234-5679', 'Boulevard Suyapa, Tegucigalpa, Honduras', 'empresa', '', 'Cliente corporativo con grandes proyectos', 'CT001ABC123XYZ', 'accrual', 'isr', '2102-02', 12.50, 'grande', true, NOW(), NOW()),
    ('default', '0801-1999-00002', 'Distribuidora Médica Central', 'contacto@distribuidoramedica.hn', '+504 2555-8901', '', 'Colonia Miraflores, Tegucigalpa', 'empresa', '', 'Proveedor principal de equipos médicos', 'CT002DEF456ABC', 'cash', 'iva', '2102-01', 15.00, 'mediano', true, NOW(), NOW()),
    ('default', '0801-1999-00003', 'Tech Solutions Honduras', 'ventas@techsolutions.hn', '+504 2666-1234', '+504 2666-1235', 'Avenida Morazán, San Pedro Sula', 'persona', '', 'Servicios de consultoría IT', 'CT003GHI789DEF', 'cash_basis', 'isr', '2102-02', 10.00, 'pequeno', true, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Datos de ejemplo para Taxes
INSERT INTO "Taxes" (tenantId, name, type, rate, description) VALUES
    ('default', 'Impuesto sobre Ventas', 'ISV', 15.00, 'ISV estándar para ventas de bienes y servicios'),
    ('default', 'Impuesto sobre la Renta', 'ISR', 12.50, 'ISR para servicios profesionales'),
    ('default', 'Impuesto al Valor Agregado', 'IVA', 15.00, 'IVA general para bienes y servicios'),
    ('default', 'Impuesto Municipal', 'OTRO', 1.00, 'Impuesto municipal específico')
ON CONFLICT DO NOTHING;

-- Datos de ejemplo para Retentions
INSERT INTO "Retentions" (tenantId, name, type, rate, description) VALUES
    ('default', 'Retención ISR Servicios Profesionales', 'ISR', 10.00, 'Retención del 10% para servicios profesionales'),
    ('default', 'Retención ISR Alquileres', 'ISR', 12.50, 'Retención del 12.5% para ingresos por arrendamiento'),
    ('default', 'Retención IVA', 'IVA', 15.00, 'Retención del 15% de IVA'),
    ('default', 'Retención ISV', 'ISV', 1.00, 'Retención del 1% de ISV')
ON CONFLICT DO NOTHING;

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
-- MOSTRAR DATOS
-- =====================================================

SELECT * FROM "Customer" LIMIT 5;
