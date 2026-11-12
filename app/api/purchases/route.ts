import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server-lazy';
import { exigirEmpresa, fetchPurchases, createPurchase, updatePurchase, deletePurchase } from '@/lib/purchase-db';
import { contextoDeEmpresa, respuestaDeErrorDeEmpresa } from '@/lib/tenant-resolver';

/**
 * Antes esta ruta no tomaba contexto de empresa: `fetchPurchases` filtraba por un
 * `TENANT_ID = '1'` fijo, asi que las compras de Empresa 1 salian a cualquier
 * usuario. Y el POST confiaba en el `companyId` del cuerpo. Ahora la empresa la
 * decide `contextoDeEmpresa`, que la valida contra la membresia.
 *
 * El `?companyId` del cliente ya NO se lee: no hace falta (el contexto ya sabe la
 * empresa) y aceptarlo sin validar era justamente el agujero. El `companyId` de la
 * URL `/companies/[id]/...` manda sobre el header, asi que la pagina sigue
 * funcionando igual.
 */
export async function GET(request: Request) {
  try {
    const empresa = exigirEmpresa(await contextoDeEmpresa(request));
    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get('supplierId');
    const search = searchParams.get('search');

    const { data, error } = await fetchPurchases(getSupabaseServer(), empresa, { supplierId, search });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Failed to fetch purchases' }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    const r = respuestaDeErrorDeEmpresa(error);
    if (r) return r;
    console.error('Error fetching purchases:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const empresa = exigirEmpresa(await contextoDeEmpresa(request));
    const body = await request.json();

    const { data, error } = await createPurchase(getSupabaseServer(), empresa, body);

    if (error) {
      console.error('Supabase error creating purchase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    const r = respuestaDeErrorDeEmpresa(error);
    if (r) return r;
    console.error('Error creating purchase:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const empresa = exigirEmpresa(await contextoDeEmpresa(request));
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const body = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const { data, error, notFound } = await updatePurchase(getSupabaseServer(), empresa, id, body);

    if (error) {
      console.error('Supabase error updating purchase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (notFound || !data) {
      // 404 y no 403 a proposito: no se le confirma a un usuario que la compra
      // existe pero es de otra empresa.
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

export async function DELETE(request: Request) {
  try {
    const empresa = exigirEmpresa(await contextoDeEmpresa(request));
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

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