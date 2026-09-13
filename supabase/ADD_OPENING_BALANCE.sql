-- Migración: Agregar campo opening_balance a chart_of_accounts
-- Permite registrar saldos de apertura para empresas que inician en medio del año

-- 1. Agregar columna opening_balance (BIGINT para consistencia con balance)
ALTER TABLE chart_of_accounts 
ADD COLUMN IF NOT EXISTS opening_balance BIGINT DEFAULT 0;

-- 2. Agregar columna opening_balance_date para rastrear fecha de apertura
ALTER TABLE chart_of_accounts 
ADD COLUMN IF NOT EXISTS opening_balance_date DATE;

-- 3. Agregar comentario a las columnas
COMMENT ON COLUMN chart_of_accounts.opening_balance IS 'Saldo de apertura en centavos. Positivo=Debe, Negativo=Haber';
COMMENT ON COLUMN chart_of_accounts.opening_balance_date IS 'Fecha del balance de apertura';

-- 4. Crear índice para búsquedas por opening_balance
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_opening_balance 
ON chart_of_accounts(opening_balance) 
WHERE opening_balance != 0;

-- 5. Verificar que la columna balance existe (por si acaso)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chart_of_accounts' AND column_name = 'balance'
  ) THEN
    ALTER TABLE chart_of_accounts ADD COLUMN balance BIGINT DEFAULT 0;
  END IF;
END $$;

-- 6. Función RPC para actualizar opening_balance de múltiples cuentas
CREATE OR REPLACE FUNCTION update_opening_balances(
  p_tenant_id TEXT,
  p_balances JSONB
)
RETURNS VOID AS $$
BEGIN
  -- p_balances: [{"account_id": "xxx", "opening_balance": 1234500, "opening_balance_date": "2026-01-01"}, ...]
  UPDATE chart_of_accounts coa
  SET 
    opening_balance = (item->>'opening_balance')::BIGINT,
    opening_balance_date = (item->>'opening_balance_date')::DATE,
    updated_at = NOW()
  FROM jsonb_array_elements(p_balances) AS item
  WHERE coa.id = item->>'account_id'
    AND coa.tenant_id = p_tenant_id;
END;
$$ LANGUAGE plpgsql;

-- 7. Función RPC para obtener cuentas con saldos de apertura
CREATE OR REPLACE FUNCTION get_accounts_with_opening_balances(
  p_tenant_id TEXT
)
RETURNS TABLE (
  id TEXT,
  code TEXT,
  name TEXT,
  type TEXT,
  nature TEXT,
  level INTEGER,
  is_selectable BOOLEAN,
  is_active BOOLEAN,
  opening_balance BIGINT,
  opening_balance_date DATE,
  balance BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    coa.id,
    coa.code,
    coa.name,
    coa.type,
    coa.nature,
    coa.level,
    coa.is_selectable,
    coa.is_active,
    coa.opening_balance,
    coa.opening_balance_date,
    coa.balance
  FROM chart_of_accounts coa
  WHERE coa.tenant_id = p_tenant_id
    AND coa.is_active = true
  ORDER BY coa.code;
END;
$$ LANGUAGE plpgsql;
