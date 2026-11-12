import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server-lazy';
import { exigirEmpresa, updatePurchase, deletePurchase } from '@/lib/purchase-db';
import { contextoDeEmpresa, respuestaDeErrorDeEmpresa } from '@/lib/tenant-resolver';

/**
 * El `[id]` de ESTA ruta es el id de la compra, no el de la empresa, asi que no se
 * puede pasar como `companyIdDeRuta`: la empresa sale del contexto. Antes no
 * habia ninguno y `updatePurchase`/`deletePurchase` hacian `.eq('id', id)` a
 * secas, o sea que editar o borrar una compra de otra empresa era cuestión de
 * conocer el UUID.
 */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const empresa = exigirEmpresa(await contextoDeEmpresa(request));
    const { id } = await params;
    const body = await request.json();

    const { data, error, notFound } = await updatePurchase(getSupabaseServer(), empresa, id, body);

    if (error) {
      console.error('Supabase error updating purchase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (notFound || !data) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    const r = respuestaDeErrorDeEmpresa(error);
    if (r) return r;
    console.error('Error updating purchase:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const empresa = exigirEmpresa(await contextoDeEmpresa(request));
    const { id } = await params;

    const { error, notFound } = await deletePurchase(getSupabaseServer(), empresa, id);

    if (error) {
      console.error('Supabase error deleting purchase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (notFound) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const r = respuestaDeErrorDeEmpresa(error);
    if (r) return r;
    console.error('Error deleting purchase:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}