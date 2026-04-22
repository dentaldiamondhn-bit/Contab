-- =====================================================
-- TABLA Customer - VERSIÓN ACTUALIZADA CON MÚLTIPLES RETENCIONES Y ARCHIVOS
-- =====================================================

-- =====================================================
-- ESTRUCTURA PRINCIPAL DE CLIENTES
-- =====================================================

CREATE TABLE IF NOT EXISTS "Customer" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    tenantId TEXT NOT NULL,
    rtn TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    phone2 TEXT,
    address TEXT,
    contactType VARCHAR(50),
    otherTypeDescription VARCHAR(200),
    observations TEXT,
    contactCode VARCHAR(20) UNIQUE,
    accounting VARCHAR(50),
    retentions VARCHAR(50),
    taxpayerType VARCHAR(50),
    creditLimit BIGINT DEFAULT 0,
    currentBalance BIGINT DEFAULT 0,
    isActive BOOLEAN DEFAULT true,
    createdat TIMESTAMP DEFAULT NOW(),
    updatedat TIMESTAMP DEFAULT NOW(),
    UNIQUE(rtn, tenantId)
);

-- =====================================================
-- TABLA DE RETENCIONES POR CLIENTE (MÚLTIPLES)
-- =====================================================

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

-- =====================================================
-- TABLA DE ARCHIVOS POR CLIENTE
-- =====================================================

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
-- TABLAS DE IMPUESTOS Y RETENCIONES (CONFIGURACIÓN)
-- =====================================================

-- Tabla de Impuestos
CREATE TABLE IF NOT EXISTS "Taxes" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenantId TEXT NOT NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('IVA', 'ISR', 'ISV', 'OTRO')),
    rate DECIMAL(5,2) NOT NULL CHECK (rate >= 0 AND rate <= 100),
    description TEXT,
    isActive BOOLEAN DEFAULT true,
    createdat TIMESTAMP DEFAULT NOW(),
    updatedat TIMESTAMP DEFAULT NOW()
);

-- Tabla de Retenciones (Configuración global)
CREATE TABLE IF NOT EXISTS "Retentions" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenantId TEXT NOT NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('IVA', 'ISR', 'ISV', 'OTRO')),
    rate DECIMAL(5,2) NOT NULL CHECK (rate >= 0 AND rate <= 100),
    description TEXT,
    isActive BOOLEAN DEFAULT true,
    createdat TIMESTAMP DEFAULT NOW(),
    updatedat TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================

-- Índices para Customer
CREATE INDEX IF NOT EXISTS idx_customer_tenantid ON "Customer"(tenantId);
CREATE INDEX IF NOT EXISTS idx_customer_rtn ON "Customer"(rtn);
CREATE INDEX IF NOT EXISTS idx_customer_isActive ON "Customer"(isActive);
CREATE INDEX IF NOT EXISTS idx_customer_createdat ON "Customer"(createdat);
CREATE INDEX IF NOT EXISTS idx_customer_contactCode ON "Customer"(contactCode);
CREATE INDEX IF NOT EXISTS idx_customer_contactType ON "Customer"(contactType);

-- Índices para CustomerRetentions
CREATE INDEX IF NOT EXISTS idx_customerretentions_customerid ON "CustomerRetentions"(customerId);
CREATE INDEX IF NOT EXISTS idx_customerretentions_tenantid ON "CustomerRetentions"(tenantId);
CREATE INDEX IF NOT EXISTS idx_customerretentions_account ON "CustomerRetentions"(account);
CREATE INDEX IF NOT EXISTS idx_customerretentions_isActive ON "CustomerRetentions"(isActive);

-- Índices para CustomerFiles
CREATE INDEX IF NOT EXISTS idx_customerfiles_customerid ON "CustomerFiles"(customerId);
CREATE INDEX IF NOT EXISTS idx_customerfiles_tenantid ON "CustomerFiles"(tenantId);
CREATE INDEX IF NOT EXISTS idx_customerfiles_mimeType ON "CustomerFiles"(mimeType);
CREATE INDEX IF NOT EXISTS idx_customerfiles_isActive ON "CustomerFiles"(isActive);

-- Índices para Taxes
CREATE INDEX IF NOT EXISTS idx_taxes_tenantid ON "Taxes"(tenantId);
CREATE INDEX IF NOT EXISTS idx_taxes_type ON "Taxes"(type);
CREATE INDEX IF NOT EXISTS idx_taxes_isActive ON "Taxes"(isActive);

-- Índices para Retentions
CREATE INDEX IF NOT EXISTS idx_retentions_tenantid ON "Retentions"(tenantId);
CREATE INDEX IF NOT EXISTS idx_retentions_type ON "Retentions"(type);
CREATE INDEX IF NOT EXISTS idx_retentions_isActive ON "Retentions"(isActive);

-- =====================================================
-- CONFIGURAR ROW LEVEL SECURITY
-- =====================================================

-- RLS para Customer
ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant isolation" ON "Customer";
CREATE POLICY "Tenant isolation" ON "Customer"
    FOR ALL
    USING (tenantId = current_setting('app.current_tenant_id', true));

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

-- RLS para Taxes
ALTER TABLE "Taxes" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant isolation taxes" ON "Taxes";
CREATE POLICY "Tenant isolation taxes" ON "Taxes"
    FOR ALL
    USING (tenantId = current_setting('app.current_tenant_id', true));

-- RLS para Retentions
ALTER TABLE "Retentions" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant isolation retentions" ON "Retentions";
CREATE POLICY "Tenant isolation retentions" ON "Retentions"
    FOR ALL
    USING (tenantId = current_setting('app.current_tenant_id', true));

-- =====================================================
-- TRIGGERS PARA ACTUALIZACIÓN AUTOMÁTICA
-- =====================================================

-- Trigger para Customer
CREATE OR REPLACE FUNCTION update_customer_updatedat()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updatedat = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_customer_updatedat
    BEFORE UPDATE ON "Customer"
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_updatedat();

-- Trigger para CustomerRetentions
CREATE OR REPLACE FUNCTION update_customerretentions_updatedat()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updatedat = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_customerretentions_updatedat
    BEFORE UPDATE ON "CustomerRetentions"
    FOR EACH ROW
    EXECUTE FUNCTION update_customerretentions_updatedat();

-- Trigger para CustomerFiles
CREATE OR REPLACE FUNCTION update_customerfiles_updatedat()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updatedat = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_customerfiles_updatedat
    BEFORE UPDATE ON "CustomerFiles"
    FOR EACH ROW
    EXECUTE FUNCTION update_customerfiles_updatedat();

-- =====================================================
-- VISTAS ÚTILES
-- =====================================================

-- Vista de clientes con sus retenciones
CREATE OR REPLACE VIEW "CustomersWithRetentions" AS
SELECT 
    c.id,
    c.tenantId,
    c.rtn,
    c.name,
    c.email,
    c.phone,
    c.phone2,
    c.address,
    c.contactType,
    c.otherTypeDescription,
    c.observations,
    c.contactCode,
    c.accounting,
    c.retentions,
    c.taxpayerType,
    c.creditLimit,
    c.currentBalance,
    c.isActive,
    c.createdat,
    c.updatedat,
    COALESCE(
        json_agg(
            json_build_object(
                'id', cr.id,
                'account', cr.account,
                'percentage', cr.percentage,
                'description', cr.description,
                'isActive', cr.isActive
            ) ORDER BY cr.createdat
        ) FILTER (WHERE cr.id IS NOT NULL), 
        '[]'::json
    ) as retentions_detail
FROM "Customer" c
LEFT JOIN "CustomerRetentions" cr ON c.id = cr.customerId AND cr.isActive = true
GROUP BY c.id, c.tenantId, c.rtn, c.name, c.email, c.phone, c.phone2, c.address, c.contactType, c.otherTypeDescription, c.observations, c.contactCode, c.accounting, c.retentions, c.taxpayerType, c.creditLimit, c.currentBalance, c.isActive, c.createdat, c.updatedat;

-- Vista de clientes con sus archivos
CREATE OR REPLACE VIEW "CustomersWithFiles" AS
SELECT 
    c.id,
    c.tenantId,
    c.rtn,
    c.name,
    c.email,
    c.phone,
    c.phone2,
    c.address,
    c.contactType,
    c.otherTypeDescription,
    c.observations,
    c.contactCode,
    c.accounting,
    c.retentions,
    c.taxpayerType,
    c.creditLimit,
    c.currentBalance,
    c.isActive,
    c.createdat,
    c.updatedat,
    COALESCE(
        json_agg(
            json_build_object(
                'id', cf.id,
                'fileName', cf.fileName,
                'originalName', cf.originalName,
                'fileSize', cf.fileSize,
                'mimeType', cf.mimeType,
                'filePath', cf.filePath,
                'fileUrl', cf.fileUrl,
                'description', cf.description,
                'isActive', cf.isActive,
                'createdat', cf.createdat
            ) ORDER BY cf.createdat
        ) FILTER (WHERE cf.id IS NOT NULL), 
        '[]'::json
    ) as files_detail
FROM "Customer" c
LEFT JOIN "CustomerFiles" cf ON c.id = cf.customerId AND cf.isActive = true
GROUP BY c.id, c.tenantId, c.rtn, c.name, c.email, c.phone, c.phone2, c.address, c.contactType, c.otherTypeDescription, c.observations, c.contactCode, c.accounting, c.retentions, c.taxpayerType, c.creditLimit, c.currentBalance, c.isActive, c.createdat, c.updatedat;

-- Vista completa de clientes con retenciones y archivos
CREATE OR REPLACE VIEW "CustomersComplete" AS
SELECT 
    c.id,
    c.tenantId,
    c.rtn,
    c.name,
    c.email,
    c.phone,
    c.phone2,
    c.address,
    c.contactType,
    c.otherTypeDescription,
    c.observations,
    c.contactCode,
    c.accounting,
    c.retentions,
    c.taxpayerType,
    c.creditLimit,
    c.currentBalance,
    c.isActive,
    c.createdat,
    c.updatedat,
    COALESCE(retentions_data.retentions_detail, '[]'::json) as retentions_detail,
    COALESCE(files_data.files_detail, '[]'::json) as files_detail
FROM "Customer" c
LEFT JOIN (
    SELECT 
        customerId,
        json_agg(
            json_build_object(
                'id', cr.id,
                'account', cr.account,
                'percentage', cr.percentage,
                'description', cr.description,
                'isActive', cr.isActive
            ) ORDER BY cr.createdat
        ) FILTER (WHERE cr.id IS NOT NULL) as retentions_detail
    FROM "CustomerRetentions" cr
    WHERE cr.isActive = true
    GROUP BY customerId
) retentions_data ON c.id = retentions_data.customerId
LEFT JOIN (
    SELECT 
        customerId,
        json_agg(
            json_build_object(
                'id', cf.id,
                'fileName', cf.fileName,
                'originalName', cf.originalName,
                'fileSize', cf.fileSize,
                'mimeType', cf.mimeType,
                'filePath', cf.filePath,
                'fileUrl', cf.fileUrl,
                'description', cf.description,
                'isActive', cf.isActive,
                'createdat', cf.createdat
            ) ORDER BY cf.createdat
        ) FILTER (WHERE cf.id IS NOT NULL) as files_detail
    FROM "CustomerFiles" cf
    WHERE cf.isActive = true
    GROUP BY customerId
) files_data ON c.id = files_data.customerId;

-- =====================================================
-- DATOS DE EJEMPLO
-- =====================================================

-- Datos de ejemplo para Customer
INSERT INTO "Customer" (
    tenantId, rtn, name, email, phone, phone2, address, contactType, 
    otherTypeDescription, observations, contactCode, accounting, 
    retentions, taxpayerType, creditLimit, currentBalance, isActive, createdat, updatedat
) VALUES
    ('default', '0801-1999-00001', 'Constructora Hondureña S.A.', 'info@constructorahn.hn', '+504 2234-5678', '+504 2234-5679', 'Boulevard Suyapa, Tegucigalpa, Honduras', 'empresa', '', 'Cliente corporativo con grandes proyectos', 'CT001ABC123XYZ', 'accrual', 'isr', 'grande', 5000000, 1250000, true, NOW(), NOW()),
    ('default', '0801-1999-00002', 'Distribuidora Médica Central', 'contacto@distribuidoramedica.hn', '+504 2555-8901', '', 'Colonia Miraflores, Tegucigalpa', 'empresa', '', 'Proveedor principal de equipos médicos', 'CT002DEF456ABC', 'cash', 'iva', 'mediano', 3000000, 750000, true, NOW(), NOW()),
    ('default', '0801-1999-00003', 'Tech Solutions Honduras', 'ventas@techsolutions.hn', '+504 2666-1234', '+504 2666-1235', 'Avenida Morazán, San Pedro Sula', 'persona', '', 'Servicios de consultoría IT', 'CT003GHI789DEF', 'cash_basis', 'isr', 'pequeno', 10000000, 2500000, true, NOW(), NOW())
ON CONFLICT (rtn, tenantId) DO NOTHING;

-- Retenciones de ejemplo para los clientes
INSERT INTO "CustomerRetentions" (customerId, tenantId, account, percentage, description, isActive, createdat, updatedat)
VALUES
    ((SELECT id FROM "Customer" WHERE rtn = '0801-1999-00001' AND tenantId = 'default'), 'default', '2102-02', 12.50, 'Retención ISR para servicios profesionales', true, NOW(), NOW()),
    ((SELECT id FROM "Customer" WHERE rtn = '0801-1999-00001' AND tenantId = 'default'), 'default', '2102-01', 15.00, 'Retención IVA', true, NOW(), NOW()),
    ((SELECT id FROM "Customer" WHERE rtn = '0801-1999-00002' AND tenantId = 'default'), 'default', '2102-01', 15.00, 'Retención IVA', true, NOW(), NOW()),
    ((SELECT id FROM "Customer" WHERE rtn = '0801-1999-00003' AND tenantId = 'default'), 'default', '2102-02', 10.00, 'Retención ISR para servicios IT', true, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Archivos de ejemplo para los clientes
INSERT INTO "CustomerFiles" (customerId, tenantId, fileName, originalName, fileSize, mimeType, filePath, fileUrl, description, isActive, createdat, updatedat)
VALUES
    ((SELECT id FROM "Customer" WHERE rtn = '0801-1999-00001' AND tenantId = 'default'), 'default', 'constancia_rtn_001.pdf', 'Constancia RTN Constructora.pdf', 245760, 'application/pdf', '/uploads/customers/constancia_rtn_001.pdf', 'https://storage.example.com/constancia_rtn_001.pdf', 'Constancia de RTN actualizada', true, NOW(), NOW()),
    ((SELECT id FROM "Customer" WHERE rtn = '0801-1999-00002' AND tenantId = 'default'), 'default', 'licencia_comercial_002.pdf', 'Licencia Comercial Distribuidora.pdf', 384512, 'application/pdf', '/uploads/customers/licencia_comercial_002.pdf', 'https://storage.example.com/licencia_comercial_002.pdf', 'Licencia comercial vigente', true, NOW(), NOW()),
    ((SELECT id FROM "Customer" WHERE rtn = '0801-1999-00003' AND tenantId = 'default'), 'default', 'contrato_servicios_003.pdf', 'Contrato Servicios Tech Solutions.pdf', 524288, 'application/pdf', '/uploads/customers/contrato_servicios_003.pdf', 'https://storage.example.com/contrato_servicios_003.pdf', 'Contrato de servicios IT', true, NOW(), NOW())
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
-- CONSULTAS DE EJEMPLO
-- =====================================================

-- Obtener todos los clientes con sus retenciones y archivos
SELECT * FROM "CustomersComplete" WHERE tenantId = 'default' ORDER BY createdat DESC;

-- Obtener un cliente específico con todas sus retenciones
SELECT c.*, 
       json_agg(
           json_build_object(
               'account', cr.account,
               'percentage', cr.percentage,
               'description', cr.description
           )
       ) as retentions
FROM "Customer" c
LEFT JOIN "CustomerRetentions" cr ON c.id = cr.customerId AND cr.isActive = true
WHERE c.id = 'customer-id-here' AND c.tenantId = 'default'
GROUP BY c.id;

-- Obtener todos los archivos de un cliente
SELECT * FROM "CustomerFiles" 
WHERE customerId = 'customer-id-here' AND tenantId = 'default' AND isActive = true
ORDER BY createdat DESC;

-- Estadísticas de archivos por tenant
SELECT 
    tenantId,
    COUNT(*) as total_files,
    SUM(fileSize) as total_size,
    COUNT(CASE WHEN mimeType LIKE 'application/pdf%' THEN 1 END) as pdf_files,
    COUNT(CASE WHEN mimeType LIKE 'image/%' THEN 1 END) as image_files
FROM "CustomerFiles" 
WHERE isActive = true
GROUP BY tenantId;

-- =====================================================
-- COMENTARIOS ADICIONALES
-- =====================================================

/*
NOTAS SOBRE LA ESTRUCTURA ACTUALIZADA:

1. MÚLTIPLES RETENCIONES:
   - CustomerRetentions: Tabla separada para manejar múltiples retenciones por cliente
   - Cada cliente puede tener N retenciones con diferentes cuentas y porcentajes
   - Relación uno-a-muchos con Customer

2. GESTIÓN DE ARCHIVOS:
   - CustomerFiles: Tabla para almacenar información de archivos adjuntos
   - Soporta múltiples archivos por cliente
   - Almacena metadatos: nombre, tamaño, tipo, ruta, URL, etc.
   - Relación uno-a-muchos con Customer

3. VISTAS OPTIMIZADAS:
   - CustomersWithRetentions: Clientes con sus retenciones en JSON
   - CustomersWithFiles: Clientes con sus archivos en JSON
   - CustomersComplete: Vista completa con todo en formato JSON

4. SEGURIDAD:
   - Row Level Security en todas las tablas
   - Aislamiento por tenantId
   - Políticas de acceso consistentes

5. ÍNDICES:
   - Índices optimizados para consultas frecuentes
   - Índices compuestos para rendimiento

6. TRIGGERS:
   - Actualización automática de timestamps
   - Mantenimiento de datos de auditoría

USO RECOMENDADO:
- Usar las vistas para obtener datos completos
- Mantener isActive = true para registros activos
- Las retenciones y archivos se manejan en tablas separadas
- El frontend puede trabajar con JSON desde las vistas
- Implementar lógica de subida de archivos en el backend
*/
