import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server-lazy';
import { exigirEmpresa } from '@/lib/purchase-db';
import { fetchPurchaseReturns, createPurchaseReturn } from '@/lib/purchase-returns-db';
import { contextoDeEmpresa, respuestaDeErrorDeEmpresa } from '@/lib/tenant-resolver';

/**
 * Devoluciones a proveedores. Mismo contrato que `/api/purchases`: la empresa la
 * decide `contextoDeEmpresa` (validada contra la membresia), nunca el cuerpo ni
 * un `?companyId` sin comprobar. El `[id]` de `/companies/[id]/...` manda sobre
 * el header, asi que la pagina sigue funcionando igual.
 */
export async function GET(request: Request) {
  try {
    const empresa = exigirEmpresa(await contextoDeEmpresa(request));
    const { searchParams } = new URL(request.url);
    const purchaseId = searchParams.get('purchaseId');
    const supplierId = searchParams.get('supplierId');
    const search = searchParams.get('search');

    const { data, error } = await fetchPurchaseReturns(getSupabaseServer(), empresa, { purchaseId, supplierId, search });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Failed to fetch purchase returns' }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    const r = respuestaDeErrorDeEmpresa(error);
    if (r) return r;
    console.error('Error fetching purchase returns:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const empresa = exigirEmpresa(await contextoDeEmpresa(request));
    const body = await request.json();

    const { data, error, notFound } = await createPurchaseReturn(getSupabaseServer(), empresa, body);

    if (error) {
      console.error('Supabase error creating purchase return:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (notFound || !data) {
      // 404 y no 403: no se le confirma a un usuario que la compra existe pero
      // es de otra empresa.
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    const r = respuestaDeErrorDeEmpresa(error);
    if (r) return r;
    console.error('Error creating purchase return:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
