import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseServer } from '@/lib/supabase/server-lazy';
import { exigirEmpresa, idsDeEstaEmpresa, idValidoDe } from '@/lib/purchase-db';
import { contextoDeEmpresa, respuestaDeErrorDeEmpresa } from '@/lib/tenant-resolver';
import {
  CRITERIA,
  MAX_COMENTARIO,
  type Criterio,
  nota,
  globalDe,
} from '@/lib/supplier-ratings';

/**
 * Calificaciones y comentarios de proveedor (migracion 042).
 *
 * AISLAMIENTO: por `company_id`, nunca por `tenant_id`. `TEST1DS` tiene dos
 * empresas, asi que un filtro por tenant las deja verse las calificaciones de
 * la otra. La empresa sale SIEMPRE del contexto validado, nunca del cuerpo ni
 * de un parametro: `lib/purchase-db.ts` exportaba `TENANT_ID = '1'` y clavaba
 * el modulo entero de compras en una empresa.
 *
 * ATRIBUCION: el autor lo pone el servidor desde la sesion de Clerk. Nunca se
 * lee del cuerpo: si `author_id` fuera del cliente, uno podria calificar en
 * nombre de otro.
 *
 * TIPO DE `supplier_id`: `uuid` (medido con el OpenAPI el 5 Oct 2026), que es lo
 * que hace `Purchase.supplier_id`. No copiar `supplier_price_history.supplier_id`,
 * que es `text` y es drift.
 */

/**
 * Traduce la identidad de Clerk a `"User"(id)`.
 *
 * OJO con las dos tablas de usuario, que es la trampa de este repo:
 *   - `"User"` (con comillas) es la REAL: `id` **text**, `authid`, `firstname`.
 *     Es la que usa `user_company_access` y la que ve la politica RLS.
 *   - `users` (sin comillas) es OTRA tabla, y es a la que apunta el modelo
 *     `User` de Prisma (`@@map("users")`), con `id` uuid y `auth_id`.
 * Consultar `users` aca devolveria 0 filas siempre, sin error.
 */
async function usuarioDeLaSesion(): Promise<{ id: string } | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const { data } = await getSupabaseServer()
    .from('User')
    .select('id')
    .eq('authid', userId)
    .maybeSingle();

  return data ? { id: String(data.id) } : null;
}

function notasDelBody(body: any): Record<Criterio, number> | { error: string } {
  const out = {} as Record<Criterio, number>;
  const malas: string[] = [];
  for (const c of CRITERIA) {
    const n = nota(body?.[c]);
    if (n === null) malas.push(c);
    else out[c] = n;
  }
  if (malas.length) {
    return { error: `Cada criterio debe ser un entero de 1 a 5. Invalidos: ${malas.join(', ')}.` };
  }
  return out;
}

export async function GET(request: Request) {
  try {
    const empresa = exigirEmpresa(await contextoDeEmpresa(request));
    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get('supplierId');

    if (!supplierId) {
      return NextResponse.json({ error: 'supplierId requerido' }, { status: 400 });
    }

    const supabase = getSupabaseServer();

    // El proveedor tiene que ser de ESTA empresa ANTES de leer sus
    // calificaciones. Sin esta comprobacion, un `supplier_id` de otra empresa
    // devolveria 0 calificaciones: se veria como "este proveedor no tiene
    // ninguna", que es el modo de fallo que parece que no hay datos.
    const proveedores = await idsDeEstaEmpresa(supabase, empresa, 'Supplier', [supplierId]);
    if (!idValidoDe(proveedores, supplierId)) {
      return NextResponse.json(
        { error: 'El proveedor no pertenece a la empresa activa.' },
        { status: 404 }
      );
    }

    // El autor se resuelve en una segunda consulta porque `"User"` no tiene
    // relacion declarada en Prisma (el modelo `User` apunta a `users`, otra
    // tabla) y `user_company_access` no declara FK. Encadenar el nombre aqui
    // daria PGRST200.
    const { data, error } = await supabase
      .from('supplier_ratings')
      .select('*')
      .eq('company_id', empresa.companyId)
      .eq('supplier_id', supplierId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching supplier ratings:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const filas = (data || []) as any[];
    const autores = [...new Set(filas.map((f) => f.author_id).filter(Boolean))];

    let nombres: Record<string, string> = {};
    if (autores.length) {
      const { data: us } = await supabase
        .from('User')
        .select('id, firstname, lastname, email')
        .in('id', autores);
      for (const u of (us || []) as any[]) {
        const nombre = [u.firstname, u.lastname].filter(Boolean).join(' ').trim();
        nombres[String(u.id)] = nombre || String(u.email || 'Usuario');
      }
    }

    const sesion = await usuarioDeLaSesion();
    const media = filas.length
      ? Math.round(
          (filas.reduce((acc, f) => acc + globalDe(f), 0) / filas.length) * 10
        ) / 10
      : null;

    return NextResponse.json({
      media,
      total: filas.length,
      miCalificacionId: sesion
        ? filas.find((f) => f.author_id === sesion.id)?.id ?? null
        : null,
      calificaciones: filas.map((f) => ({
        ...f,
        global: globalDe(f),
        autor: nombres[String(f.author_id)] ?? 'Usuario',
        esMia: sesion ? f.author_id === sesion.id : false,
      })),
    });
  } catch (error) {
    const r = respuestaDeErrorDeEmpresa(error);
    if (r) return r;
    console.error('Error fetching supplier ratings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const empresa = exigirEmpresa(await contextoDeEmpresa(request));
    const body = await request.json();

    if (!body?.supplier_id) {
      return NextResponse.json({ error: 'supplier_id requerido' }, { status: 400 });
    }

    const notas = notasDelBody(body);
    if ('error' in notas) {
      return NextResponse.json({ error: notas.error }, { status: 400 });
    }

    const comentario =
      body.comment === undefined || body.comment === null || body.comment === ''
        ? null
        : String(body.comment);
    if (comentario !== null && comentario.length > MAX_COMENTARIO) {
      return NextResponse.json(
        { error: `El comentario no puede pasar de ${MAX_COMENTARIO} caracteres.` },
        { status: 400 }
      );
    }

    // El autor es la SESION, no el cuerpo. Si no hay sesion o no resuelve a un
    // "User", se devuelve 401 en vez de escribir una fila sin autor: una
    // calificacion huerfana no se puede ni editar ni borrar despues.
    const autor = await usuarioDeLaSesion();
    if (!autor) {
      return NextResponse.json(
        { error: 'Tu sesion no corresponde a un usuario. Recarga la pagina.' },
        { status: 401 }
      );
    }

    const supabase = getSupabaseServer();
    const proveedores = await idsDeEstaEmpresa(supabase, empresa, 'Supplier', [body.supplier_id]);
    const supplierId = idValidoDe(proveedores, body.supplier_id);
    if (!supplierId) {
      return NextResponse.json(
        { error: 'El proveedor no pertenece a la empresa activa.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('supplier_ratings')
      .insert({
        company_id: empresa.companyId,
        tenant_id: empresa.tenantId,
        supplier_id: supplierId,
        author_id: autor.id,
        ...notas,
        comment: comentario,
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error creating supplier rating:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { ...(data as any), global: globalDe(data as any) },
      { status: 201 }
    );
  } catch (error) {
    const r = respuestaDeErrorDeEmpresa(error);
    if (r) return r;
    console.error('Error creating supplier rating:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const empresa = exigirEmpresa(await contextoDeEmpresa(request));
    const body = await request.json();
    const id = body?.id;
    if (!id) {
      return NextResponse.json({ error: 'id requerido' }, { status: 400 });
    }

    const notas = notasDelBody(body);
    if ('error' in notas) {
      return NextResponse.json({ error: notas.error }, { status: 400 });
    }

    const comentario =
      body.comment === undefined || body.comment === null || body.comment === ''
        ? null
        : String(body.comment);
    if (comentario !== null && comentario.length > MAX_COMENTARIO) {
      return NextResponse.json(
        { error: `El comentario no puede pasar de ${MAX_COMENTARIO} caracteres.` },
        { status: 400 }
      );
    }

    const autor = await usuarioDeLaSesion();
    if (!autor) {
      return NextResponse.json(
        { error: 'Tu sesion no corresponde a un usuario. Recarga la pagina.' },
        { status: 401 }
      );
    }

    // `supplier_id` NO se puede cambiar desde un PATCH: el `updates` de abajo no
    // lo incluye, y no incluirlo es la decision. Si se acepytara, una
    // calificacion podria repuntarse al proveedor de otra empresa, que es
    // justo el agujero que `app/api/suppliers/price-history` ya tuvo cerrado con
    // `idsDeEstaEmpresa`. Se valida si viene, para que un cliente que lo mande
    // reciba un 400 explicito en vez de ver su campo ignorado en silencio.
    if (body.supplier_id !== undefined && body.supplier_id !== null) {
      const proveedores = await idsDeEstaEmpresa(
        getSupabaseServer(),
        empresa,
        'Supplier',
        [body.supplier_id]
      );
      if (!idValidoDe(proveedores, body.supplier_id)) {
        return NextResponse.json(
          { error: 'El proveedor no pertenece a la empresa activa.' },
          { status: 400 }
        );
      }
    }

    const updates: any = { ...notas, comment: comentario };

    // `.eq('author_id', autor.id)` es lo que hace que solo se edite la propia
    // calificacion. Sin el, un PATCH con un id ajeno reventaba la fila de otro
    // usuario de la misma empresa: el `.eq('company_id')` solo aisla la empresa,
    // no la fila.
    const { data, error } = await getSupabaseServer()
      .from('supplier_ratings')
      .update(updates)
      .eq('id', id)
      .eq('company_id', empresa.companyId)
      .eq('author_id', autor.id)
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('Error updating supplier rating:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 0 filas = o el id no existe, o no es de esta empresa, o es de otro autor.
    // Se responde 404 y no "exito silencioso".
    if (!data) {
      return NextResponse.json(
        { error: 'Calificacion no encontrada, o no es tuya.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ ...(data as any), global: globalDe(data as any) });
  } catch (error) {
    const r = respuestaDeErrorDeEmpresa(error);
    if (r) return r;
    console.error('Error updating supplier rating:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const empresa = exigirEmpresa(await contextoDeEmpresa(request));
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id requerido' }, { status: 400 });
    }

    const autor = await usuarioDeLaSesion();
    if (!autor) {
      return NextResponse.json(
        { error: 'Tu sesion no corresponde a un usuario. Recarga la pagina.' },
        { status: 401 }
      );
    }

    const { error } = await getSupabaseServer()
      .from('supplier_ratings')
      .delete()
      .eq('id', id)
      .eq('company_id', empresa.companyId)
      .eq('author_id', autor.id);

    if (error) {
      console.error('Error deleting supplier rating:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const r = respuestaDeErrorDeEmpresa(error);
    if (r) return r;
    console.error('Error deleting supplier rating:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
