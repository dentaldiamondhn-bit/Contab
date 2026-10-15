-- 014: RLS Policies for supplier_price_history table
--
-- CORREGIDO 5 Oct 2026 (migracion 041). Antes estas 4 politicas filtraban solo
-- por `tenant_id`:
--
--   USING (tenant_id = (SELECT tenantid FROM "User" WHERE authid = auth.uid()::TEXT))
--
-- Ese es el patron que el proyecto ya pago como su bug mas caro: `tenant_id`
-- AGRUPA, no aisla. `TEST1DS` tiene DOS empresas ("test 1" y "test 2"), asi que
-- un filtro por tenant no las separa: las dos se verian el historial de la otra.
-- Y `User.tenantid` es un campo LEGACY; la fuente de verdad de "a que empresas
-- entra este usuario" es `user_company_access` (AGENTS.md, seccion 1b).
--
-- Por eso las politicas van por `user_company_access.company_id`.
--
-- LO QUE ESTO NO HACE: cambiar el comportamiento de la aplicacion.
-- `lib/supabase/server-lazy.ts` usa `SUPABASE_SERVICE_ROLE_KEY`, que salta el
-- RLS por completo. El aislamiento real sigue dependiendo del
-- `.eq('company_id', empresa.companyId)` del codigo de la ruta. Lo que se
-- arregla aqui es que la politica no este equivocada para el dia en que alguien
-- si dependa del RLS.
--
-- IDEMPOTENCIA: `CREATE POLICY` no admite `IF NOT EXISTS`, asi que el patron es
-- `DROP POLICY IF EXISTS` + `CREATE`. Sin los DROP, correr este archivo dos
-- veces falla con `42710 policy already exists for table`.

-- Enable RLS on the table
ALTER TABLE "supplier_price_history" ENABLE ROW LEVEL SECURITY;

-- Policy: view only own companies' price history
DROP POLICY IF EXISTS "Tenants can view own supplier price history" ON "supplier_price_history";
CREATE POLICY "Tenants can view own supplier price history" ON "supplier_price_history"
  FOR SELECT USING (company_id IN (
    SELECT uca.company_id
    FROM public.user_company_access uca
    JOIN public."User" u ON u.id = uca.user_id
    WHERE u.authid = auth.uid()::text
  ));

-- Policy: insert only into own companies
DROP POLICY IF EXISTS "Tenants can insert own supplier price history" ON "supplier_price_history";
CREATE POLICY "Tenants can insert own supplier price history" ON "supplier_price_history"
  FOR INSERT WITH CHECK (company_id IN (
    SELECT uca.company_id
    FROM public.user_company_access uca
    JOIN public."User" u ON u.id = uca.user_id
    WHERE u.authid = auth.uid()::text
  ));

-- Policy: update only own companies
DROP POLICY IF EXISTS "Tenants can update own supplier price history" ON "supplier_price_history";
CREATE POLICY "Tenants can update own supplier price history" ON "supplier_price_history"
  FOR UPDATE USING (company_id IN (
    SELECT uca.company_id
    FROM public.user_company_access uca
    JOIN public."User" u ON u.id = uca.user_id
    WHERE u.authid = auth.uid()::text
  ))
  WITH CHECK (company_id IN (
    SELECT uca.company_id
    FROM public.user_company_access uca
    JOIN public."User" u ON u.id = uca.user_id
    WHERE u.authid = auth.uid()::text
  ));

-- Policy: delete only own companies
DROP POLICY IF EXISTS "Tenants can delete own supplier price history" ON "supplier_price_history";
CREATE POLICY "Tenants can delete own supplier price history" ON "supplier_price_history"
  FOR DELETE USING (company_id IN (
    SELECT uca.company_id
    FROM public.user_company_access uca
    JOIN public."User" u ON u.id = uca.user_id
    WHERE u.authid = auth.uid()::text
  ));

-- Index for RLS performance (if not already created)
CREATE INDEX IF NOT EXISTS "idx_supplier_price_history_tenant_rls" ON "supplier_price_history" ("tenant_id");

-- El `company_id` es el que usan las 4 politicas de arriba: sin indice, cada
-- fila evalua dos subconsultas. Lo crea tambien la migracion 041; el
-- IF NOT EXISTS hace que ambos caminos den el mismo esquema.
CREATE INDEX IF NOT EXISTS "idx_supplier_price_company" ON "supplier_price_history" ("company_id");