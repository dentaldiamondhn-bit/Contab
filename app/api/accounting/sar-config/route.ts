import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { contextoDeEmpresa, respuestaDeErrorDeEmpresa } from '@/lib/tenant-resolver';
import { exigirEmpresa } from '@/lib/purchase-db';
import { supabase as supabaseService } from '@/lib/supabase-db';
import { encryptSARConfig, isSARConfigComplete } from '@/lib/services/det-uploader';
import type { SARUploadConfig } from '@/lib/services/det-uploader';

const CONFIG_CATEGORY = 'sar';

// La configuracion vive en `system_settings` con la clave `sar_config:<companyId>`.
// La empresa viene del contexto validado (`contextoDeEmpresa`: el `?tenantId` del
// cliente se usa solo como pista y se comprueba pertenencia), NUNCA del tenant:
// `TEST1DS` tiene dos empresas y una clave por tenant les compartiria la conexion
// al portal SAR. Ver lib/tenant-resolver.ts y AGENTS.md seccion 1.
function configKey(companyId: string): string {
  return `sar_config:${companyId}`;
}

async function readSARConfig(companyId: string): Promise<SARUploadConfig | null> {
  const { data, error } = await supabaseService
    .from('system_settings')
    .select('value')
    .eq('key', configKey(companyId))
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

async function writeSARConfig(
  companyId: string,
  config: SARUploadConfig,
  updatedBy: string
): Promise<{ error: any }> {
  const value = JSON.stringify(config);
  const row = {
    key: configKey(companyId),
    value,
    description: `Configuración de carga SAR del formulario 221 (${companyId})`,
    category: CONFIG_CATEGORY,
    updated_at: new Date().toISOString(),
    updated_by: updatedBy,
  };
  const { data: existing } = await supabaseService
    .from('system_settings')
    .select('key')
    .eq('key', configKey(companyId))
    .maybeSingle();
  if (existing) {
    const { error } = await supabaseService
      .from('system_settings')
      .update(row)
      .eq('key', configKey(companyId));
    return { error };
  }
  const { error } = await supabaseService.from('system_settings').insert([row]);
  return { error };
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const empresa = exigirEmpresa(
      await contextoDeEmpresa(request, {
        companyIdDeRuta: new URL(request.url).searchParams.get('tenantId') || undefined,
      })
    );

    const config = await readSARConfig(empresa.companyId);
    if (!isSARConfigComplete(config)) {
      return NextResponse.json({ configured: false, endpoint: '', usuario: '', hasPassword: false });
    }

    return NextResponse.json({
      configured: true,
      endpoint: config.endpoint,
      usuario: config.usuario,
      hasPassword: !!config.passwordEncrypted,
    });
  } catch (error) {
    const r = respuestaDeErrorDeEmpresa(error);
    if (r) return r;
    console.error('Error leyendo configuración SAR:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { endpoint, usuario, password } = body || {};
    const empresa = exigirEmpresa(
      await contextoDeEmpresa(request, {
        companyIdDeRuta: body?.tenantId || body?.companyId || undefined,
      })
    );

    if (typeof endpoint !== 'string' || !endpoint.trim()) {
      return NextResponse.json({ error: 'El endpoint del portal SAR es obligatorio' }, { status: 400 });
    }
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(endpoint.trim());
    } catch {
      return NextResponse.json(
        { error: 'El endpoint del portal SAR no es una URL válida' },
        { status: 400 }
      );
    }
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return NextResponse.json({ error: 'El endpoint del portal SAR debe ser http(s)' }, { status: 400 });
    }
    if (typeof usuario !== 'string' || !usuario.trim()) {
      return NextResponse.json({ error: 'El usuario del portal SAR es obligatorio' }, { status: 400 });
    }

    const existing = await readSARConfig(empresa.companyId);
    let passwordEncrypted = existing?.passwordEncrypted || '';
    const hasNewPassword = typeof password === 'string' && password.trim() !== '';
    if (hasNewPassword) {
      try {
        passwordEncrypted = encryptSARConfig({ usuario: usuario.trim(), password }).passwordEncrypted;
      } catch (error) {
        return NextResponse.json(
          { error: (error as Error)?.message || 'Error al cifrar la contraseña SAR' },
          { status: 500 }
        );
      }
    } else if (!passwordEncrypted) {
      return NextResponse.json(
        { error: 'La contraseña del portal SAR es obligatoria al configurar por primera vez' },
        { status: 400 }
      );
    }

    const config: SARUploadConfig = {
      endpoint: endpoint.trim(),
      usuario: usuario.trim(),
      passwordEncrypted,
      autoconfig: true,
    };

    const { error } = await writeSARConfig(empresa.companyId, config, userId);
    if (error) {
      console.error('Error guardando configuración SAR:', error);
      return NextResponse.json({ error: 'No se pudo guardar la configuración SAR' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, configured: true });
  } catch (error) {
    const r = respuestaDeErrorDeEmpresa(error);
    if (r) return r;
    console.error('Error guardando configuración SAR:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
