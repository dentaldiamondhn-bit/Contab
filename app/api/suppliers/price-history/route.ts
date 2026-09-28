import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server-lazy';
import { TENANT_ID } from '@/lib/purchase-db';

const PRICE_COLUMNS = [
  'supplier_id',
  'product_id',
  'price',
  'currency',
  'effective_date',
  'expiry_date',
  'notes',
];

function buildInsert(body: any) {
  const row: any = {
    tenant_id: TENANT_ID,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  for (const col of PRICE_COLUMNS) {
    if (body[col] !== undefined) row[col] = body[col];
  }

  if (!row.effective_date) row.effective_date = new Date().toISOString();
  if (!row.currency) row.currency = 'HNL';

  return row;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get('supplierId');
    const productId = searchParams.get('productId');
    const search = searchParams.get('search');

    let query = getSupabaseServer()
      .from('supplier_price_history')
      .select('*, supplier:Supplier(id, name, rtn)')
      .eq('tenant_id', TENANT_ID);

    if (supplierId) {
      query = query.eq('supplier_id', supplierId);
    }
    if (productId) {
      query = query.eq('product_id', productId);
    }

    const { data, error } = await query.order('effective_date', { ascending: false });

    if (error) {
      console.error('Error fetching price history:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let rows = data || [];
    if (search) {
      const term = search.toLowerCase();
      rows = rows.filter((r: any) => {
        const supplierName = String(r.supplier?.name || '').toLowerCase();
        const notes = String(r.notes || '').toLowerCase();
        const price = String(r.price || '');
        return supplierName.includes(term) || notes.includes(term) || price.includes(term);
      });
    }

    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching price history:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.supplier_id || body.price === undefined) {
      return NextResponse.json({ error: 'supplier_id y price son requeridos' }, { status: 400 });
    }

    const { data, error } = await getSupabaseServer()
      .from('supplier_price_history')
      .insert(buildInsert(body))
      .select()
      .single();

    if (error) {
      console.error('Error creating price history:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating price history:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, supplier_id, ...rest } = body;
    if (!id) {
      return NextResponse.json({ error: 'id requerido' }, { status: 400 });
    }

    const updates: any = {};
    for (const col of PRICE_COLUMNS) {
      if (body[col] !== undefined) updates[col] = body[col];
    }
    updates.updated_at = new Date().toISOString();

    if (supplier_id) updates.supplier_id = supplier_id;

    const { data, error } = await getSupabaseServer()
      .from('supplier_price_history')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating price history:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating price history:', error);
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

    const { error } = await getSupabaseServer().from('supplier_price_history').delete().eq('id', id);

    if (error) {
      console.error('Error deleting price history:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting price history:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}