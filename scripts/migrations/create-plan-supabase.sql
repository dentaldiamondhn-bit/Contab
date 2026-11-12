CREATE TABLE IF NOT EXISTS "Plan" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    price INTEGER NOT NULL DEFAULT 0,
    max_users  INTEGER NOT NULL DEFAULT 5,
    max_storage  INTEGER NOT NULL DEFAULT 100,
    max_transactions INTEGER NOT NULL DEFAULT 10000,
    features TEXT NOT NULL DEFAULT '[]',
    modules TEXT NOT NULL DEFAULT '[]',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE "Plan" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Plan lectura pública' AND tablename = 'Plan') THEN
    CREATE POLICY "Plan lectura pública" ON "Plan" FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Plan escritura autenticada' AND tablename = 'Plan') THEN
    CREATE POLICY "Plan escritura autenticada" ON "Plan" FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_plan_code ON "Plan"("code");
CREATE INDEX IF NOT EXISTS idx_plan_is_active ON "Plan"("is_active");
