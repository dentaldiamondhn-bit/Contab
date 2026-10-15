import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server-lazy';
import {
  fetchPurchaseOrders,
  createPurchaseOrder,
  updatePurchaseOrder,
  deletePurchaseOrder,
} from '@/lib/purchase-orders-db';
import { contextoDeEmpresa, respuestaDeErrorDeEmpresa } from '@/lib/tenant-resolver';
import { exigirEmpresa } from '@/lib/purchase-db';

/**
 * Antes esta ruta iba clavada en `tenantId = '1'`: las O.C. se creaban siempre
 * para la Empresa 1 y el `?companyId` del cliente valía como filtro, o sea que
 * cualquier usuario podía pedir las de otra empresa y editarlas/borrarlas por
 * solo `id` (IDOR). Ahora la empresa sale de `contextoDeEmpresa` (validada
 * contra la membresía) igual que en el módulo de Compras; el `?companyId` del
 * cliente ya no se lee, como en `/api/purchases`.
 */
export async function GET(request: Request) {
  try {
    const empresa = exigirEmpresa(await contextoDeEmpresa(request));
    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get('supplierId');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const { data, error } = await fetchPurchaseOrders(getSupabaseServer(), empresa, { supplierId, status, search });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Failed to fetch purchase orders' }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    const r = respuestaDeErrorDeEmpresa(error);
    if (r) return r;
    console.error('Error fetching purchase orders:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const empresa = exigirEmpresa(await contextoDeEmpresa(request));
    const body = await request.json();

    const { data, error } = await createPurchaseOrder(getSupabaseServer(), empresa, body);

    if (error) {
      console.error('Supabase error creating purchase order:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    const r = respuestaDeErrorDeEmpresa(error);
    if (r) return r;
    console.error('Error creating purchase order:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const empresa = exigirEmpresa(await contextoDeEmpresa(request));
    const body = await request.json();

    if (!body?.id) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    const { data, error, notFound } = await updatePurchaseOrder(getSupabaseServer(), empresa, body.id, body);

    if (error) {
      console.error('Supabase error updating purchase order:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (notFound || !data) {
      // 404 y no 403 a propósito: no se le confirma a un usuario que la orden
      // existe pero es de otra empresa.
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    const r = respuestaDeErrorDeEmpresa(error);
    if (r) return r;
    console.error('Error updating purchase order:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const empresa = exigirEmpresa(await contextoDeEmpresa(request));
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    const { error, notFound } = await deletePurchaseOrder(getSupabaseServer(), empresa, id);

    if (error) {
      console.error('Supabase error deleting purchase order:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (notFound) {
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const r = respuestaDeErrorDeEmpresa(error);
    if (r) return r;
    console.error('Error deleting purchase order:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}