import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server-lazy';
import {
  exigirEmpresa,
  aprobarCompra,
  rechazarCompra,
  esAprobadorDeCompras,
  esDuenoDeEmpresa,
} from '@/lib/purchase-db';
import { contextoDeEmpresa, respuestaDeErrorDeEmpresa } from '@/lib/tenant-resolver';
import { usuarioAppId } from '@/lib/workspace';

/**
 * Aprobacion/rechazo de compras. La empresa sale del contexto validado (nunca
 * del cuerpo). Quien puede decidir:
 *   - el DUENO de la empresa (`user_company_access.relationship = 'owner'`), o
 *   - un usuario designado como aprobador de la empresa (tabla PurchaseApprover).
 *
 * El rol es POR EMPRESA (AGENTS.md 1b), no el global de Clerk: un contador de una
 * empresa ajena no es gerente de ella. La compra nace PENDIENTE_APPROVAL y sus
 * efectos (inventario + asiento) solo corren al aprobar; el rechazo no revierte
 * nada porque nada se aplico aun.
 */

export async function POST(request: Request) {
  try {
    const empresa = exigirEmpresa(await contextoDeEmpresa(request));
    const body = await request.json();

    const id = typeof body?.id === 'string' ? body.id : '';
    const action = body?.action;
    if (!id || (action !== 'approve' && action !== 'reject')) {
      return NextResponse.json(
        { error: 'Se espera { id, action: "approve" | "reject" }' },
        { status: 400 }
      );
    }

    const userId = await usuarioAppId();
    const esDueno = await esDuenoDeEmpresa(getSupabaseServer(), empresa, userId);

    if (!esDueno) {
      const designado = await esAprobadorDeCompras(getSupabaseServer(), empresa, userId);
      if (!designado) {
        return NextResponse.json(
          { error: 'No tienes permiso para aprobar compras. Pide al dueno de la empresa que te designe como aprobador.' },
          { status: 403 }
        );
      }
    }

    const resultado =
      action === 'approve'
        ? await aprobarCompra(getSupabaseServer(), empresa, String(body.id), { userId })
        : await rechazarCompra(getSupabaseServer(), empresa, String(body.id), { userId }, body.reason);

    if (resultado.notFound) {
      return NextResponse.json({ error: 'Compra no encontrada' }, { status: 404 });
    }
    if (resultado.error) {
      console.error('Supabase error al decidir compra:', resultado.error);
      return NextResponse.json({ error: resultado.error.message }, { status: 500 });
    }

    return NextResponse.json(resultado.data);
  } catch (error) {
    const r = respuestaDeErrorDeEmpresa(error);
    if (r) return r;
    console.error('Error al aprobar/rechazar compra:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
