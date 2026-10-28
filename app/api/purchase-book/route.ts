import { getSupabaseServer } from '@/lib/supabase/server-lazy';
import { NextResponse } from 'next/server';
import { contextoDeEmpresa } from '@/lib/tenant-resolver';
import { filtroEmpresaOCompany } from '@/lib/company-scope';


const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;


export async function GET(request: Request) {
  try {
    // Validate enterprise context - requires company_id for proper isolation
    const empresa = await contextoDeEmpresa(request);

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    // Build the query with enterprise isolation
    let query = getSupabaseServer()
      .from('Purchase')
      .select(`
        id,
        invoice_date,
        invoice_number,
        cai,
        subtotal,
        tax_amount,
        total,
        purchase_type,
        expense_category,
        Supplier:supplier_id(id, name, rtn)
      `)
      .eq('tenant_id', empresa.tenantId)
      .match(filtroEmpresaOCompany(empresa));

    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    // Filter by status - not CANCELLED
    query = query.neq('status', 'CANCELLED');

    // Filter by month and year if provided
    if (month && year) {
      const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
      const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];
      query = query.gte('invoice_date', startDate).lte('invoice_date', endDate);
    }

    query = query.order('invoice_date', { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Failed to fetch purchase book' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching purchase book:', error);
    return NextResponse.json(
      { error: 'Failed to fetch purchase book' },
      { status: 500 }
    );
  }
}