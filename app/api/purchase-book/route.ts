import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const tenantId = '1';

    // Build the query
    let query = supabase
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
      .eq('tenant_id', tenantId)
      .neq('status', 'CANCELLED')
      .order('invoice_date', { ascending: true });

    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    // Filter by month and year if provided
    if (month && year) {
      const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
      const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];
      query = query.gte('invoice_date', startDate).lte('invoice_date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Failed to fetch purchase book' }, { status: 500 });
    }

    // Transform data to match the expected format
    const entries = (data || []).map((purchase: any) => ({
      id: purchase.id,
      invoice_date: purchase.invoice_date,
      invoice_number: purchase.invoice_number,
      supplier_rtn: purchase.Supplier?.rtn || '',
      supplier_name: purchase.Supplier?.name || 'Desconocido',
      cai: purchase.cai || '',
      net_value: purchase.subtotal || 0,
      tax_value: purchase.tax_amount || 0,
      total_value: purchase.total || 0,
      purchase_type: purchase.purchase_type || 'expense',
      expense_category: purchase.expense_category || '',
    }));

    return NextResponse.json(entries);
  } catch (error) {
    console.error('Error fetching purchase book:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
