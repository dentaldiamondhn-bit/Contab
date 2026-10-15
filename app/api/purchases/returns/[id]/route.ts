import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server-lazy';
import { exigirEmpresa } from '@/lib/purchase-db';
import { fetchPurchaseReturn, deletePurchaseReturn } from '@/lib/purchase-returns-db';
import { contextoDeEmpresa, respuestaDeErrorDeEmpresa } from '@/lib/tenant-resolver';

/**
 * El `[id]` de ESTA ruta es el id de la devolucion, no el de la empresa, asi que
 * la empresa sale del contexto. Todas las operaciones filtran por `company_id`:
 * un id ajeno solo da 404, nunca toca la fila de otra empresa.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const empresa = exigirEmpresa(await contextoDeEmpresa(request));
    const { id } = await params;

    const { data, error, notFound } = await fetchPurchaseReturn(getSupabaseServer(), empresa, id);

    if (error) {
      console.error('Supabase error fetching purchase return:', error);
      return NextResponse.json({ error: 'Failed to fetch purchase return' }, { status: 500 });
    }
    if (notFound || !data) {
      return NextResponse.json({ error: 'Purchase return not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    const r = respuestaDeErrorDeEmpresa(error);
    if (r) return r;
    console.error('Error fetching purchase return:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const empresa = exigirEmpresa(await contextoDeEmpresa(request));
    const { id } = await params;

    const { error, notFound } = await deletePurchaseReturn(getSupabaseServer(), empresa, id);

    if (error) {
      console.error('Supabase error deleting purchase return:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (notFound) {
      return NextResponse.json({ error: 'Purchase return not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const r = respuestaDeErrorDeEmpresa(error);
    if (r) return r;
    console.error('Error deleting purchase return:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
