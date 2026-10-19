import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { contextoDeEmpresa, respuestaDeErrorDeEmpresa } from '@/lib/tenant-resolver';
import { exigirEmpresa } from '@/lib/purchase-db';
import { supabase as supabaseService } from '@/lib/supabase-db';
import { encryptSARConfig } from '@/lib/services/det-uploader';
import type { SARUploadConfig } from '@/lib/services/det-uploader';
import {
  encryptSARSession,
  getLiveSARSession,
  isSARSessionValid,
  writeSARSetting,
  sarSessionKey,
  verifySARCredentials,
} from '@/lib/services/sar-session';
import type { SARSessionInfo } from '@/lib/services/sar-session';

const CONFIG_CATEGORY = 'sar';

// Las claves de `system_settings` se indexan por `companyId` (companies.id), no por
// tenant: dos empresas del mismo tenant (`TEST1DS`) compartirian la sesion y la
// conexion al portal SAR. La empresa sale del contexto validado, no del cliente.
// Ver lib/tenant-resolver.ts y AGENTS.md seccion 1.
function uploaderConfigKeys(companyId: string) {
  return {
    det: `sar_config:${companyId}`,
    annual: `annual_tax_sar_config:${companyId}`,
    diat: `diat_sar_config:${companyId}`,
  };
}

async function readSetting(key: string): Promise<unknown | null> {
  const { data, error } = await supabaseService
    .from('system_settings')
    .select('value')
    .eq('key', key)
    .maybeSingle();
  if (error || !data?.value) return null;
  try {
    return JSON.parse(data.value);
  } catch {
    return null;
  }
}

async function writeUploaderConfigs(
  companyId: string,
  endpoint: string,
  usuario: string,
  passwordEncrypted: string,
  updatedBy: string
): Promise<{ error: any }> {
  const keys = uploaderConfigKeys(companyId);
  const baseConfig: SARUploadConfig = { endpoint, usuario, passwordEncrypted, autoconfig: true };

  const detWrite = await writeSARSetting(
    supabaseService,
    keys.det,
    JSON.stringify(baseConfig),
    `Configuración de carga SAR del formulario 221 (${companyId})`,
    updatedBy,
    CONFIG_CATEGORY
  );
  if (detWrite.error) return detWrite;

  const existingAnnual = await readSetting(keys.annual);
  const annualConfig: any = { ...baseConfig };
  if (existingAnnual && typeof existingAnnual === 'object') {
    const prev = existingAnnual as any;
    if (prev.metodo) annualConfig.metodo = prev.metodo;
    if (prev.tipoDeclaracion) annualConfig.tipoDeclaracion = prev.tipoDeclaracion;
    if (prev.periodo) annualConfig.periodo = prev.periodo;
  }
  const annualWrite = await writeSARSetting(
    supabaseService,
    keys.annual,
    JSON.stringify(annualConfig),
    `Configuración de carga SAR de declaraciones anuales (${companyId})`,
    updatedBy,
    CONFIG_CATEGORY
  );
  if (annualWrite.error) return annualWrite;

  return writeSARSetting(
    supabaseService,
    keys.diat,
    JSON.stringify(baseConfig),
    `Configuración de carga SAR del DIAT (${companyId})`,
    updatedBy,
    CONFIG_CATEGORY
  );
}

function toPublicSession(session: SARSessionInfo): Omit<SARSessionInfo, 'sessionToken'> {
  const { sessionToken: _sessionToken, ...rest } = session;
  return rest;
}

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

    const live = await getLiveSARSession(empresa.companyId);
    const session = live.session
      ? toPublicSession(live.session)
      : { companyId: empresa.companyId, status: 'NO_CONECTADO' as const };

    return NextResponse.json({ status: 'OK', session });
  } catch (error) {
    const r = respuestaDeErrorDeEmpresa(error);
    if (r) return r;
    console.error('Error leyendo la sesión SAR:', error);
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
    const empresa = exigirEmpresa(
      await contextoDeEmpresa(request, {
        companyIdDeRuta: body?.companyId || body?.tenantId || undefined,
      })
    );
    const companyId = empresa.companyId;

    const endpoint = typeof body?.endpoint === 'string' ? body.endpoint.trim() : '';
    const user = typeof body?.user === 'string' ? body.user.trim() : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!endpoint) {
      return NextResponse.json(
        { ok: false, errorHint: 'CONFIG_INCOMPLETA', message: 'Faltan datos de conexión' },
        { status: 422 }
      );
    }
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(endpoint);
    } catch {
      return NextResponse.json(
        { ok: false, errorHint: 'CONFIG_INCOMPLETA', message: 'Faltan datos de conexión' },
        { status: 422 }
      );
    }
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return NextResponse.json(
        { ok: false, errorHint: 'CONFIG_INCOMPLETA', message: 'Faltan datos de conexión' },
        { status: 422 }
      );
    }
    if (!user || !password.trim()) {
      return NextResponse.json(
        { ok: false, errorHint: 'CONFIG_INCOMPLETA', message: 'Faltan datos de conexión' },
        { status: 422 }
      );
    }

    let passwordEncrypted: string;
    try {
      passwordEncrypted = encryptSARConfig({ usuario: user, password }).passwordEncrypted;
    } catch (error) {
      console.error('Error cifrando credenciales SAR:', error);
      return NextResponse.json(
        { ok: false, errorHint: 'CONFIG_INCOMPLETA', message: 'Faltan datos de conexión' },
        { status: 422 }
      );
    }

    const config: SARUploadConfig = {
      endpoint,
      usuario: user,
      passwordEncrypted,
      autoconfig: true,
    };

    const result = await verifySARCredentials(config, endpoint);

    if (result.status === 'CONECTADO') {
      const session: SARSessionInfo = {
        companyId,
        status: 'CONECTADO',
        endpoint,
        userLabel: user,
        verifiedAt: new Date().toISOString(),
        expiresAt: result.expiresAt,
        sessionToken: result.sessionToken,
      };
      const sessionBlob = encryptSARSession(session, { usuario: user, password });

      const write = await writeSARSetting(
        supabaseService,
        sarSessionKey(companyId),
        sessionBlob,
        `Sesión del portal SAR (${companyId})`,
        userId,
        CONFIG_CATEGORY
      );
      if (write.error) {
        console.error('Error guardando la sesión SAR:', write.error);
        return NextResponse.json(
          { ok: false, error: 'No se pudo guardar la sesión SAR' },
          { status: 500 }
        );
      }

      const configsWrite = await writeUploaderConfigs(companyId, endpoint, user, passwordEncrypted, userId);
      if (configsWrite.error) {
        console.error('Error sincronizando credenciales de subida SAR:', configsWrite.error);
      }

      return NextResponse.json({
        ok: true,
        session: {
          status: 'CONECTADO',
          endpoint: session.endpoint,
          userLabel: session.userLabel,
          verifiedAt: session.verifiedAt,
          expiresAt: session.expiresAt,
        },
      });
    }

    if (result.status === 'CREDENCIALES_INVALIDAS') {
      return NextResponse.json(
        {
          ok: false,
          errorHint: 'CREDENCIALES_INVALIDAS',
          message: 'Credenciales inválidas — verifica usuario y contraseña',
        },
        { status: 401 }
      );
    }
    if (result.status === 'CONFIG_INCOMPLETA') {
      return NextResponse.json(
        { ok: false, errorHint: 'CONFIG_INCOMPLETA', message: 'Faltan datos de conexión' },
        { status: 422 }
      );
    }
    if (result.status === 'PORTAL_NO_DISPONIBLE') {
      return NextResponse.json(
        { ok: false, errorHint: 'PORTAL_NO_DISPONIBLE', message: 'El portal SAR no responde — verifica tu conexión' },
        { status: 502 }
      );
    }
    return NextResponse.json(
      { ok: false, errorHint: 'RED', message: 'Error de red, reinténtalo' },
      { status: 502 }
    );
  } catch (error) {
    const r = respuestaDeErrorDeEmpresa(error);
    if (r) return r;
    console.error('Error verificando la sesión SAR:', error);
    return NextResponse.json(
      { ok: false, errorHint: 'RED', message: 'Error de red, reinténtalo' },
      { status: 502 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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

    const { error } = await supabaseService
      .from('system_settings')
      .delete()
      .eq('key', sarSessionKey(empresa.companyId));
    if (error) {
      console.error('Error borrando la sesión SAR:', error);
      return NextResponse.json({ ok: false, error: 'No se pudo cerrar la sesión SAR' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const r = respuestaDeErrorDeEmpresa(error);
    if (r) return r;
    console.error('Error cerrando la sesión SAR:', error);
    return NextResponse.json({ ok: false, error: 'Error interno del servidor' }, { status: 500 });
  }
}