-- RLS en TODAS las tablas + cierre de riesgo cross-tenant (v2)
-- Ejecutar en Supabase SQL Editor (por bloques si es necesario)
-- Referencia: docs/SEGURIDAD_CONTROL_REPORT.md § "Auditoría RLS y Cross-Tenant (17 Sept 2026)"
--
-- ALCANCE: solo tablas ABIERTAS a la key anónima según auditoría empírica
-- (lectura y/o escritura anon confirmada el 17 Sept 2026). Las tablas ya
-- bloqueadas por RLS (users, companies, Invoice, Purchase, Tenant(s), User,
-- warehouse, budgets, inventory_transfer, login_attempts, password_resets,
-- tenant_user_access, TenantCompensation, InvoiceItem, PurchaseItem) NO se
-- tocan para no romper sus políticas vigentes.
--
-- v2 (17 Sept 2026): corrige v1 parcial (solo aseguró objetos minúsculos sin
-- policies previas: cai + 6 vistas). Causas: (1) identificadores PascalCase
-- sin comillas => Postgres los convierte a minúsculas y tocan otra tabla;
-- (2) policies permisivas previas (USING(true)) se combinan con OR y anulan
-- la restrictiva. v2 entrecomilla todo y borra policies previas en alcance.
--
-- IMPACTO: service_role (toda la API server-side) hace bypass de RLS y sigue
-- funcionando. Los componentes cliente que consultan Supabase directo con la
-- key anónima DEBEN migrarse a rutas API antes/después de aplicar (ver lista
-- en el reporte). Aplicar primero en staging.


-- ============ A0. Limpieza: eliminar TODAS las policies previas en alcance ============
-- (Postgres combina policies con OR: una policy permisiva previa como
-- USING(true) anula cualquier policy restrictiva nueva. Por eso se borran
-- primero. Identificadores SIEMPRE entrecomillados: sin comillas, Postgres
-- convierte PascalCase a minúsculas y el statement toca otra tabla.)

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Account' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, 'Account');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: Account limpieza omitida: %', SQLERRM;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'CustomerRetentions' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, 'CustomerRetentions');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: CustomerRetentions limpieza omitida: %', SQLERRM;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'File' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, 'File');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: File limpieza omitida: %', SQLERRM;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'InvoiceSummary' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, 'InvoiceSummary');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: InvoiceSummary limpieza omitida: %', SQLERRM;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'JournalEntry' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, 'JournalEntry');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: JournalEntry limpieza omitida: %', SQLERRM;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Supplier' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, 'Supplier');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: Supplier limpieza omitida: %', SQLERRM;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Transaction' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, 'Transaction');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: Transaction limpieza omitida: %', SQLERRM;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'attendance_deduction_config' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, 'attendance_deduction_config');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: attendance_deduction_config limpieza omitida: %', SQLERRM;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'attendance_holidays' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, 'attendance_holidays');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: attendance_holidays limpieza omitida: %', SQLERRM;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'attendance_schedules' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, 'attendance_schedules');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: attendance_schedules limpieza omitida: %', SQLERRM;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'chat_message' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, 'chat_message');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: chat_message limpieza omitida: %', SQLERRM;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'company_logos' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, 'company_logos');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: company_logos limpieza omitida: %', SQLERRM;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cuentas_por_cobrar' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, 'cuentas_por_cobrar');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: cuentas_por_cobrar limpieza omitida: %', SQLERRM;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cuentas_por_pagar' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, 'cuentas_por_pagar');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: cuentas_por_pagar limpieza omitida: %', SQLERRM;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'customer' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, 'customer');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: customer limpieza omitida: %', SQLERRM;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'employee_history' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, 'employee_history');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: employee_history limpieza omitida: %', SQLERRM;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'employees' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, 'employees');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: employees limpieza omitida: %', SQLERRM;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'inventario_valorizado' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, 'inventario_valorizado');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: inventario_valorizado limpieza omitida: %', SQLERRM;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'inventory_stock_alert' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, 'inventory_stock_alert');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: inventory_stock_alert limpieza omitida: %', SQLERRM;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'libro_compras' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, 'libro_compras');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: libro_compras limpieza omitida: %', SQLERRM;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'libro_ventas' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, 'libro_ventas');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: libro_ventas limpieza omitida: %', SQLERRM;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'period_locks' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, 'period_locks');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: period_locks limpieza omitida: %', SQLERRM;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'permission_requests' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, 'permission_requests');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: permission_requests limpieza omitida: %', SQLERRM;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'permission_types' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, 'permission_types');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: permission_types limpieza omitida: %', SQLERRM;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'permission_usage' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, 'permission_usage');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: permission_usage limpieza omitida: %', SQLERRM;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'product' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, 'product');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: product limpieza omitida: %', SQLERRM;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tenant_plan_summary' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, 'tenant_plan_summary');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: tenant_plan_summary limpieza omitida: %', SQLERRM;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Customer' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, 'Customer');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: Customer limpieza omitida: %', SQLERRM;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'PackageDetails' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, 'PackageDetails');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: PackageDetails limpieza omitida: %', SQLERRM;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'PackageProducts' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, 'PackageProducts');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: PackageProducts limpieza omitida: %', SQLERRM;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Packages' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, 'Packages');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: Packages limpieza omitida: %', SQLERRM;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Retentions' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, 'Retentions');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: Retentions limpieza omitida: %', SQLERRM;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Tenants' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, 'Tenants');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: Tenants limpieza omitida: %', SQLERRM;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cai_ranges' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, 'cai_ranges');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: cai_ranges limpieza omitida: %', SQLERRM;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'company_modules' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, 'company_modules');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: company_modules limpieza omitida: %', SQLERRM;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'employee_salary_history' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, 'employee_salary_history');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: employee_salary_history limpieza omitida: %', SQLERRM;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'employee_vacation_summary' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, 'employee_vacation_summary');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: employee_vacation_summary limpieza omitida: %', SQLERRM;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'employer_contributions' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, 'employer_contributions');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: employer_contributions limpieza omitida: %', SQLERRM;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'impuesto_vecinal_calculations' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, 'impuesto_vecinal_calculations');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: impuesto_vecinal_calculations limpieza omitida: %', SQLERRM;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'labor_provisions' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, 'labor_provisions');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: labor_provisions limpieza omitida: %', SQLERRM;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'legal_deduction_settings' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, 'legal_deduction_settings');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: legal_deduction_settings limpieza omitida: %', SQLERRM;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'legal_revisiones' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, 'legal_revisiones');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: legal_revisiones limpieza omitida: %', SQLERRM;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'legal_revisiones_acciones' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, 'legal_revisiones_acciones');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: legal_revisiones_acciones limpieza omitida: %', SQLERRM;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'legal_revisiones_documentos' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, 'legal_revisiones_documentos');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: legal_revisiones_documentos limpieza omitida: %', SQLERRM;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'legal_revisiones_historial' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, 'legal_revisiones_historial');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: legal_revisiones_historial limpieza omitida: %', SQLERRM;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'legal_revisiones_recordatorios' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, 'legal_revisiones_recordatorios');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: legal_revisiones_recordatorios limpieza omitida: %', SQLERRM;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'payment_vouchers' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, 'payment_vouchers');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: payment_vouchers limpieza omitida: %', SQLERRM;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'payroll_departments' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, 'payroll_departments');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: payroll_departments limpieza omitida: %', SQLERRM;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'payroll_details' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, 'payroll_details');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: payroll_details limpieza omitida: %', SQLERRM;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'payroll_periods' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, 'payroll_periods');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: payroll_periods limpieza omitida: %', SQLERRM;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'payroll_positions' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, 'payroll_positions');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: payroll_positions limpieza omitida: %', SQLERRM;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'payroll_vouchers' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, 'payroll_vouchers');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: payroll_vouchers limpieza omitida: %', SQLERRM;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tenantstatistics' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, 'tenantstatistics');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: tenantstatistics limpieza omitida: %', SQLERRM;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'vacation_history' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, 'vacation_history');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: vacation_history limpieza omitida: %', SQLERRM;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'vacation_requests' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, 'vacation_requests');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: vacation_requests limpieza omitida: %', SQLERRM;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Taxes' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, 'Taxes');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: Taxes limpieza omitida: %', SQLERRM;
END $$;

-- ============ A. Tablas con columna de tenant: aislamiento por claim ============
-- (Cada tabla en bloque DO con EXCEPTION: idempotente, no aborta el script)

DO $$
BEGIN
  ALTER TABLE "Account" ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "tenant_isolation" ON "Account"
    FOR ALL USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id') OR "tenantId" = (current_setting('request.jwt.claims', true)::json->>'tenant_id')) WITH CHECK (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id') OR "tenantId" = (current_setting('request.jwt.claims', true)::json->>'tenant_id'));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'Account', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE "CustomerRetentions" ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "tenant_isolation" ON "CustomerRetentions"
    FOR ALL USING ("tenantId" = (current_setting('request.jwt.claims', true)::json->>'tenant_id')) WITH CHECK ("tenantId" = (current_setting('request.jwt.claims', true)::json->>'tenant_id'));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'CustomerRetentions', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE "File" ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "tenant_isolation" ON "File"
    FOR ALL USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id') OR "tenantId" = (current_setting('request.jwt.claims', true)::json->>'tenant_id')) WITH CHECK (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id') OR "tenantId" = (current_setting('request.jwt.claims', true)::json->>'tenant_id'));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'File', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE "InvoiceSummary" ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "tenant_isolation" ON "InvoiceSummary"
    FOR ALL USING ("tenantId" = (current_setting('request.jwt.claims', true)::json->>'tenant_id')) WITH CHECK ("tenantId" = (current_setting('request.jwt.claims', true)::json->>'tenant_id'));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'InvoiceSummary', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE "JournalEntry" ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "tenant_isolation" ON "JournalEntry"
    FOR ALL USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id') OR "tenantId" = (current_setting('request.jwt.claims', true)::json->>'tenant_id')) WITH CHECK (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id') OR "tenantId" = (current_setting('request.jwt.claims', true)::json->>'tenant_id'));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'JournalEntry', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE "Supplier" ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "tenant_isolation" ON "Supplier"
    FOR ALL USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')) WITH CHECK (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id'));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'Supplier', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE "Transaction" ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "tenant_isolation" ON "Transaction"
    FOR ALL USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id') OR "tenantId" = (current_setting('request.jwt.claims', true)::json->>'tenant_id')) WITH CHECK (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id') OR "tenantId" = (current_setting('request.jwt.claims', true)::json->>'tenant_id'));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'Transaction', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE "attendance_deduction_config" ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "tenant_isolation" ON "attendance_deduction_config"
    FOR ALL USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')) WITH CHECK (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id'));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'attendance_deduction_config', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE "attendance_holidays" ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "tenant_isolation" ON "attendance_holidays"
    FOR ALL USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')) WITH CHECK (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id'));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'attendance_holidays', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE "attendance_schedules" ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "tenant_isolation" ON "attendance_schedules"
    FOR ALL USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')) WITH CHECK (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id'));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'attendance_schedules', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE "chat_message" ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "tenant_isolation" ON "chat_message"
    FOR ALL USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')) WITH CHECK (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id'));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'chat_message', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE "company_logos" ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "tenant_isolation" ON "company_logos"
    FOR ALL USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')) WITH CHECK (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id'));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'company_logos', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE "cuentas_por_cobrar" ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "tenant_isolation" ON "cuentas_por_cobrar"
    FOR ALL USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')) WITH CHECK (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id'));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'cuentas_por_cobrar', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE "cuentas_por_pagar" ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "tenant_isolation" ON "cuentas_por_pagar"
    FOR ALL USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')) WITH CHECK (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id'));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'cuentas_por_pagar', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE "customer" ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "tenant_isolation" ON "customer"
    FOR ALL USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')) WITH CHECK (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id'));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'customer', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE "employee_history" ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "tenant_isolation" ON "employee_history"
    FOR ALL USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')) WITH CHECK (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id'));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'employee_history', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE "employees" ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "tenant_isolation" ON "employees"
    FOR ALL USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')) WITH CHECK (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id'));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'employees', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE "inventario_valorizado" ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "tenant_isolation" ON "inventario_valorizado"
    FOR ALL USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')) WITH CHECK (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id'));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'inventario_valorizado', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE "inventory_stock_alert" ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "tenant_isolation" ON "inventory_stock_alert"
    FOR ALL USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')) WITH CHECK (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id'));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'inventory_stock_alert', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE "libro_compras" ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "tenant_isolation" ON "libro_compras"
    FOR ALL USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')) WITH CHECK (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id'));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'libro_compras', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE "libro_ventas" ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "tenant_isolation" ON "libro_ventas"
    FOR ALL USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')) WITH CHECK (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id'));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'libro_ventas', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE "period_locks" ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "tenant_isolation" ON "period_locks"
    FOR ALL USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')) WITH CHECK (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id'));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'period_locks', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE "permission_requests" ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "tenant_isolation" ON "permission_requests"
    FOR ALL USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')) WITH CHECK (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id'));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'permission_requests', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE "permission_types" ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "tenant_isolation" ON "permission_types"
    FOR ALL USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')) WITH CHECK (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id'));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'permission_types', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE "permission_usage" ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "tenant_isolation" ON "permission_usage"
    FOR ALL USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')) WITH CHECK (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id'));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'permission_usage', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE "product" ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "tenant_isolation" ON "product"
    FOR ALL USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')) WITH CHECK (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id'));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'product', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE "tenant_plan_summary" ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "tenant_isolation" ON "tenant_plan_summary"
    FOR ALL USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')) WITH CHECK (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id'));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'tenant_plan_summary', SQLERRM;
END $$;


-- ============ B. Tablas hija: aislamiento vía tabla padre ============


-- ============ C. Denegar anon por defecto (sin columna de tenant) ============
-- RLS habilitado SIN políticas: solo service_role accede (la API server-side
-- sigue operativa). Incluye backups y tablas de alcance global/empresa.

DO $$
BEGIN
  ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'Customer', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE "PackageDetails" ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'PackageDetails', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE "PackageProducts" ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'PackageProducts', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE "Packages" ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'Packages', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE "Retentions" ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'Retentions', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE "Tenants" ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'Tenants', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE "cai_ranges" ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'cai_ranges', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE "company_modules" ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'company_modules', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE "employee_salary_history" ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'employee_salary_history', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE "employee_vacation_summary" ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'employee_vacation_summary', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE "employer_contributions" ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'employer_contributions', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE "impuesto_vecinal_calculations" ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'impuesto_vecinal_calculations', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE "labor_provisions" ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'labor_provisions', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE "legal_deduction_settings" ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'legal_deduction_settings', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE "legal_revisiones" ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'legal_revisiones', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE "legal_revisiones_acciones" ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'legal_revisiones_acciones', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE "legal_revisiones_documentos" ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'legal_revisiones_documentos', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE "legal_revisiones_historial" ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'legal_revisiones_historial', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE "legal_revisiones_recordatorios" ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'legal_revisiones_recordatorios', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE "payment_vouchers" ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'payment_vouchers', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE "payroll_departments" ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'payroll_departments', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE "payroll_details" ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'payroll_details', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE "payroll_periods" ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'payroll_periods', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE "payroll_positions" ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'payroll_positions', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE "payroll_vouchers" ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'payroll_vouchers', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE "tenantstatistics" ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'tenantstatistics', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE "vacation_history" ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'vacation_history', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE "vacation_requests" ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'vacation_requests', SQLERRM;
END $$;


-- ============ D. Catálogos globales: lectura pública, escritura bloqueada ============

DO $$
BEGIN
  ALTER TABLE "Taxes" ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "public_read_catalog" ON "Taxes" FOR SELECT USING (true);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'Taxes', SQLERRM;
END $$;


-- ============ E. Vistas: aplicar RLS del invocante ============
-- Sin security_invoker, las vistas se ejecutan como owner y EVADEN el RLS de
-- las tablas base. Requiere Postgres 15+ (Supabase actual lo soporta).

DO $$
BEGIN
  ALTER VIEW "balance_general" SET (security_invoker = true);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'balance_general', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER VIEW "balanza_comprobacion" SET (security_invoker = true);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'balanza_comprobacion', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER VIEW "estado_resultados" SET (security_invoker = true);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'estado_resultados', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER VIEW "flujo_efectivo_mensual" SET (security_invoker = true);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'flujo_efectivo_mensual', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER VIEW "libro_diario" SET (security_invoker = true);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'libro_diario', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER VIEW "libro_diario_honduras" SET (security_invoker = true);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'libro_diario_honduras', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER VIEW "libro_diario_integrado" SET (security_invoker = true);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'libro_diario_integrado', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER VIEW "libro_egresos" SET (security_invoker = true);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'libro_egresos', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER VIEW "libro_ingresos" SET (security_invoker = true);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'libro_ingresos', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER VIEW "libro_mayor" SET (security_invoker = true);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'libro_mayor', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER VIEW "resumen_contable" SET (security_invoker = true);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'resumen_contable', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER VIEW "resumen_ingresos_egresos" SET (security_invoker = true);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'resumen_ingresos_egresos', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER VIEW "v_transacciones_cierre" SET (security_invoker = true);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'v_transacciones_cierre', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER VIEW "view_payroll_employee_history" SET (security_invoker = true);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'view_payroll_employee_history', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER VIEW "view_payroll_employee_yearly" SET (security_invoker = true);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'view_payroll_employee_yearly', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER VIEW "view_payroll_periods_summary" SET (security_invoker = true);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'view_payroll_periods_summary', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER VIEW "vista_comparativo_mensual" SET (security_invoker = true);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'vista_comparativo_mensual', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER VIEW "vista_estado_resultados_detallado" SET (security_invoker = true);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'vista_estado_resultados_detallado', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER VIEW "vista_resumen_cuentas" SET (security_invoker = true);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'vista_resumen_cuentas', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER VIEW "vista_resumen_estado_resultados" SET (security_invoker = true);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS_ALL_TABLES: % omitida: %', 'vista_resumen_estado_resultados', SQLERRM;
END $$;


-- ============ F. Verificación (confirmar RLS en todas) ============
-- Debe devolver 0 filas. Si lista tablas, esas siguen SIN RLS.
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
