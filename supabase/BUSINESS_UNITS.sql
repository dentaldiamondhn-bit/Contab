-- Unidades de rendimiento por tenant
-- Ejecutar en Supabase SQL Editor

-- Crear tabla de unidades
CREATE TABLE IF NOT EXISTS business_units (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  unit_id TEXT NOT NULL,
  name TEXT NOT NULL,
  revenue DECIMAL(10,2) DEFAULT 0,
  costs DECIMAL(10,2) DEFAULT 0,
  utilization DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, unit_id)
);

-- Crear índice para búsquedas por tenant
CREATE INDEX IF NOT EXISTS idx_business_units_tenant ON business_units(tenant_id);

-- Habilitar RLS
ALTER TABLE business_units ENABLE ROW LEVEL SECURITY;

-- Política para que cada tenant solo vea sus unidades
CREATE POLICY "Users can view own tenant units" ON business_units
  FOR ALL USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id'));

-- Función para obtener unidades de un tenant
CREATE OR REPLACE FUNCTION get_business_units(p_tenant_id TEXT)
RETURNS TABLE (
  unit_id TEXT,
  name TEXT,
  revenue DECIMAL(10,2),
  costs DECIMAL(10,2),
  utilization DECIMAL(5,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bu.unit_id,
    bu.name,
    bu.revenue,
    bu.costs,
    bu.utilization
  FROM business_units bu
  WHERE bu.tenant_id = p_tenant_id
  ORDER BY bu.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para guardar o actualizar una unidad
CREATE OR REPLACE FUNCTION upsert_business_unit(
  p_tenant_id TEXT,
  p_unit_id TEXT,
  p_name TEXT,
  p_revenue DECIMAL(10,2) DEFAULT 0,
  p_costs DECIMAL(10,2) DEFAULT 0,
  p_utilization DECIMAL(5,2) DEFAULT 0
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO business_units (tenant_id, unit_id, name, revenue, costs, utilization)
  VALUES (p_tenant_id, p_unit_id, p_name, p_revenue, p_costs, p_utilization)
  ON CONFLICT (tenant_id, unit_id)
  DO UPDATE SET
    name = EXCLUDED.name,
    revenue = EXCLUDED.revenue,
    costs = EXCLUDED.costs,
    utilization = EXCLUDED.utilization,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para eliminar una unidad
CREATE OR REPLACE FUNCTION delete_business_unit(
  p_tenant_id TEXT,
  p_unit_id TEXT
)
RETURNS VOID AS $$
BEGIN
  DELETE FROM business_units 
  WHERE tenant_id = p_tenant_id AND unit_id = p_unit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentario
COMMENT ON TABLE business_units IS 'Unidades de negocio por tenant para tracking de rendimiento';
