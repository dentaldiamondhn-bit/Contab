-- Script para unificar las tablas de tenants
-- Mover datos de 'tenants' a 'Tenant' y eliminar la duplicada

-- 1. Crear tabla 'Tenant' si no existe (con la estructura correcta)
CREATE TABLE IF NOT EXISTS "Tenant" (
    id VARCHAR(255) PRIMARY KEY,
    business_name VARCHAR(255) NOT NULL,
    business_rtn VARCHAR(255) UNIQUE,
    business_email VARCHAR(255) UNIQUE,
    business_address TEXT,
    tenant_code VARCHAR(255) UNIQUE,
    country VARCHAR(2) DEFAULT 'HN',
    phone_number VARCHAR(255),
    logo_url TEXT,
    timezone VARCHAR(255) DEFAULT 'America/Tegucigalpa',
    currency VARCHAR(3) DEFAULT 'HNL',
    subscription_plans VARCHAR(255) DEFAULT 'BASIC',
    max_users INTEGER DEFAULT 5,
    max_storage INTEGER DEFAULT 100,
    max_transactions INTEGER DEFAULT 10000,
    monthly_cost INTEGER DEFAULT 1000,
    modules TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Migrar datos de 'tenants' a 'Tenant'
INSERT INTO "Tenant" (
    id, business_name, business_rtn, business_email, business_address,
    tenant_code, country, phone_number, logo_url, timezone, currency,
    subscription_plans, max_users, max_storage, max_transactions,
    monthly_cost, modules, is_active, created_at, updated_at
)
SELECT 
    id, business_name, business_rtn, business_email, business_address,
    tenant_code, country, phone_number, logo_url, timezone, currency,
    subscription_plans, max_users, max_storage, max_transactions,
    monthly_cost, modules, is_active, created_at, updated_at
FROM tenants
WHERE id NOT IN (SELECT id FROM "Tenant");

-- 3. Actualizar referencias en otras tablas
UPDATE "User" SET tenantid = (SELECT id FROM "Tenant" WHERE id = tenantid) WHERE tenantid IN (SELECT id FROM tenants);
UPDATE companies SET tenant_id = (SELECT id FROM "Tenant" WHERE id = tenant_id) WHERE tenant_id IN (SELECT id FROM tenants);

-- 4. Verificar migración
SELECT 'Tenant' as table_name, COUNT(*) as count FROM "Tenant"
UNION ALL
SELECT 'tenants' as table_name, COUNT(*) as count FROM tenants;

-- 5. Eliminar tabla antigua (descomentar después de verificar)
-- DROP TABLE tenants;
