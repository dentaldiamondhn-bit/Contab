-- RLS v3: cierre final de objetos aún abiertos tras v2 (17 Sept 2026)
-- Ejecutar en Supabase SQL Editor. Solo cubre los 15 objetos abiertos
-- restantes (Taxes excluido a propósito: catálogo global de solo lectura).
-- service_role hace bypass: la API server-side no se afecta.
-- Cada objeto recibe 3 bloques independientes: ENABLE (tablas), security_invoker
-- (vistas) y policy por claim (si hay columna tenant). Lo que no aplique se
-- omite con NOTICE sin abortar. Verificación al final (debe imprimir OK).

-- ======== InvoiceSummary (tenant: tenantId) ========

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'InvoiceSummary' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, 'InvoiceSummary');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_V3: InvoiceSummary [limpieza] omitido: %', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE "InvoiceSummary" ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_V3: InvoiceSummary [rls] omitido: %', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER VIEW "InvoiceSummary" SET (security_invoker = true);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_V3: InvoiceSummary [invoker] omitido: %', SQLERRM;
END $$;

DO $$
BEGIN
  CREATE POLICY "tenant_isolation" ON "InvoiceSummary"
    FOR ALL USING ("tenantId" = (current_setting('request.jwt.claims', true)::json->>'tenant_id')) WITH CHECK ("tenantId" = (current_setting('request.jwt.claims', true)::json->>'tenant_id'));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_V3: InvoiceSummary [policy] omitido: %', SQLERRM;
END $$;

-- ======== PackageDetails (tenant: ninguna) ========

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'PackageDetails' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, 'PackageDetails');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_V3: PackageDetails [limpieza] omitido: %', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE "PackageDetails" ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_V3: PackageDetails [rls] omitido: %', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER VIEW "PackageDetails" SET (security_invoker = true);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_V3: PackageDetails [invoker] omitido: %', SQLERRM;
END $$;

-- ======== Tenants (tenant: ninguna) ========

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Tenants' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, 'Tenants');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_V3: Tenants [limpieza] omitido: %', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE "Tenants" ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_V3: Tenants [rls] omitido: %', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER VIEW "Tenants" SET (security_invoker = true);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_V3: Tenants [invoker] omitido: %', SQLERRM;
END $$;

-- ======== employee_vacation_summary (tenant: company_id) ========

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'employee_vacation_summary' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, 'employee_vacation_summary');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_V3: employee_vacation_summary [limpieza] omitido: %', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE "employee_vacation_summary" ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_V3: employee_vacation_summary [rls] omitido: %', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER VIEW "employee_vacation_summary" SET (security_invoker = true);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_V3: employee_vacation_summary [invoker] omitido: %', SQLERRM;
END $$;

-- ======== inventario_valorizado (tenant: tenant_id) ========

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'inventario_valorizado' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, 'inventario_valorizado');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_V3: inventario_valorizado [limpieza] omitido: %', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE "inventario_valorizado" ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_V3: inventario_valorizado [rls] omitido: %', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER VIEW "inventario_valorizado" SET (security_invoker = true);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_V3: inventario_valorizado [invoker] omitido: %', SQLERRM;
END $$;

DO $$
BEGIN
  CREATE POLICY "tenant_isolation" ON "inventario_valorizado"
    FOR ALL USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')) WITH CHECK (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id'));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_V3: inventario_valorizado [policy] omitido: %', SQLERRM;
END $$;

-- ======== libro_diario_integrado (tenant: ninguna) ========

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'libro_diario_integrado' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, 'libro_diario_integrado');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_V3: libro_diario_integrado [limpieza] omitido: %', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE "libro_diario_integrado" ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_V3: libro_diario_integrado [rls] omitido: %', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER VIEW "libro_diario_integrado" SET (security_invoker = true);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_V3: libro_diario_integrado [invoker] omitido: %', SQLERRM;
END $$;

-- ======== libro_egresos (tenant: ninguna) ========

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'libro_egresos' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, 'libro_egresos');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_V3: libro_egresos [limpieza] omitido: %', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE "libro_egresos" ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_V3: libro_egresos [rls] omitido: %', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER VIEW "libro_egresos" SET (security_invoker = true);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_V3: libro_egresos [invoker] omitido: %', SQLERRM;
END $$;

-- ======== libro_ventas (tenant: tenant_id) ========

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'libro_ventas' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, 'libro_ventas');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_V3: libro_ventas [limpieza] omitido: %', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE "libro_ventas" ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_V3: libro_ventas [rls] omitido: %', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER VIEW "libro_ventas" SET (security_invoker = true);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_V3: libro_ventas [invoker] omitido: %', SQLERRM;
END $$;

DO $$
BEGIN
  CREATE POLICY "tenant_isolation" ON "libro_ventas"
    FOR ALL USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')) WITH CHECK (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id'));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_V3: libro_ventas [policy] omitido: %', SQLERRM;
END $$;

-- ======== inventory_stock_alert (tenant: tenant_id) ========

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'inventory_stock_alert' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, 'inventory_stock_alert');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_V3: inventory_stock_alert [limpieza] omitido: %', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE "inventory_stock_alert" ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_V3: inventory_stock_alert [rls] omitido: %', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER VIEW "inventory_stock_alert" SET (security_invoker = true);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_V3: inventory_stock_alert [invoker] omitido: %', SQLERRM;
END $$;

DO $$
BEGIN
  CREATE POLICY "tenant_isolation" ON "inventory_stock_alert"
    FOR ALL USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')) WITH CHECK (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id'));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_V3: inventory_stock_alert [policy] omitido: %', SQLERRM;
END $$;

-- ======== resumen_ingresos_egresos (tenant: ninguna) ========

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'resumen_ingresos_egresos' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, 'resumen_ingresos_egresos');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_V3: resumen_ingresos_egresos [limpieza] omitido: %', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE "resumen_ingresos_egresos" ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_V3: resumen_ingresos_egresos [rls] omitido: %', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER VIEW "resumen_ingresos_egresos" SET (security_invoker = true);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_V3: resumen_ingresos_egresos [invoker] omitido: %', SQLERRM;
END $$;

-- ======== tenant_plan_summary (tenant: tenant_id) ========

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tenant_plan_summary' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, 'tenant_plan_summary');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_V3: tenant_plan_summary [limpieza] omitido: %', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE "tenant_plan_summary" ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_V3: tenant_plan_summary [rls] omitido: %', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER VIEW "tenant_plan_summary" SET (security_invoker = true);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_V3: tenant_plan_summary [invoker] omitido: %', SQLERRM;
END $$;

DO $$
BEGIN
  CREATE POLICY "tenant_isolation" ON "tenant_plan_summary"
    FOR ALL USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')) WITH CHECK (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id'));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_V3: tenant_plan_summary [policy] omitido: %', SQLERRM;
END $$;

-- ======== tenantstatistics (tenant: ninguna) ========

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tenantstatistics' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, 'tenantstatistics');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_V3: tenantstatistics [limpieza] omitido: %', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE "tenantstatistics" ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_V3: tenantstatistics [rls] omitido: %', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER VIEW "tenantstatistics" SET (security_invoker = true);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_V3: tenantstatistics [invoker] omitido: %', SQLERRM;
END $$;

-- ======== cuentas_por_pagar (tenant: tenant_id) ========

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cuentas_por_pagar' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, 'cuentas_por_pagar');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_V3: cuentas_por_pagar [limpieza] omitido: %', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE "cuentas_por_pagar" ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_V3: cuentas_por_pagar [rls] omitido: %', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER VIEW "cuentas_por_pagar" SET (security_invoker = true);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_V3: cuentas_por_pagar [invoker] omitido: %', SQLERRM;
END $$;

DO $$
BEGIN
  CREATE POLICY "tenant_isolation" ON "cuentas_por_pagar"
    FOR ALL USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')) WITH CHECK (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id'));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_V3: cuentas_por_pagar [policy] omitido: %', SQLERRM;
END $$;

-- ======== cuentas_por_cobrar (tenant: tenant_id) ========

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cuentas_por_cobrar' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, 'cuentas_por_cobrar');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_V3: cuentas_por_cobrar [limpieza] omitido: %', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE "cuentas_por_cobrar" ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_V3: cuentas_por_cobrar [rls] omitido: %', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER VIEW "cuentas_por_cobrar" SET (security_invoker = true);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_V3: cuentas_por_cobrar [invoker] omitido: %', SQLERRM;
END $$;

DO $$
BEGIN
  CREATE POLICY "tenant_isolation" ON "cuentas_por_cobrar"
    FOR ALL USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')) WITH CHECK (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id'));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_V3: cuentas_por_cobrar [policy] omitido: %', SQLERRM;
END $$;

-- ======== libro_compras (tenant: tenant_id) ========

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'libro_compras' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, 'libro_compras');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_V3: libro_compras [limpieza] omitido: %', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE "libro_compras" ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_V3: libro_compras [rls] omitido: %', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER VIEW "libro_compras" SET (security_invoker = true);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_V3: libro_compras [invoker] omitido: %', SQLERRM;
END $$;

DO $$
BEGIN
  CREATE POLICY "tenant_isolation" ON "libro_compras"
    FOR ALL USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')) WITH CHECK (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id'));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_V3: libro_compras [policy] omitido: %', SQLERRM;
END $$;

-- ============ Verificación ============
DO $$
DECLARE
  r RECORD;
  n INTEGER := 0;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND NOT rowsecurity ORDER BY 1
  LOOP
    RAISE NOTICE 'SIN RLS: %', r.tablename;
    n := n + 1;
  END LOOP;
  IF n = 0 THEN RAISE NOTICE 'OK: RLS habilitado en todas las tablas'; END IF;
END $$;
