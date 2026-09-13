-- Agregar overtime_start y overtime_end a time_tracking
-- Ejecutar en Supabase SQL Editor

-- Drop old CHECK constraint and add new one with overtime events
ALTER TABLE time_tracking DROP CONSTRAINT IF EXISTS time_tracking_event_type_check;

ALTER TABLE time_tracking ADD CONSTRAINT time_tracking_event_type_check
  CHECK (event_type IN ('entrance', 'break_start', 'break_end', 'lunch_start', 'lunch_end', 'end_of_shift', 'overtime_start', 'overtime_end'));
