import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server-lazy';
import { recibirPurchaseOrder } from '@/lib/purchase-orders-db';
import { contextoDeEmpresa, respuestaDeErrorDeEmpresa } from '@/lib/tenant-resolver';
import { exigirEmpresa } from '@/lib/purchase-db';

/**
 * Flujo O.C. → Compra (8 Oct 2026). Antes "Recibir" solo ponía
 * `status='RECEIVED'` con un PATCH y dejaba la factura para otro módulo, sin
 * enlace. Este endpoint resuelve la orden de la empresa validada, crea la
 * compra real (mismos efectos que `/api/purchases`: ítems, stock, historial y
 * asiento) y cuelga `PurchaseOrder.purchase_id`.
 */
export async function POST(request: Request) {
  try {
    const empresa = exigirEmpresa(await contextoDeEmpresa(request));
    const body = await request.json();

    const { data, error, notFound } = await recibirPurchaseOrder(getSupabaseServer(), empresa, body);

    if (error) {
      console.error('Supabase error receiving purchase order:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (notFound) {
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    const r = respuestaDeErrorDeEmpresa(error);
    if (r) return r;
    console.error('Error receiving purchase order:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}