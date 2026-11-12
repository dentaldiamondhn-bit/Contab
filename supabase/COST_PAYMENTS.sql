-- Control de pagos de costos fijos y variables
-- Ejecutar en Supabase SQL Editor

-- Crear tabla para control de pagos
CREATE TABLE IF NOT EXISTS cost_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  cost_type TEXT NOT NULL CHECK (cost_type IN ('fixed', 'variable')),
  cost_key TEXT NOT NULL,
  due_date DATE,
  paid BOOLEAN DEFAULT FALSE,
  paid_date DATE,
  amount DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, cost_type, cost_key)
);

-- Crear índice para búsquedas por tenant
CREATE INDEX IF NOT EXISTS idx_cost_payments_tenant ON cost_payments(tenant_id);

-- Crear índice para búsquedas por tipo y clave
CREATE INDEX IF NOT EXISTS idx_cost_payments_type_key ON cost_payments(cost_type, cost_key);

-- Habilitar RLS
ALTER TABLE cost_payments ENABLE ROW LEVEL SECURITY;

-- Política para que cada tenant solo vea sus pagos
CREATE POLICY "Users can view own tenant payments" ON cost_payments
  FOR ALL USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id'));

-- Función para obtener pagos de un tenant
CREATE OR REPLACE FUNCTION get_cost_payments(p_tenant_id TEXT)
RETURNS TABLE (
  cost_type TEXT,
  cost_key TEXT,
  due_date DATE,
  paid BOOLEAN,
  paid_date DATE,
  amount DECIMAL(10,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cp.cost_type,
    cp.cost_key,
    cp.due_date,
    cp.paid,
    cp.paid_date,
    cp.amount
  FROM cost_payments cp
  WHERE cp.tenant_id = p_tenant_id
  ORDER BY cp.cost_type, cp.cost_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para guardar o actualizar un pago
CREATE OR REPLACE FUNCTION upsert_cost_payment(
  p_tenant_id TEXT,
  p_cost_type TEXT,
  p_cost_key TEXT,
  p_due_date DATE DEFAULT NULL,
  p_paid BOOLEAN DEFAULT FALSE,
  p_paid_date DATE DEFAULT NULL,
  p_amount DECIMAL(10,2) DEFAULT 0
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO cost_payments (tenant_id, cost_type, cost_key, due_date, paid, paid_date, amount)
  VALUES (p_tenant_id, p_cost_type, p_cost_key, p_due_date, p_paid, p_paid_date, p_amount)
  ON CONFLICT (tenant_id, cost_type, cost_key)
  DO UPDATE SET
    due_date = EXCLUDED.due_date,
    paid = EXCLUDED.paid,
    paid_date = EXCLUDED.paid_date,
    amount = EXCLUDED.amount,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentario
COMMENT ON TABLE cost_payments IS 'Control de pagos de costos fijos y variables por tenant';
