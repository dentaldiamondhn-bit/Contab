import { NextRequest, NextResponse } from 'next/server';
import { contextoDeEmpresa, respuestaDeErrorDeEmpresa, type ContextoEmpresa } from '@/lib/tenant-resolver';
import { getSupabaseServer } from '@/lib/supabase/server-lazy';

// ESTA RUTA TENIA TRES AGUJEROS, y no eran de "faltaba un filtro por empresa":
//
// 1. **No habia ninguna autenticacion.** Ni `auth()`, ni `contextoDeEmpresa`:
//    cualquier request que llegara al handler podia ejecutarlo.
//
// 2. **El POST construia la ruta del fichero con datos del cliente.** `tenantId`
//    venia del `formData`, y la ruta era `${tenantId}/${employeeId}/...`.
//    Con el service role de Supabase, subir a la ruta de otra empresa era
//    escribir en su almacenamiento. `upsert: true` ademas permitia SOBRESCRIBIR
//    un fichero existente: solo hacia falta adivinar el timestamp.
//
// 3. **El DELETE era un traversal.** `bucket` y `path` los elegia el cliente y
//    no se comprobaba nada: `.remove([path])` con `path` arbitrario borra en
//    cualquier bucket. Es lo mas grave de este archivo.
//
// 4. **Los ficheros se servian con `getPublicUrl`, y `employee-photos` estaba en
//    `public = true`.** O sea que las fotos de empleado eran datos personales
//    públicos para cualquiera que tuviera la URL. Y `employee-documents` ya era
//    privado: `getPublicUrl` sobre un bucket privado devuelve una URL que NO
//    sirve (400), o sea que los enlaces a documentos estaban rotos desde antes.
//
//    Ahora los DOS buckets son privados y se sirve con URL FIRMADA de 1 hora.
//    `createSignedUrl` devuelve una ruta RELATIVA (`/object/sign/...?token=`), no
//    una URL: hay que prefijarla con `${SUPABASE_URL}/storage/v1` o el `<img>`
//    no carga. Medido, no supuesto.
//
// Lo que se arregla: la ruta del fichero se deriva de la empresa VALIDADA, el
// borrado solo toca rutas de esa empresa y de los buckets de RRHH, y la lectura
// exige que el empleado de la ruta sea de ESTA empresa antes de firmar nada.

const BUCKETS_PERMITIDOS = new Set(['employee-photos', 'employee-documents']);
const EXPIRACION_FIRMA_SEG = 3600;

function urlAbsolutaDeFirma(signedUrl: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  return signedUrl.startsWith('http') ? signedUrl : `${base}/storage/v1${signedUrl}`;
}

// Valida que la ruta pertenezca a la empresa y al empleado indicados. Se usa en
// el POST (antes de escribir) y en el GET (antes de firmar): firmar es dar
// acceso temporal, asi que comprobarlo despues de firmar no serviria de nada.
async function validarRutaDeEmpresa(
  empresa: ContextoEmpresa,
  ruta: string,
  bucket: string,
): Promise<{ ok: true; employeeId: string } | { ok: false; status: number; error: string }> {
  // Sin empresa no se puede aislar: `company_id` es lo que separa, y filtrar solo
  // por tenant dejaría leer los ficheros de la empresa hermana del mismo tenant.
  if (!empresa.tenantId || !empresa.companyId) {
    return { ok: false, status: 400, error: 'No se pudo determinar la empresa' };
  }
  if (!BUCKETS_PERMITIDOS.has(bucket)) {
    return { ok: false, status: 400, error: 'Bucket no permitido' };
  }
  const prefijo = `${empresa.tenantId}/`;
  if (!ruta.startsWith(prefijo)) {
    return { ok: false, status: 403, error: 'Ruta fuera de esta empresa' };
  }
  if (ruta.split('/').includes('..')) {
    return { ok: false, status: 400, error: 'Ruta no permitida' };
  }
  const partes = ruta.split('/');
  const employeeId = partes[1] || '';
  const nombre = partes[partes.length - 1] || '';
  if (partes.length < 3 || !employeeId || !nombre) {
    return { ok: false, status: 400, error: 'Ruta incompleta' };
  }
  // El bucket lo pone el nombre del fichero en el POST (`photo_` vs documento).
  // Si no encaja, alguien esta pidiendo el bucket contrario para la misma ruta.
  if (bucket === 'employee-photos' && !nombre.startsWith('photo_')) {
    return { ok: false, status: 400, error: 'El fichero no es una foto de ese bucket' };
  }
  // El empleado se comprueba por `company_id`, no por `tenant_id`: los empleados
  // con `tenant_id` NULL (FK legacy a `tenants`) son legitimamente de su empresa.
  const { data: empleado } = await getSupabaseServer()
    .from('employees')
    .select('id')
    .eq('id', employeeId)
    .eq('company_id', empresa.companyId)
    .maybeSingle();
  if (!empleado) {
    return { ok: false, status: 403, error: 'El empleado no pertenece a esta empresa' };
  }
  return { ok: true, employeeId };
}

// GET: devuelve una URL firmada de 1 hora para un fichero ya subido.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const empresa = await contextoDeEmpresa(request, { companyIdDeRuta: (await params).id });
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');
    const bucket = searchParams.get('bucket') || 'employee-documents';

    if (!path) {
      return NextResponse.json({ error: 'Missing path' }, { status: 400 });
    }

    const ok = await validarRutaDeEmpresa(empresa, path, bucket);
    if (!ok.ok) {
      return NextResponse.json({ error: ok.error }, { status: ok.status });
    }

    const { data, error } = await getSupabaseServer().storage
      .from(bucket)
      .createSignedUrl(path, EXPIRACION_FIRMA_SEG);
    if (error || !data?.signedUrl) {
      return NextResponse.json(
        { error: error?.message || 'No se pudo firmar el fichero' },
        { status: error ? 400 : 500 }
      );
    }

    return NextResponse.json({
      signedUrl: urlAbsolutaDeFirma(data.signedUrl),
      path,
      bucket,
      expiresIn: EXPIRACION_FIRMA_SEG,
    });
  } catch (error: any) {
    const respuesta = respuestaDeErrorDeEmpresa(error);
    if (respuesta) return respuesta;
    console.error('GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const empresa = await contextoDeEmpresa(request, { companyIdDeRuta: (await params).id });

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const employeeId = formData.get('employeeId') as string;
    const type = formData.get('type') as string; // 'photo' | 'document' | 'hr-document'

    if (!file || !employeeId || !type) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    // El bucket lo decide el SERVIDOR a partir del tipo, no el cliente.
    const bucket = type === 'photo' ? 'employee-photos' : 'employee-documents';

    const ext = (file.name.split('.').pop() || '').toLowerCase();
    const timestamp = Date.now();
    // El prefijo es el `tenant_id` real (derivado de la empresa validada), no
    // el que mandaba el cliente.
    const filePath = `${empresa.tenantId}/${employeeId}/${type}_${timestamp}.${ext}`;

    const okRuta = await validarRutaDeEmpresa(empresa, filePath, bucket);
    if (!okRuta.ok) {
      return NextResponse.json({ error: okRuta.error }, { status: okRuta.status });
    }

    const { error: uploadError } = await getSupabaseServer().storage
      .from(bucket)
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Lo que se guarda en la BD es el PATH, no esta URL: una firma caduca en una
    // hora y `employees.photo` se lee dias despues. El path se vuelve a firmar
    // cuando se pinta (ver el GET).
    const { data: firma, error: errorFirma } = await getSupabaseServer().storage
      .from(bucket)
      .createSignedUrl(filePath, EXPIRACION_FIRMA_SEG);

    return NextResponse.json({
      path: filePath,
      signedUrl: firma?.signedUrl ? urlAbsolutaDeFirma(firma.signedUrl) : null,
      bucket,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      ...(errorFirma ? { warning: errorFirma.message } : {}),
    });
  } catch (error: any) {
    const respuesta = respuestaDeErrorDeEmpresa(error);
    if (respuesta) return respuesta;
    console.error('POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const empresa = await contextoDeEmpresa(request, { companyIdDeRuta: (await params).id });
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');
    const bucket = searchParams.get('bucket') || 'employee-documents';

    if (!path) {
      return NextResponse.json({ error: 'Missing path' }, { status: 400 });
    }

    // Misma comprobacion que al subir y que al firmar: bucket permitido, prefijo
    // de ESTA empresa, sin `..`, y el empleado de la ruta siendo de esta empresa.
    const okRuta = await validarRutaDeEmpresa(empresa, path, bucket);
    if (!okRuta.ok) {
      return NextResponse.json({ error: okRuta.error }, { status: okRuta.status });
    }

    const { error } = await getSupabaseServer().storage
      .from(bucket)
      .remove([path]);

    if (error) {
      console.error('Delete error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    const respuesta = respuestaDeErrorDeEmpresa(error);
    if (respuesta) return respuesta;
    console.error('DELETE error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
