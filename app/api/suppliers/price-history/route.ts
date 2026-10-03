import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server-lazy';
import { exigirEmpresa, idsDeEstaEmpresa, idValidoDe } from '@/lib/purchase-db';
import { contextoDeEmpresa, respuestaDeErrorDeEmpresa } from '@/lib/tenant-resolver';

const PRICE_COLUMNS = [
  'supplier_id',
  'product_id',
  'price',
  'currency',
  'effective_date',
  'expiry_date',
  'notes',
];

function buildInsert(body: any, empresa: { tenantId: string; companyId: string }) {
  const row: any = {
    tenant_id: empresa.tenantId,
    company_id: empresa.companyId,
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
    const empresa = exigirEmpresa(await contextoDeEmpresa(request));
    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get('supplierId');
    const productId = searchParams.get('productId');
    const search = searchParams.get('search');

    let query = getSupabaseServer()
      .from('supplier_price_history')
      .select('*, supplier:Supplier(id, name, rtn)')
      .eq('company_id', empresa.companyId);

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
    const r = respuestaDeErrorDeEmpresa(error);
    if (r) return r;
    console.error('Error fetching price history:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const empresa = exigirEmpresa(await contextoDeEmpresa(request));
    const body = await request.json();

if (!body.supplier_id || body.price === undefined) {
      return NextResponse.json({ error: 'supplier_id y price son requeridos' }, { status: 400 });
    }

    // El proveedor y el producto tienen que ser de ESTA empresa. Sin esto la
    // fila queda con `company_id` de aqui pero apuntando a un proveedor ajeno:
    // el GET de esta misma ruta la devuelve y filtra por `supplier_id`.
    const supabase = getSupabaseServer();
    const proveedores = await idsDeEstaEmpresa(supabase, empresa, 'Supplier', [body.supplier_id]);
    const productos = await idsDeEstaEmpresa(supabase, empresa, 'product', [body.product_id]);

    const row = buildInsert(body, empresa);
    row.supplier_id = idValidoDe(proveedores, body.supplier_id);
    if (body.product_id !== undefined) {
      row.product_id = idValidoDe(productos, body.product_id);
    }

    if (!row.supplier_id) {
      return NextResponse.json(
        { error: 'El proveedor no pertenece a la empresa activa.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('supplier_price_history')
      .insert(row)
      .select()
      .single();

    if (error) {
      console.error('Error creating price history:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    const r = respuestaDeErrorDeEmpresa(error);
    if (r) return r;
    console.error('Error creating price history:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const empresa = exigirEmpresa(await contextoDeEmpresa(request));
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

    // Mismas referencias que en el POST: no se puede repuntar una fila propia
    // hacia el proveedor o el producto de otra empresa.
    if (supplier_id) {
      const proveedores = await idsDeEstaEmpresa(getSupabaseServer(), empresa, 'Supplier', [supplier_id]);
      if (!idValidoDe(proveedores, supplier_id)) {
        return NextResponse.json(
          { error: 'El proveedor no pertenece a la empresa activa.' },
          { status: 400 }
        );
      }
      updates.supplier_id = supplier_id;
    }
    if (body.product_id !== undefined && body.product_id !== null) {
      const productos = await idsDeEstaEmpresa(getSupabaseServer(), empresa, 'product', [body.product_id]);
      updates.product_id = idValidoDe(productos, body.product_id);
    }

    const { data, error } = await getSupabaseServer()
      .from('supplier_price_history')
      .update(updates)
      .eq('id', id)
      .eq('company_id', empresa.companyId)
      .select()
      .single();

    if (error) {
      console.error('Error updating price history:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    const r = respuestaDeErrorDeEmpresa(error);
    if (r) return r;
    console.error('Error updating price history:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const empresa = exigirEmpresa(await contextoDeEmpresa(request));
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id requerido' }, { status: 400 });
    }

    const { error } = await getSupabaseServer()
      .from('supplier_price_history')
      .delete()
      .eq('id', id)
      .eq('company_id', empresa.companyId);

    if (error) {
      console.error('Error deleting price history:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const r = respuestaDeErrorDeEmpresa(error);
    if (r) return r;
    console.error('Error deleting price history:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}