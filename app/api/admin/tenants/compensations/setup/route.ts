import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-db';

export async function POST() {
  try {
    // Create table via raw SQL using supabase rpc or direct query
    const { error } = await supabase.rpc('exec_sql' as any, {
      sql: `
        CREATE TABLE IF NOT EXISTS "TenantCompensation" (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          tenantid TEXT NOT NULL REFERENCES "Tenant"(id) ON DELETE CASCADE,
          type TEXT NOT NULL,
          days INTEGER DEFAULT 0,
          amount INTEGER DEFAULT 0,
          description TEXT NOT NULL,
          reason TEXT,
          createdby TEXT,
          createdat TIMESTAMPTZ DEFAULT NOW(),
          updatedat TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_compensation_tenant ON "TenantCompensation"(tenantid);
      `
    });

    if (error) {
      // Try alternative: direct insert test to verify table exists
      const testRow = {
        tenantid: 'test-delete-me',
        type: 'TEST',
        description: 'test',
        createdat: new Date().toISOString(),
      };
      const { error: insertErr } = await supabase
        .from('TenantCompensation')
        .insert(testRow);

      if (insertErr && insertErr.message.includes('does not exist')) {
        return NextResponse.json({
          error: 'La tabla TenantCompensation no existe. Ejecuta el SQL manualmente en Supabase.',
          sql: `CREATE TABLE IF NOT EXISTS "TenantCompensation" (
            id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
            tenantid TEXT NOT NULL REFERENCES "Tenant"(id) ON DELETE CASCADE,
            type TEXT NOT NULL,
            days INTEGER DEFAULT 0,
            amount INTEGER DEFAULT 0,
            description TEXT NOT NULL,
            reason TEXT,
            createdby TEXT,
            createdat TIMESTAMPTZ DEFAULT NOW(),
            updatedat TIMESTAMPTZ DEFAULT NOW()
          );`
        }, { status: 500 });
      }

      // Clean up test row if it was inserted
      if (!insertErr) {
        await supabase.from('TenantCompensation').delete().eq('tenantid', 'test-delete-me');
      }
    }

    return NextResponse.json({ success: true, message: 'Tabla verificada/creada' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
