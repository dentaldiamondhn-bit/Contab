import { NextRequest, NextResponse } from 'next/server';
import { contextoDeEmpresa, respuestaDeErrorDeEmpresa } from '@/lib/tenant-resolver';
import { exigirEmpresa } from '@/lib/purchase-db';
import { getSupabaseServer } from '@/lib/supabase/server-lazy';
import {
  fetchCuentasBancarias,
  fetchPagosParaConciliar,
  resumenConciliacion,
  marcarPagosConciliados,
  desmarcarPagosConciliados,
  normalizarIds,
} from '@/lib/bank-reconciliation-db';

export const dynamic = 'force-dynamic';

/**
 * Conciliacion bancaria de los pagos a proveedores.
 *
 * La empresa sale del contexto validado (`?companyId` o el header de la cookie),
 * NUNCA del cuerpo; y todo se filtra por `company_id`. Ver AGENTS.md seccion 1 y
 * `lib/bank-reconciliation-db.ts`.
 *
 * GET    → { pagos, resumen, cuentas }  (filtra por `?bankAccountId` y `?status`)
 * POST   → marca un lote conciliado   { paymentIds, bankAccountId, date?, reference? }
 * DELETE → quita la conciliacion      (paymentIds por cuerpo o por `?paymentIds=a,b`)
 */
export async function GET(request: NextRequest) {
  try {
    const empresa = exigirEmpresa(await contextoDeEmpresa(request));
    const { searchParams } = new URL(request.url);
    const bankAccountId = searchParams.get('bankAccountId');
    const status = searchParams.get('status') || 'all';

    const supabase = getSupabaseServer();
    const [cuentas, todos] = await Promise.all([
      fetchCuentasBancarias(supabase, empresa),
      fetchPagosParaConciliar(supabase, empresa, { bankAccountId }),
    ]);

    const resumen = resumenConciliacion(todos);
    const pagos =
      status === 'reconciled'
        ? todos.filter((p) => p.is_reconciled)
        : status === 'pending'
          ? todos.filter((p) => !p.is_reconciled)
          : todos;

    return NextResponse.json({ pagos, resumen, cuentas });
  } catch (error) {
    const r = respuestaDeErrorDeEmpresa(error);
    if (r) return r;
    console.error('Error en conciliacion GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const empresa = exigirEmpresa(await contextoDeEmpresa(request));
    const body = await request.json().catch(() => ({}));

    const paymentIds = normalizarIds(body.paymentIds ?? body.payment_ids);
    const bankAccountId = body.bankAccountId ?? body.bank_account_id;

    const supabase = getSupabaseServer();
    const resultado = await marcarPagosConciliados(supabase, empresa, {
      paymentIds,
      bankAccountId,
      date: body.date ?? body.reconciled_at ?? null,
      reference: body.reference ?? null,
    });
    if ('notFound' in resultado) {
      return NextResponse.json(
        { error: 'La cuenta bancaria o alguno de los pagos no pertenece a la empresa activa.' },
        { status: 404 }
      );
    }

    const todos = await fetchPagosParaConciliar(supabase, empresa, { bankAccountId: null });
    return NextResponse.json({ ok: true, actualizados: resultado.actualizados, resumen: resumenConciliacion(todos) });
  } catch (error) {
    const r = respuestaDeErrorDeEmpresa(error);
    if (r) return r;
    console.error('Error en conciliacion POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const empresa = exigirEmpresa(await contextoDeEmpresa(request));
    const { searchParams } = new URL(request.url);

    let paymentIds = normalizarIds(searchParams.get('paymentIds'));
    if (paymentIds.length === 0) {
      const body = await request.json().catch(() => null);
      if (body) paymentIds = normalizarIds(body.paymentIds ?? body.payment_ids);
    }

    const supabase = getSupabaseServer();
    const resultado = await desmarcarPagosConciliados(supabase, empresa, paymentIds);
    if ('notFound' in resultado) {
      return NextResponse.json(
        { error: 'Alguno de los pagos no pertenece a la empresa activa.' },
        { status: 404 }
      );
    }

    const todos = await fetchPagosParaConciliar(supabase, empresa, { bankAccountId: null });
    return NextResponse.json({ ok: true, actualizados: resultado.actualizados, resumen: resumenConciliacion(todos) });
  } catch (error) {
    const r = respuestaDeErrorDeEmpresa(error);
    if (r) return r;
    console.error('Error en conciliacion DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
