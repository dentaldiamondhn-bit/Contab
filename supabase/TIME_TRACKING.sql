-- TIME_TRACKING table for clock-in/out events
-- Each row represents a single time event (entrance, break, lunch, end of shift)

CREATE TABLE IF NOT EXISTS time_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('entrance', 'break_start', 'break_end', 'lunch_start', 'lunch_end', 'end_of_shift')),
  event_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Unique constraint: one event per type per employee per date
-- (e.g., one entrance per day, one break_start per day, etc.)
CREATE UNIQUE INDEX IF NOT EXISTS idx_time_tracking_unique_event
  ON time_tracking (tenant_id, employee_id, date, event_type);

-- Fast lookups by employee + date
CREATE INDEX IF NOT EXISTS idx_time_tracking_employee_date
  ON time_tracking (tenant_id, employee_id, date);

-- Fast lookups by date for the time clock page
CREATE INDEX IF NOT EXISTS idx_time_tracking_date
  ON time_tracking (tenant_id, date);

-- RLS
ALTER TABLE time_tracking ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON time_tracking
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
