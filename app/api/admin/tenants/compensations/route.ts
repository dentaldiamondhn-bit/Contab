import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { supabase } from '@/lib/supabase-db';

// GET: list compensations for a tenant
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenantId');

    let query = supabaseAdmin
      .from('TenantCompensation')
      .select('*')
      .order('createdat', { ascending: false });

    if (tenantId) {
      query = query.eq('tenantid', tenantId);
    }

    const { data, error } = await query;
    if (error) {
      // Table doesn't exist yet - return empty
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        return NextResponse.json({ success: true, compensations: [] });
      }
      throw error;
    }

    return NextResponse.json({ success: true, compensations: data || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: create compensation
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await req.json();
    const { tenantId, type, days, amount, description, reason, selectedPlanCode } = body;

    if (!tenantId || !type || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const compensation: Record<string, any> = {
      tenantid: tenantId,
      type,
      days: days || 0,
      amount: amount || 0,
      description,
      reason: reason || '',
      createdby: userId,
      createdat: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from('TenantCompensation')
      .insert(compensation)
      .select()
      .single();

    if (error) {
      // If table doesn't exist or missing columns, try to create/alter
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        const createSql = `
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
            updatedat TIMESTAMPTZ DEFAULT NOW(),
            used BOOLEAN DEFAULT FALSE,
            usedat TIMESTAMPTZ
          );
          CREATE INDEX IF NOT EXISTS idx_compensation_tenant ON "TenantCompensation"(tenantid);
        `;
        await supabase.rpc('exec_sql' as any, { sql: createSql }).catch(() => {});

        // Retry insert
        const { data: retryData, error: retryError } = await supabaseAdmin
          .from('TenantCompensation')
          .insert(compensation)
          .select()
          .single();

        if (retryError) {
          return NextResponse.json({
            error: `No se pudo crear la tabla automáticamente. Ejecuta este SQL en Supabase:\n\n${createSql}`,
          }, { status: 500 });
        }
        return NextResponse.json({ success: true, compensation: retryData });
      }

      // Missing columns 'used'/'usedat' - retry without them
      if (error.message?.includes('used') || error.message?.includes('column')) {
        delete compensation.used;
        delete compensation.usedat;
        const { data: retryData, error: retryError } = await supabaseAdmin
          .from('TenantCompensation')
          .insert(compensation)
          .select()
          .single();
        if (retryError) throw retryError;
        return NextResponse.json({ success: true, compensation: retryData });
      }

      throw error;
    }

    // If changing plan, update the tenant's subscription
    if (type === 'CHANGE_PLAN' && selectedPlanCode) {
      const { data: plan, error: planError } = await supabase
        .from('Plan')
        .select('code, price')
        .eq('code', selectedPlanCode)
        .single();

      if (!planError && plan) {
        const updateData: Record<string, any> = {
          subscriptionplan: plan.code,
          monthlycost: plan.price,
        };

        // Try to update extra fields if they exist on the Plan
        if (plan.max_users !== undefined) updateData.maxusers = plan.max_users;
        if (plan.max_storage !== undefined) updateData.maxstorage = plan.max_storage;
        if (plan.max_transactions !== undefined) updateData.maxtransactions = plan.max_transactions;

        const { error: updateError } = await supabaseAdmin
          .from('Tenant')
          .update(updateData)
          .eq('id', tenantId);

        if (updateError) {
          console.error('Error updating tenant plan:', updateError);
        }
      }
    }

    return NextResponse.json({ success: true, compensation: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: remove compensation
export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const { error } = await supabaseAdmin
      .from('TenantCompensation')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
