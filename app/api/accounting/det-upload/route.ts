import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { contextoDeEmpresa, respuestaDeErrorDeEmpresa } from '@/lib/tenant-resolver';
import { exigirEmpresa } from '@/lib/purchase-db';
import { supabase as supabaseService } from '@/lib/supabase-db';
import { submitDETToSARR } from '@/lib/services/det-uploader';
import { getLiveSARSession, isSARSessionValid } from '@/lib/services/sar-session';
import type { SARUploadConfig } from '@/lib/services/det-uploader';

const ERROR_HINTS: Record<string, string> = {
  CONFIG: 'Configura primero la carga SAR (Perfil → SAR).',
  CREDENCIALES: 'El portal SAR rechazó las credenciales (usuario o contraseña incorrectos).',
  RED: 'No se pudo conectar con el portal SAR (problema de red o tiempo de espera agotado).',
  PORTAL: 'El portal SAR respondió con un error interno.',
};

// La configuracion SAR vive en `system_settings` con la clave
// `sar_config:<companyId>` (companies.id), no por tenant: dos empresas del mismo
// tenant (`TEST1DS`) compartirian la conexion al portal SAR. La empresa sale del
// contexto validado. Ver lib/tenant-resolver.ts y AGENTS.md seccion 1.
async function readSARConfig(companyId: string): Promise<SARUploadConfig | null> {
  const { data, error } = await supabaseService
    .from('system_settings')
    .select('value')
    .eq('key', `sar_config:${companyId}`)
    .maybeSingle();
  if (error || !data?.value) return null;
  try {
    const parsed = JSON.parse(data.value);
    if (parsed && typeof parsed === 'object' && parsed.passwordEncrypted) {
      return parsed as SARUploadConfig;
    }
    return null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ ok: false, errorHint: 'CONFIG', error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { detText, periodo, cai, correlativo } = body || {};
    const empresa = exigirEmpresa(
      await contextoDeEmpresa(request, {
        companyIdDeRuta: body?.tenantId || body?.companyId || undefined,
      })
    );
    const companyId = empresa.companyId;

    const sessionState = await getLiveSARSession(companyId);
    if (!isSARSessionValid(sessionState.session)) {
      return NextResponse.json({
        ok: false,
        status: 'SESION',
        errorHint: 'SESION_NO_VERIFICADA',
        message: 'No hay una sesión verificada con el portal SAR — conecta primero',
        error: 'No hay una sesión verificada con el portal SAR — conecta primero',
      });
    }

    const config = await readSARConfig(companyId);
    if (!config) {
      return NextResponse.json(
        { ok: false, errorHint: 'CONFIG', error: ERROR_HINTS.CONFIG },
        { status: 400 }
      );
    }

    const result = await submitDETToSARR(config, typeof detText === 'string' ? detText : '', {
      periodo: typeof periodo === 'string' ? periodo : '',
      cai: typeof cai === 'string' ? cai : '',
      correlativo: typeof correlativo === 'string' ? correlativo : '',
    });

    return NextResponse.json({
      ...result,
      error: !result.ok && result.errorHint ? ERROR_HINTS[result.errorHint] : undefined,
    });
  } catch (error) {
    const r = respuestaDeErrorDeEmpresa(error);
    if (r) return r;
    console.error('Error subiendo DET al portal SAR:', error);
    return NextResponse.json(
      { ok: false, errorHint: 'CONFIG', error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}