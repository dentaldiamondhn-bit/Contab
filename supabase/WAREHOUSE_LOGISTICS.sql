-- Multi-almacén y logística (Etapa 2 — Inventario)
-- Ejecutar en Supabase SQL Editor
-- Referencia: docs/INVENTARIO_REPORT.md §4 Etapa 2 (tareas 2.1-2.3)
--
-- Tablas base ya existentes (no se recrean): warehouse, inventory_transfer,
-- inventory_transfer_item, inventory_movement, product.
-- Este script agrega alcance por empresa, campos logísticos, estados
-- válidos, índices y RLS.

-- Alcance por empresa (nullable para no romper datos existentes)
ALTER TABLE warehouse ADD COLUMN IF NOT EXISTS company_id TEXT;
ALTER TABLE inventory_transfer ADD COLUMN IF NOT EXISTS company_id TEXT;

-- Campos logísticos del traslado (despacho / guía de remisión)
ALTER TABLE inventory_transfer ADD COLUMN IF NOT EXISTS carrier TEXT NOT NULL DEFAULT '';
ALTER TABLE inventory_transfer ADD COLUMN IF NOT EXISTS guide_number TEXT NOT NULL DEFAULT '';
ALTER TABLE inventory_transfer ADD COLUMN IF NOT EXISTS dispatched_by TEXT;
ALTER TABLE inventory_transfer ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMP WITH TIME ZONE;

-- Flujo logístico: pending -> in_transit -> received | cancelled
ALTER TABLE inventory_transfer DROP CONSTRAINT IF EXISTS inventory_transfer_status_check;
ALTER TABLE inventory_transfer ADD CONSTRAINT inventory_transfer_status_check
  CHECK (status IN ('pending', 'in_transit', 'received', 'cancelled'));

-- Índices
CREATE INDEX IF NOT EXISTS idx_warehouse_tenant_active ON warehouse (tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_warehouse_company ON warehouse (company_id);
CREATE INDEX IF NOT EXISTS idx_transfer_tenant_company ON inventory_transfer (tenant_id, company_id);
CREATE INDEX IF NOT EXISTS idx_transfer_status ON inventory_transfer (status);
CREATE INDEX IF NOT EXISTS idx_transfer_warehouses
  ON inventory_transfer (source_warehouse_id, destination_warehouse_id);
CREATE INDEX IF NOT EXISTS idx_transfer_item_transfer ON inventory_transfer_item (transfer_id);
CREATE INDEX IF NOT EXISTS idx_transfer_item_product ON inventory_transfer_item (product_id);
CREATE INDEX IF NOT EXISTS idx_movement_warehouse_product
  ON inventory_movement (warehouse_id, product_id);
CREATE INDEX IF NOT EXISTS idx_movement_reference
  ON inventory_movement (reference_type, reference_id);

-- RLS: cada tenant solo ve sus registros (la API usa service_role y hace bypass)
ALTER TABLE warehouse ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transfer ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transfer_item ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own tenant warehouses" ON warehouse;
CREATE POLICY "Users can view own tenant warehouses" ON warehouse
  FOR ALL USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id'));

DROP POLICY IF EXISTS "Users can view own tenant transfers" ON inventory_transfer;
CREATE POLICY "Users can view own tenant transfers" ON inventory_transfer
  FOR ALL USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id'));

DROP POLICY IF EXISTS "Users can view own tenant transfer items" ON inventory_transfer_item;
CREATE POLICY "Users can view own tenant transfer items" ON inventory_transfer_item
  FOR ALL USING (
    transfer_id IN (
      SELECT id FROM inventory_transfer
      WHERE tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')
    )
  );

COMMENT ON TABLE inventory_transfer IS 'Traslados entre almacenes con flujo logístico pending -> in_transit -> received|cancelled';
