-- EMPLOYEE_TEAMS: sub-equipos dentro de departamentos
-- Permite crear grupos personalizados de empleados dentro de cada departamento

CREATE TABLE IF NOT EXISTS employee_teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_employee_teams_unique_name
  ON employee_teams (tenant_id, department, name);

CREATE INDEX IF NOT EXISTS idx_employee_teams_dept
  ON employee_teams (tenant_id, department);

-- TEAM_MEMBERS: relacion empleados <-> equipos
CREATE TABLE IF NOT EXISTS team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  team_id UUID NOT NULL REFERENCES employee_teams(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('leader', 'member')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_team_members_unique
  ON team_members (tenant_id, team_id, employee_id);

CREATE INDEX IF NOT EXISTS idx_team_members_employee
  ON team_members (tenant_id, employee_id);

-- RLS
ALTER TABLE employee_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON employee_teams
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON team_members
  FOR ALL TO service_role USING (true) WITH CHECK (true);
