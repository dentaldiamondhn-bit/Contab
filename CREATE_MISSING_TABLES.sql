-- ========================================
-- SCRIPT PARA CREAR TABLAS FALTANTES
-- ========================================
-- Ejecutar este script directamente en Supabase Dashboard
-- SQL Editor -> Database -> New Query

-- 1. Crear tabla tenants
CREATE TABLE IF NOT EXISTS tenants (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Crear tabla invoices
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_rtn VARCHAR(50),
    invoice_number VARCHAR(50) NOT NULL,
    cai_id UUID REFERENCES cai(id),
    issue_date DATE NOT NULL,
    expiration_date DATE,
    subtotal DECIMAL(12,2) DEFAULT 0,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'draft',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Crear tabla invoice_items
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    product_id UUID,
    description TEXT NOT NULL,
    quantity DECIMAL(10,2) DEFAULT 1,
    unit_price DECIMAL(12,2) DEFAULT 0,
    subtotal DECIMAL(12,2) DEFAULT 0,
    tax_rate DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Crear tabla products
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(12,2) DEFAULT 0,
    cost DECIMAL(12,2) DEFAULT 0,
    stock DECIMAL(10,2) DEFAULT 0,
    sku VARCHAR(100),
    category VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Crear tabla accounts
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    account_number VARCHAR(100),
    account_type VARCHAR(50),
    balance DECIMAL(12,2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'HNL',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Crear tabla polizas
CREATE TABLE IF NOT EXISTS polizas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255) NOT NULL,
    number VARCHAR(100) NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    type VARCHAR(50),
    status VARCHAR(50) DEFAULT 'draft',
    total_amount DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Insertar datos de prueba
-- Insertar tenant DENTALWD
INSERT INTO tenants (id, name, created_at, updated_at)
VALUES ('DENTALWD', 'Dental Diamond', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Insertar productos de ejemplo
INSERT INTO products (id, tenant_id, name, description, price, stock, sku, category, created_at, updated_at)
VALUES 
    (gen_random_uuid(), 'DENTALWD', 'Consulta Dental', 'Servicio de consulta general', 500.00, 100, 'CONS-001', 'Servicios', NOW(), NOW()),
    (gen_random_uuid(), 'DENTALWD', 'Limpieza Dental', 'Limpieza profesional completa', 300.00, 50, 'LIMP-001', 'Servicios', NOW(), NOW()),
    (gen_random_uuid(), 'DENTALWD', 'Extracción Dental', 'Extracción simple', 800.00, 25, 'EXTR-001', 'Servicios', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- 8. Deshabilitar RLS para permitir acceso temporal
ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE polizas DISABLE ROW LEVEL SECURITY;

-- 9. Verificación de tablas creadas
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN ('tenants', 'invoices', 'invoice_items', 'products', 'accounts', 'polizas')
ORDER BY tablename;

-- 10. Conteo de registros
SELECT 'tenants' as table_name, COUNT(*) as record_count FROM tenants
UNION ALL
SELECT 'invoices', COUNT(*) FROM invoices
UNION ALL
SELECT 'invoice_items', COUNT(*) FROM invoice_items
UNION ALL
SELECT 'products', COUNT(*) FROM products
UNION ALL
SELECT 'accounts', COUNT(*) FROM accounts
UNION ALL
SELECT 'polizas', COUNT(*) FROM polizas
ORDER BY table_name;
