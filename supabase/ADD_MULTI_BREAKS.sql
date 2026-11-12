-- Agregar columnas de multiples breaks a work_schedules
-- Ejecutar en Supabase SQL Editor

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
