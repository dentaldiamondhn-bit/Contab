-- Verificar y agregar work_schedule_id a employees si no existe
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'work_schedule_id') THEN
    ALTER TABLE employees ADD COLUMN work_schedule_id UUID REFERENCES work_schedules(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_employees_work_schedule ON employees(work_schedule_id);

-- Verificar y agregar columnas de multiples breaks a work_schedules
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_schedules' AND column_name = 'break2_start') THEN
    ALTER TABLE work_schedules ADD COLUMN break2_start TIME;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_schedules' AND column_name = 'break2_end') THEN
    ALTER TABLE work_schedules ADD COLUMN break2_end TIME;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_schedules' AND column_name = 'break3_start') THEN
    ALTER TABLE work_schedules ADD COLUMN break3_start TIME;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_schedules' AND column_name = 'break3_end') THEN
    ALTER TABLE work_schedules ADD COLUMN break3_end TIME;
  END IF;
END $$;
