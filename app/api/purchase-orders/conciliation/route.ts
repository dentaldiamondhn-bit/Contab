import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server-lazy';
import { conciliarOrden, fetchPurchaseOrders, type ConciliacionLinea } from '@/lib/purchase-orders-db';
import { contextoDeEmpresa, respuestaDeErrorDeEmpresa } from '@/lib/tenant-resolver';
import { exigirEmpresa } from '@/lib/purchase-db';

interface ResumenConciliacion {
  order: any;
  totals: { ordered: number; received: number; invoiced: number };
  hayDiscrepancias: boolean;
  lineasConProblema: ConciliacionLinea[];
}

/**
 * Reporte de conciliación 3 vías (O.C. → Recepción → Factura), solo lectura: no
 * bloquea nada. La empresa sale del contexto validado, igual que el resto del
 * módulo (`company_id`, nunca `tenant_id`).
 *
 *  - `?orderId=<id>`: detalle de UNA orden (404 si es de otra empresa).
 *  - Sin `orderId`: lista de todas las órdenes de la empresa con su resumen de
 *    conciliación (para la pantalla de alertas). `?soloConDiscrepancias=1`
 *    devuelve solo las que tienen algo que revisar.
 *
 * `?tolerancia=` (cantidades) y `?toleranciaPrecio=` (precios) relajan la
 * comparación; por defecto 0 cantidades y 0.01 precios.
 */
function opciones(searchParams: URLSearchParams) {
  const num = (clave: string): number | undefined => {
    const v = searchParams.get(clave);
    if (v === null || v === '') return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };
  return { tolerancia: num('tolerancia'), toleranciaPrecio: num('toleranciaPrecio') };
}

export async function GET(request: Request) {
  try {
    const empresa = exigirEmpresa(await contextoDeEmpresa(request));
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    const supabase = getSupabaseServer();

    if (orderId) {
      const { data, error, notFound } = await conciliarOrden(supabase, empresa, orderId, opciones(searchParams));
      if (error) {
        console.error('Supabase error reconciling purchase order:', error);
        return NextResponse.json({ error: 'Failed to reconcile purchase order' }, { status: 500 });
      }
      if (notFound || !data) {
        return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 });
      }
      return NextResponse.json(data);
    }

    const { data: ordenes, error } = await fetchPurchaseOrders(supabase, empresa, {});
    if (error) {
      console.error('Supabase error listing purchase orders for reconciliation:', error);
      return NextResponse.json({ error: 'Failed to reconcile purchase orders' }, { status: 500 });
    }

    const filas: ResumenConciliacion[] = [];
    for (const o of ordenes || []) {
      const { data } = await conciliarOrden(supabase, empresa, o.id, opciones(searchParams));
      if (!data) continue;
      filas.push({
        order: data.order,
        totals: data.totals,
        hayDiscrepancias: data.hayDiscrepancias,
        lineasConProblema: data.lines.filter((l) => l.estado !== 'OK'),
      });
    }

    const resultado =
      searchParams.get('soloConDiscrepancias') === '1'
        ? filas.filter((x) => x.hayDiscrepancias)
        : filas;

    return NextResponse.json(resultado);
  } catch (error) {
    const r = respuestaDeErrorDeEmpresa(error);
    if (r) return r;
    console.error('Error reconciling purchase orders:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
