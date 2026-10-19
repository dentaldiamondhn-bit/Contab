import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { contextoDeEmpresa, respuestaDeErrorDeEmpresa } from '@/lib/tenant-resolver';
import { exigirEmpresa } from '@/lib/purchase-db';
import { supabase as supabaseService } from '@/lib/supabase-db';
import { encryptSARConfig } from '@/lib/services/det-uploader';
import { getDiatReport } from '@/lib/services/diat-generator';
import {
  buildDiatUploadPayload,
  submitDiatToSARR,
  validateDiatCompleteness,
} from '@/lib/services/diat-uploader';
import { getLiveSARSession, isSARSessionValid } from '@/lib/services/sar-session';
import type { DiatConfig, DiatUploadStatus } from '@/lib/services/diat-uploader';

const CONFIG_CATEGORY = 'sar';
const CONFIG_KEY_PREFIX = 'diat_sar_config';
const LAST_UPLOAD_KEY_PREFIX = 'diat_sar_last_upload';

const ERROR_HINTS: Record<string, string> = {
  CONFIG: 'Configura la conexión al portal SAR para poder subir el DIAT.',
  CREDENCIALES: 'El portal SAR rechazó las credenciales (usuario o contraseña incorrectos).',
  RED: 'No se pudo conectar con el portal SAR (problema de red o tiempo de espera agotado).',
  PORTAL: 'El portal SAR respondió con un error interno.',
  INCOMPLETO: 'Faltan datos requeridos para subir el DIAT al portal SAR.',
};

const HTTP_BY_STATUS: Record<DiatUploadStatus, number> = {
  SUCCESS: 200,
  CREDENCIALES: 401,
  RED: 502,
  PORTAL: 503,
  CONFIG: 500,
};

// Las claves se indexan por companyId (companies.id), no por tenant: dos empresas
// del mismo tenant (`TEST1DS`) compartirian la configuracion, la sesion y el
// ultimo envio del DIAT al portal SAR. La empresa sale del contexto validado,
// nunca del cliente. Ver lib/tenant-resolver.ts y AGENTS.md seccion 1.
function configKey(companyId: string): string {
  return `${CONFIG_KEY_PREFIX}:${companyId}`;
}

function lastUploadKey(companyId: string): string {
  return `${LAST_UPLOAD_KEY_PREFIX}:${companyId}`;
}

async function readDiatConfig(companyId: string): Promise<DiatConfig | null> {
  const { data, error } = await supabaseService
    .from('system_settings')
    .select('value')
    .eq('key', configKey(companyId))
    .maybeSingle();
  if (error || !data?.value) return null;
  try {
    const parsed = JSON.parse(data.value);
    if (parsed && typeof parsed === 'object' && parsed.passwordEncrypted) {
      return parsed as DiatConfig;
    }
    return null;
  } catch {
    return null;
  }
}

async function writeDiatConfig(
  companyId: string,
  config: DiatConfig,
  updatedBy: string
): Promise<{ error: any }> {
  const value = JSON.stringify(config);
  const row = {
    key: configKey(companyId),
    value,
    description: `Configuración de carga SAR del DIAT (${companyId})`,
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

function writeSetting(key: string, value: string, updatedBy: string): Promise<{ error: any }> {
  const row = {
    key,
    value,
    description: 'Último envío del DIAT al portal SAR',
    category: CONFIG_CATEGORY,
    updated_at: new Date().toISOString(),
    updated_by: updatedBy,
  };
  return supabaseService
    .from('system_settings')
    .select('key')
    .eq('key', key)
    .maybeSingle()
    .then(({ data: existing }) => {
      if (existing) {
        return supabaseService.from('system_settings').update(row).eq('key', key);
      }
      return supabaseService.from('system_settings').insert([row]);
    });
}

type DiatUploadPayloadShape = ReturnType<typeof buildDiatUploadPayload>;

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const empresa = exigirEmpresa(
      await contextoDeEmpresa(request, {
        companyIdDeRuta: searchParams.get('companyId') || searchParams.get('tenantId') || undefined,
      })
    );
    const companyId = empresa.companyId;

    const config = await readDiatConfig(companyId);

    const { data: lastData, error: lastError } = await supabaseService
      .from('system_settings')
      .select('value')
      .eq('key', lastUploadKey(companyId))
      .maybeSingle();
    let lastUpload: unknown = null;
    if (!lastError && lastData?.value) {
      try {
        lastUpload = JSON.parse(lastData.value);
      } catch {
        lastUpload = null;
      }
    }

    if (!config) {
      return NextResponse.json({
        configured: false,
        endpoint: '',
        usuario: '',
        hasPassword: false,
        lastUpload,
      });
    }

    return NextResponse.json({
      configured: true,
      endpoint: config.endpoint,
      usuario: config.usuario,
      hasPassword: !!config.passwordEncrypted,
      lastUpload,
    });
  } catch (error) {
    const r = respuestaDeErrorDeEmpresa(error);
    if (r) return r;
    console.error('Error leyendo configuración SAR de DIAT:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { ok: false, errorHint: 'CONFIG', error: 'No autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const empresa = exigirEmpresa(
      await contextoDeEmpresa(request, {
        companyIdDeRuta: body?.companyId || body?.tenantId || undefined,
      })
    );
    const companyId = empresa.companyId;

    const action = body?.action || 'upload';

    if (action === 'get-config') {
      const config = await readDiatConfig(companyId);
      if (!config) {
        return NextResponse.json({
          configured: false,
          endpoint: '',
          usuario: '',
          hasPassword: false,
        });
      }
      return NextResponse.json({
        configured: true,
        endpoint: config.endpoint,
        usuario: config.usuario,
        hasPassword: !!config.passwordEncrypted,
      });
    }

    if (action === 'save-config') {
      const { endpoint, usuario, password } = body || {};

      if (typeof endpoint !== 'string' || !endpoint.trim()) {
        return NextResponse.json(
          { ok: false, error: 'El endpoint del portal SAR es obligatorio' },
          { status: 400 }
        );
      }
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(endpoint.trim());
      } catch {
        return NextResponse.json(
          { ok: false, error: 'El endpoint del portal SAR no es una URL válida' },
          { status: 400 }
        );
      }
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        return NextResponse.json(
          { ok: false, error: 'El endpoint del portal SAR debe ser http(s)' },
          { status: 400 }
        );
      }
      if (typeof usuario !== 'string' || !usuario.trim()) {
        return NextResponse.json(
          { ok: false, error: 'El usuario del portal SAR es obligatorio' },
          { status: 400 }
        );
      }

      const existing = await readDiatConfig(companyId);
      let passwordEncrypted = existing?.passwordEncrypted || '';
      const hasNewPassword = typeof password === 'string' && password.trim() !== '';
      if (hasNewPassword) {
        try {
          passwordEncrypted = encryptSARConfig({ usuario: usuario.trim(), password }).passwordEncrypted;
        } catch (error) {
          return NextResponse.json(
            { ok: false, error: (error as Error)?.message || 'Error al cifrar la contraseña SAR' },
            { status: 500 }
          );
        }
      } else if (!passwordEncrypted) {
        return NextResponse.json(
          { ok: false, error: 'La contraseña del portal SAR es obligatoria al configurar por primera vez' },
          { status: 400 }
        );
      }

      const config: DiatConfig = {
        endpoint: endpoint.trim(),
        usuario: usuario.trim(),
        passwordEncrypted,
        autoconfig: true,
      };

      const { error } = await writeDiatConfig(companyId, config, userId);
      if (error) {
        console.error('Error guardando configuración SAR de DIAT:', error);
        return NextResponse.json(
          { ok: false, error: 'No se pudo guardar la configuración SAR' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ok: true,
        configured: true,
        endpoint: config.endpoint,
        usuario: config.usuario,
      });
    }

    if (action === 'test') {
      const config = await readDiatConfig(companyId);
      if (!config) {
        return NextResponse.json({ ok: false, errorHint: 'CONFIG', error: ERROR_HINTS.CONFIG });
      }
      const payload: DiatUploadPayloadShape = buildDiatUploadPayload({
        period: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
        declarante: { rtn: '', razonSocial: '' },
        resumen: {},
        ventas: { records: [] },
        compras: { records: [] },
      });
      const result = await submitDiatToSARR(config, payload, { retries: 0 });
      return NextResponse.json({
        ...result,
        error: !result.ok ? ERROR_HINTS[result.status] : undefined,
        statusCode: HTTP_BY_STATUS[result.status],
      });
    }

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

    const period = body?.period || defaultPeriod();
    const report = await getDiatReport(companyId, period);
    const payload = buildDiatUploadPayload(report);

    const completeness = validateDiatCompleteness(payload);
    if (completeness.errors.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          status: 'CONFIG',
          errorHint: 'INCOMPLETO',
          validationErrors: completeness.errors,
          warnings: completeness.warnings,
          error: ERROR_HINTS.INCOMPLETO,
        },
        { status: 422 }
      );
    }

    const config = await readDiatConfig(companyId);
    if (!config) {
      return NextResponse.json(
        { ok: false, status: 'CONFIG', errorHint: 'CONFIG', error: ERROR_HINTS.CONFIG },
        { status: HTTP_BY_STATUS.CONFIG }
      );
    }

    const result = await submitDiatToSARR(config, payload, {
      retries: typeof body?.retries === 'number' ? body.retries : undefined,
    });

    if (result.ok) {
      await writeSetting(
        lastUploadKey(companyId),
        JSON.stringify({
          period,
          uploadedAt: new Date().toISOString(),
          trackingCode: result.trackingCode,
          portalConfirmation: !!result.portalResponse,
          totalVentas: payload.totalVentas,
          totalCompras: payload.totalCompras,
          isvAPagar: payload.isvAPagar,
        }),
        userId
      );
    }

    return NextResponse.json(
      {
        ok: result.ok,
        status: result.status,
        message: result.message,
        trackingCode: result.trackingCode,
        portalResponse: result.portalResponse,
        contentType: result.contentType,
        bodyPreview: result.bodyPreview,
        attempts: result.attempts,
        warnings: completeness.warnings,
        error: !result.ok ? ERROR_HINTS[result.status] : undefined,
      },
      { status: HTTP_BY_STATUS[result.status] }
    );
  } catch (error) {
    const r = respuestaDeErrorDeEmpresa(error);
    if (r) return r;
    console.error('Error subiendo el DIAT al portal SAR:', error);
    return NextResponse.json(
      { ok: false, status: 'CONFIG', errorHint: 'CONFIG', error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

function defaultPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}