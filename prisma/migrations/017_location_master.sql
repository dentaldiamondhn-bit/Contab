-- 017_location_master.sql
-- Tabla maestra de ubicaciones físicas del inventario.
-- Idempotente: seguro de re-ejecutar en el SQL Editor de Supabase.

CREATE TABLE IF NOT EXISTS product_location (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  company_id TEXT,
  code TEXT,
  name TEXT NOT NULL,
  aisle TEXT,
  shelf TEXT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Vincular productos a una ubicación maestra (la columna location TEXT se conserva para display/legacy)
ALTER TABLE product ADD COLUMN IF NOT EXISTS location_id TEXT;

CREATE INDEX IF NOT EXISTS idx_product_location_tenant_active ON product_location (tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_product_location_company ON product_location (company_id);
CREATE INDEX IF NOT EXISTS idx_product_location_id_ref ON product (location_id);