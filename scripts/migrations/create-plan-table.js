// Script para crear la tabla Plan en Supabase (ejecutar una vez)
const { Client } = require('pg');

const client = new Client({
  host: 'aws-0-us-east-1.pooler.supabase.com',
  port: 6543,
  user: 'postgres',
  password: '7KC3eRuTM123',
  database: 'postgres',
});

const sql = `
-- Crear tabla Plan si no existe
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

-- Habilitar RLS
ALTER TABLE "Plan" ENABLE ROW LEVEL SECURITY;

-- Política SELECT pública
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Plan lectura pública' AND tablename = 'Plan') THEN
    CREATE POLICY \"Plan lectura pública\" ON \"Plan\" FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Plan escritura autenticada' AND tablename = 'Plan') THEN
    CREATE POLICY \"Plan escritura autenticada\" ON \"Plan\" FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- Índices
CREATE INDEX IF NOT EXISTS idx_plan_code ON "Plan"("code");
CREATE INDEX IF NOT EXISTS idx_plan_is_active ON "Plan"("is_active");
`;

async function run() {
  try {
    await client.connect();
    console.log('🔌 Conectado a Supabase (PostgreSQL pooler)');

    await client.query(sql);
    console.log('✅ Tabla Plan creada/verificada exitosamente');

    // Verificar
    const { rows } = await client.query(`SELECT * FROM "Plan" LIMIT 5`);
    console.log(`📋 Registros en Plan: ${rows.length}`);
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.end();
    console.log('🔌 Conexión cerrada');
  }
}

run();
