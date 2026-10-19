import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server-lazy';
import {
  exigirEmpresa,
  esAprobadorDeCompras,
  esDuenoDeEmpresa,
  fetchAprobadores,
  fetchMiembrosEmpresa,
  agregarAprobador,
  eliminarAprobador,
} from '@/lib/purchase-db';
import { contextoDeEmpresa, respuestaDeErrorDeEmpresa } from '@/lib/tenant-resolver';
import { usuarioAppId } from '@/lib/workspace';

/**
 * Aprobadores de compras (lista por empresa). El DUENO de la empresa
 * (`user_company_access.relationship = 'owner'`) la administra; cualquier
 * miembro de la empresa puede leerla (para saber si le toca aprobar).
 *
 * El rol de aprobacion es POR EMPRESA (AGENTS.md 1b), no el rol global de Clerk:
 * `contextoDeEmpresa` ya valida pertenencia, y aqui se distingue al dueno del
 * contador. La empresa sale del contexto validado, nunca del cuerpo.
 */

export async function GET(request: Request) {
  try {
    const empresa = exigirEmpresa(await contextoDeEmpresa(request));
    const userId = await usuarioAppId();

    const puedeGestionar = await esDuenoDeEmpresa(getSupabaseServer(), empresa, userId);
    const { data, error } = await fetchAprobadores(getSupabaseServer(), empresa);
    if (error) {
      console.error('Supabase error listing approvers:', error);
      return NextResponse.json({ error: 'No se pudo leer la lista de aprobadores' }, { status: 500 });
    }

    const puedeAprobar = puedeGestionar || (await esAprobadorDeCompras(getSupabaseServer(), empresa, userId));

    let candidatos: any[] = [];
    if (puedeGestionar) {
      const { data: miembros } = await fetchMiembrosEmpresa(getSupabaseServer(), empresa);
      const yaDesignados = new Set((data || []).map((a: any) => String(a.user_id)));
      candidatos = (miembros || []).filter((m: any) => !yaDesignados.has(String(m.id)));
    }

    return NextResponse.json({ aprobadores: data || [], candidatos, puedeGestionar, puedeAprobar });
  } catch (error) {
    const r = respuestaDeErrorDeEmpresa(error);
    if (r) return r;
    console.error('Error listing approvers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const empresa = exigirEmpresa(await contextoDeEmpresa(request));
    const userId = await usuarioAppId();
    if (!(await esDuenoDeEmpresa(getSupabaseServer(), empresa, userId))) {
      return NextResponse.json(
        { error: 'Solo el dueno de la empresa puede designar aprobadores de compras.' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { data, error } = await agregarAprobador(getSupabaseServer(), empresa, body?.userId, {
      userId,
    });

    if (error) {
      console.error('Supabase error adding approver:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    const r = respuestaDeErrorDeEmpresa(error);
    if (r) return r;
    console.error('Error adding approver:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const empresa = exigirEmpresa(await contextoDeEmpresa(request));
    if (!(await esDuenoDeEmpresa(getSupabaseServer(), empresa, await usuarioAppId()))) {
      return NextResponse.json(
        { error: 'Solo el dueno de la empresa puede quitar aprobadores de compras.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Falta el id del aprobador.' }, { status: 400 });

    const { notFound, error } = await eliminarAprobador(getSupabaseServer(), empresa, id);
    if (error) {
      console.error('Supabase error removing approver:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (notFound) return NextResponse.json({ error: 'Aprobador no encontrado' }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (error) {
    const r = respuestaDeErrorDeEmpresa(error);
    if (r) return r;
    console.error('Error removing approver:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
