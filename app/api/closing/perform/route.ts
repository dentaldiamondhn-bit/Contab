import { NextResponse } from 'next/server';
import { performYearEndClosing } from '@/app/services/closing';
import { db } from '@/lib/db';
import { getSupabaseServer } from '@/lib/supabase/server-lazy';
import { assertYearOpen } from '@/lib/services/period-lock';

// @deprecated — punto único es /api/accounting/period-closing (mensual) + anual via month=0.
// Este handler mantiene compatibilidad y delega al candado unificado (period_locks).

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { year, equityAccountId, closedBy } = body;

    if (!year || !equityAccountId || !closedBy) {
      return NextResponse.json({ 
        error: 'Missing required fields: year, equityAccountId, closedBy' 
      }, { status: 400 });
    }

    // Validate year is reasonable
    const currentYear = new Date().getFullYear();
    if (year < 2000 || year > currentYear + 1) {
      return NextResponse.json({ 
        error: 'Invalid year provided' 
      }, { status: 400 });
    }

    // Candado unificado: si el año ya está cerrado (month=0), rechaza
    try {
      const supabase = getSupabaseServer();
      // Intenta inferir tenant del equityAccount o del body si viene
      const tenantId = (await db.account.findUnique({ where: { id: equityAccountId } }))?.tenantId || 'unknown';
      if (tenantId !== 'unknown') await assertYearOpen(supabase as any, String(tenantId), year);
    } catch (e) {
      if (e instanceof Error && /cerrado|bloqueado/.test(e.message)) {
        return NextResponse.json({ error: e.message }, { status: 403 });
      }
    }

    // Perform the year-end closing (legacy) + marca anual en period_locks para el Wizard unificado
    const closingTransaction = await performYearEndClosing(year, equityAccountId, closedBy);
    try {
      const supabase = getSupabaseServer();
      const tenantId2 = (await db.account.findUnique({ where: { id: equityAccountId } }))?.tenantId;
      if (tenantId2) {
        await (supabase as any).from('period_locks').upsert({
          tenant_id: String(tenantId2),
          year,
          month: 0,
          status: 'closed',
          closed_by: closedBy,
          closed_at: new Date().toISOString(),
          notes: `Cierre anual ${year} (via /api/closing/perform)`,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'tenant_id,year,month' });
      }
    } catch {}

    return NextResponse.json({
      success: true,
      message: `Year-end closing for ${year} completed successfully`,
      closingTransaction,
      unified: { annualPeriod: `${year}-00` }
    });

  } catch (error) {
    console.error('Error performing year-end closing:', error);
    
    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('Period was closed')) {
        return NextResponse.json({ 
          error: 'Cannot close books: period is already locked' 
        }, { status: 403 });
      }
      
      if (error.message.includes('already been performed')) {
        return NextResponse.json({ 
          error: error.message 
        }, { status: 409 }); // Conflict
      }
      
      if (error.message.includes('P&L validation failed')) {
        return NextResponse.json({ 
          error: error.message,
          type: 'VALIDATION_ERROR'
        }, { status: 400 });
      }
      
      if (error.message.includes('Internal validation error')) {
        return NextResponse.json({ 
          error: 'Internal validation error. Please contact support.',
          type: 'INTERNAL_ERROR'
        }, { status: 500 });
      }
    }

    return NextResponse.json({ 
      error: 'Failed to perform year-end closing' 
    }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    
    if (!year) {
      return NextResponse.json({ error: 'Year parameter is required' }, { status: 400 });
    }

    // Check if the year is already closed
    const closingRecord = await (db as any).bookClosing?.findFirst({
      where: {
        period: year,
        periodType: 'YEARLY'
      }
    });

    const globalSettings = await (db as any).globalSettings?.findFirst();
    const lastClosedDate = globalSettings?.lastClosedDate;

    return NextResponse.json({
      year,
      isClosed: !!closingRecord,
      closedAt: closingRecord?.closedAt,
      closedBy: closingRecord?.closedBy,
      lastClosedDate
    });

  } catch (error) {
    console.error('Error checking closing status:', error);
    return NextResponse.json({ error: 'Failed to check closing status' }, { status: 500 });
  }
}
