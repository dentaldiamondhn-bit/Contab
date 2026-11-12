-- RLS para la tabla maestra de ubicaciones (product_location)
-- Ejecutar en el SQL Editor de Supabase despues de 017_location_master.sql

ALTER TABLE product_location ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own tenant locations" ON product_location;
CREATE POLICY "Users can view own tenant locations" ON product_location
  FOR ALL USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id'));

DROP POLICY IF EXISTS "Users can insert own tenant locations" ON product_location;
CREATE POLICY "Users can insert own tenant locations" ON product_location
  FOR INSERT WITH CHECK (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id'));

DROP POLICY IF EXISTS "Users can update own tenant locations" ON product_location;
CREATE POLICY "Users can update own tenant locations" ON product_location
  FOR UPDATE USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id'))
  WITH CHECK (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id'));

DROP POLICY IF EXISTS "Users can delete own tenant locations" ON product_location;
CREATE POLICY "Users can delete own tenant locations" ON product_location
  FOR DELETE USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id'));