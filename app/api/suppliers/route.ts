import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server-lazy';
import { TENANT_ID } from '@/lib/purchase-db';

const SUPPLIER_COLUMNS = [
  'rtn',
  'name',
  'commercial_name',
  'email',
  'phone',
  'mobile',
  'address',
  'city',
  'country',
  'supplier_type',
  'category',
  'payment_terms',
  'payment_method',
  'bank_name',
  'bank_account',
  'account_type',
  'is_active',
  'is_preferred',
];

function buildInsert(body: any) {
  const row: any = {
    tenant_id: TENANT_ID,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  for (const col of SUPPLIER_COLUMNS) {
    if (body[col] !== undefined) row[col] = body[col];
  }

  if (body.companyId) row.company_id = body.companyId;
  else if (body.company_id) row.company_id = body.company_id;

  if (row.is_active === undefined) row.is_active = true;

  return row;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId') || searchParams.get('tenantId');
    const search = searchParams.get('search');

    let query = getSupabaseServer()
      .from('Supplier')
      .select('*')
      .eq('tenant_id', TENANT_ID);

    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    if (search) {
      const term = search.toLowerCase();
      query = query.or(`name.ilike.%${term}%,rtn.ilike.%${term}%,commercial_name.ilike.%${term}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching suppliers:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { data, error } = await getSupabaseServer()
      .from('Supplier')
      .insert(buildInsert(body))
      .select()
      .single();

    if (error) {
      console.error('Error creating supplier:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating supplier:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id } = body;
    if (!id) {
      return NextResponse.json({ error: 'id requerido' }, { status: 400 });
    }

    const updates: any = {};
    for (const col of SUPPLIER_COLUMNS) {
      if (body[col] !== undefined) updates[col] = body[col];
    }
    updates.updated_at = new Date().toISOString();

    const { data, error } = await getSupabaseServer()
      .from('Supplier')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating supplier:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating supplier:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id requerido' }, { status: 400 });
    }

    const { error } = await getSupabaseServer().from('Supplier').delete().eq('id', id);

    if (error) {
      console.error('Error deleting supplier:', error);
      return NextResponse.json({ error: 'No se puede eliminar: tiene compras o pagos asociados' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting supplier:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}