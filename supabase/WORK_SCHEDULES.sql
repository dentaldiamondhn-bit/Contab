-- work_schedules: horarios predefinidos por tenant
-- Ejecutar en Supabase SQL Editor

CREATE TABLE IF NOT EXISTS work_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  entry_time TIME NOT NULL DEFAULT '08:00',
  exit_time TIME NOT NULL DEFAULT '17:00',
  break_start TIME,
  break_end TIME,
  lunch_start TIME,
  lunch_end TIME,
  free_days INTEGER[] DEFAULT '{0}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, name)
);

ALTER TABLE work_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all" ON work_schedules;
CREATE POLICY "service_role_all" ON work_schedules FOR ALL TO service_role USING (true) WITH CHECK (true);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'work_schedule_id') THEN
    ALTER TABLE employees ADD COLUMN work_schedule_id UUID REFERENCES work_schedules(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_work_schedules_tenant ON work_schedules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_employees_work_schedule ON employees(work_schedule_id);
