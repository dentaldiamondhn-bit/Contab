import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server-lazy';
import { exigirEmpresa } from '@/lib/purchase-db';
import { contextoDeEmpresa, respuestaDeErrorDeEmpresa } from '@/lib/tenant-resolver';

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

/**
 * La empresa la decide SIEMPRE el contexto. Se eliminaron los tres caminos por los
 * que la fila acababa en la empresa equivocada:
 *
 * 1. `buildInsert` fijaba `tenant_id` a un `'1'` y tomaba `company_id` del cuerpo
 *    sin comprobar nada, asi que un POST escribia el proveedor donde dijera el
 *    cliente.
 * 2. El GET aceptaba `?tenantId` **como si fuera `company_id`**: son columnas de
 *    convenciones distintas (`"1"` vs `73d5bbf7-...`). Cuando no venia ninguno de
 *    los dos, no ponia filtro de empresa y devolvia los proveedores de todas.
 * 3. PATCH y DELETE filtraban solo por `.eq('id', id)`.
 */
function buildInsert(body: any, empresa: { tenantId: string; companyId: string }) {
  const row: any = {
    tenant_id: empresa.tenantId,
    company_id: empresa.companyId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  for (const col of SUPPLIER_COLUMNS) {
    if (body[col] !== undefined) row[col] = body[col];
  }

  if (row.is_active === undefined) row.is_active = true;

  return row;
}

export async function GET(request: Request) {
  try {
    const empresa = exigirEmpresa(await contextoDeEmpresa(request));
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    let query = getSupabaseServer()
      .from('Supplier')
      .select('*')
      .eq('company_id', empresa.companyId);

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
    const r = respuestaDeErrorDeEmpresa(error);
    if (r) return r;
    console.error('Error fetching suppliers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const empresa = exigirEmpresa(await contextoDeEmpresa(request));
    const body = await request.json();

    const { data, error } = await getSupabaseServer()
      .from('Supplier')
      .insert(buildInsert(body, empresa))
      .select()
      .single();

    if (error) {
      console.error('Error creating supplier:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    const r = respuestaDeErrorDeEmpresa(error);
    if (r) return r;
    console.error('Error creating supplier:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const empresa = exigirEmpresa(await contextoDeEmpresa(request));
    const body = await request.json();
    const { id } = body;
    if (!id) {
      return NextResponse.json({ error: 'id requerido' }, { status: 400 });
    }

    const supabase = getSupabaseServer();

    // Comprobar pertenencia ANTES de escribir: con solo `.eq('company_id')` en el
    // UPDATE, un id ajeno no encontraria fila y devolveria 0 afectadas, pero un
    // cliente que reintentara sin ese chequeo veria como un "exito" silencioso.
    const { data: actual } = await supabase
      .from('Supplier')
      .select('id')
      .eq('id', id)
      .eq('company_id', empresa.companyId)
      .maybeSingle();
    if (!actual) {
      return NextResponse.json({ error: 'Proveedor no encontrado' }, { status: 404 });
    }

    const updates: any = {};
    for (const col of SUPPLIER_COLUMNS) {
      if (body[col] !== undefined) updates[col] = body[col];
    }
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('Supplier')
      .update(updates)
      .eq('id', id)
      .eq('company_id', empresa.companyId)
      .select()
      .single();

    if (error) {
      console.error('Error updating supplier:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    const r = respuestaDeErrorDeEmpresa(error);
    if (r) return r;
    console.error('Error updating supplier:', error);
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

    const supabase = getSupabaseServer();

    const { data: actual } = await supabase
      .from('Supplier')
      .select('id')
      .eq('id', id)
      .eq('company_id', empresa.companyId)
      .maybeSingle();
    if (!actual) {
      return NextResponse.json({ error: 'Proveedor no encontrado' }, { status: 404 });
    }

    const { error } = await supabase
      .from('Supplier')
      .delete()
      .eq('id', id)
      .eq('company_id', empresa.companyId);

    if (error) {
      console.error('Error deleting supplier:', error);
      // Antes TODO error devolvia este mensaje, asi que un fallo de red o de
      // permisos se reportaba como "tiene compras asociadas".
      return NextResponse.json(
        { error: 'No se puede eliminar: tiene compras o pagos asociados', detail: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const r = respuestaDeErrorDeEmpresa(error);
    if (r) return r;
    console.error('Error deleting supplier:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}