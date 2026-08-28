import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenantId');
    const table = searchParams.get('table') || 'all';

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId requerido' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // Verify tenant exists
    const { data: tenant } = await supabase
      .from('Tenant')
      .select('id, businessname, business_name, tenant_code')
      .eq('id', tenantId)
      .single();

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 404 });
    }

    const tenantName = tenant.businessname || tenant.business_name || tenant.tenant_code;

    // Tables relevant to a tenant's accounting data
    const tablesToQuery = table === 'all'
      ? ['Account', 'JournalEntry', 'Transaction', 'Invoice', 'invoice', 'invoiceitem', 'InvoiceItem', 'customer', 'product', 'warehouse', 'inventory_movement', 'bankaccount', 'cai', 'talonarios', 'chart_of_accounts', 'User', 'users']
      : [table];

    const results: Record<string, any> = {};

    for (const tbl of tablesToQuery) {
      try {
        // First check if table is accessible at all
        const { error: accessibleError } = await supabase.from(tbl).select('id').limit(0);
        if (accessibleError) {
          results[tbl] = { count: 0, rows: [], error: accessibleError.message };
          continue;
        }

        // Try to find tenant column — check which columns exist
        const possibleColumns = ['tenantid', 'tenant_id', 'companyId', 'company_id'];
        let usedColumn = '';
        let data: any[] = [];
        let count = 0;
        let error: any = null;

        // Try each possible tenant column
        for (const col of possibleColumns) {
          const testResult = await supabase.from(tbl).select('*', { count: 'exact' })
            .eq(col, tenantId)
            .limit(50);
          
          // If no error, this column exists and has data
          if (!testResult.error) {
            data = testResult.data || [];
            count = testResult.count || 0;
            usedColumn = col;
            error = null;
            break;
          }
          
          // If error is about column not existing, try next
          if (testResult.error?.message?.includes('does not exist')) {
            continue;
          }
          
          // If error is something else (like invalid input), also try next
          continue;
        }

        // If no tenant column found, just return all rows (limited)
        if (!usedColumn) {
          const allResult = await supabase.from(tbl).select('*', { count: 'exact' }).limit(50);
          data = allResult.data || [];
          count = allResult.count || 0;
          error = allResult.error;
        }

        if (error) {
          results[tbl] = { count: 0, rows: [], error: error.message };
        } else {
          results[tbl] = { count: count || 0, rows: data || [], filteredBy: usedColumn || null };
        }
      } catch (e: any) {
        results[tbl] = { count: 0, rows: [], error: e.message };
      }
    }

    return NextResponse.json({
      success: true,
      tenant: {
        id: tenant.id,
        name: tenantName,
        code: tenant.tenant_code,
      },
      tables: results,
    });

  } catch (error: any) {
    console.error('Error in tenants-db:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno' },
      { status: 500 }
    );
  }
}
