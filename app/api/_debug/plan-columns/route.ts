import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  const result = await supabase
    .from('Plan')
    .select('*')
    .limit(1);

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  // If no rows, query information_schema
  if (!result.data || result.data.length === 0) {
    const colsRes = await supabase.rpc('exec_sql', { sql: `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'Plan'
      ORDER BY ordinal_position
    `}).catch(async () => {
      // Try a workaround: insert with all fields to see which fail
      const testPlan: Record<string, any> = {
        name: 'TEMP_DELETE_ME',
        code: 'TEMP_PLAN_COL_CHECK_DELETE',
        price: 0,
        max_users: 5,
        max_storage: 100,
        max_transactions: 10000,
        features: '[]',
        modules: '[]',
        is_active: true,
      };
      const r = await supabase.from('Plan').insert([testPlan]).select('*').single();
      if (r.data) {
        // delete it
        await supabase.from('Plan').delete().eq('id', r.data.id);
        return { columns: Object.keys(r.data) };
      }
      return { error: r.error?.message };
    });
    return NextResponse.json(colsRes);
  }

  return NextResponse.json({ existingRow: result.data[0], columns: Object.keys(result.data[0]) });
}
