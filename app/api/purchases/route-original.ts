import { getSupabaseServer } from '@/lib/supabase/server-lazy';
import { NextResponse } from 'next/server';
import { contextoDeEmpresa } from '@/lib/tenant-resolver';
import { filtroEmpresaOCompany } from '@/lib/company-scope';


const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;


// GET - List purchases
export async function GET(request: Request) {
  try {
    // Validate enterprise context - requires company_id for proper isolation
    const empresa = await contextoDeEmpresa(request);

    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get('supplierId');

    // Build the query with enterprise isolation
    let query = getSupabaseServer()
      .from('Purchase')
      .select(`
        *,
        Supplier:supplier_id(id, name, rtn)
      `)
      .eq('tenant_id', empresa.tenantId)
      .match(filtroEmpresaOCompany(empresa));

    if (supplierId) {
      query = query.eq('supplier_id', supplierId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Failed to fetch purchases' }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error fetching purchases:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new purchase
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate enterprise context - requires company_id for proper isolation
    const empresa = await contextoDeEmpresa(request);

    // ... rest of the POST handler would use empresa.companyId
    // for all database operations to ensure enterprise isolation

    return NextResponse.json({ message: 'Post handler needs enterprise isolation implementation' });
  } catch (error) {
    console.error('Error creating purchase:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}