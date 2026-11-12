-- Tablas de asistencia faltantes
-- Ejecutar en Supabase SQL Editor

-- 1. attendance_schedules (horarios/días libres por empleado)
CREATE TABLE IF NOT EXISTS attendance_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  free_days INTEGER[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, employee_id)
);
ALTER TABLE attendance_schedules ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all' AND tablename = 'attendance_schedules') THEN
    CREATE POLICY "service_role_all" ON attendance_schedules FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 2. attendance_deduction_config (configuración de deducciones)
CREATE TABLE IF NOT EXISTS attendance_deduction_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id TEXT NOT NULL UNIQUE,
  absent_percent NUMERIC DEFAULT 100,
  late_threshold_minutes INTEGER DEFAULT 0,
  late_deduction_amount NUMERIC DEFAULT 0,
  unpaid_leave_percent NUMERIC DEFAULT 100,
  disability_percent NUMERIC DEFAULT 100,
  overtime_rate_multiplier NUMERIC DEFAULT 2,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE attendance_deduction_config ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all' AND tablename = 'attendance_deduction_config') THEN
    CREATE POLICY "service_role_all" ON attendance_deduction_config FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 3. attendance_holidays (feriados)
CREATE TABLE IF NOT EXISTS attendance_holidays (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  date DATE NOT NULL,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'doble',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, date)
);
ALTER TABLE attendance_holidays ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all' AND tablename = 'attendance_holidays') THEN
    CREATE POLICY "service_role_all" ON attendance_holidays FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 4. employee_history (si no existe)
CREATE TABLE IF NOT EXISTS employee_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID,
  tenant_id TEXT NOT NULL,
  action TEXT NOT NULL,
  description TEXT,
  changes JSONB,
  performed_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE employee_history ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all' AND tablename = 'employee_history') THEN
    CREATE POLICY "service_role_all" ON employee_history FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
