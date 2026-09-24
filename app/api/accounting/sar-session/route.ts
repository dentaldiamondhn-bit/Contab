import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
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

function uploaderConfigKeys(tenantId: string) {
  return {
    det: `sar_config:${tenantId}`,
    annual: `annual_tax_sar_config:${tenantId}`,
    diat: `diat_sar_config:${tenantId}`,
  };
}

async function getUserTenantId(userId: string): Promise<string | null> {
  try {
    const byAuth = await (db as any).user.findFirst({
      where: { authId: userId },
      select: { tenantId: true },
    });
    if (byAuth?.tenantId) return byAuth.tenantId;
  } catch {
    /* la búsqueda por authId puede fallar si el esquema difiere; se ignora */
  }
  try {
    const byId = await (db as any).user.findFirst({
      where: { id: userId },
      select: { tenantId: true },
    });
    if (byId?.tenantId) return byId.tenantId;
  } catch {
    /* el id de Clerk puede no ser un UUID válido para la columna id */
  }
  return null;
}

async function canAccessTenant(
  userId: string,
  requestedTenantId: string,
  headerTenantId: string | null
): Promise<boolean> {
  const trimmed = (requestedTenantId || '').trim();
  if (!trimmed) return false;

  const headerTenant = (headerTenantId || '').trim();
  if (headerTenant && headerTenant === trimmed) return true;

  const userTenant = await getUserTenantId(userId);
  if (userTenant && userTenant === trimmed) return true;

  const ownerTenant = headerTenant || userTenant || '';
  if (!ownerTenant) return false;

  const { data, error } = await supabaseService
    .from('companies')
    .select('id')
    .eq('id', trimmed)
    .eq('tenant_id', ownerTenant)
    .maybeSingle();
  return !error && !!data;
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
  tenantId: string,
  endpoint: string,
  usuario: string,
  passwordEncrypted: string,
  updatedBy: string
): Promise<{ error: any }> {
  const keys = uploaderConfigKeys(tenantId);
  const baseConfig: SARUploadConfig = { endpoint, usuario, passwordEncrypted, autoconfig: true };

  const detWrite = await writeSARSetting(
    supabaseService,
    keys.det,
    JSON.stringify(baseConfig),
    `Configuración de carga SAR del formulario 221 (${tenantId})`,
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
    `Configuración de carga SAR de declaraciones anuales (${tenantId})`,
    updatedBy,
    CONFIG_CATEGORY
  );
  if (annualWrite.error) return annualWrite;

  return writeSARSetting(
    supabaseService,
    keys.diat,
    JSON.stringify(baseConfig),
    `Configuración de carga SAR del DIAT (${tenantId})`,
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

    const companyId =
      new URL(request.url).searchParams.get('companyId') ||
      new URL(request.url).searchParams.get('tenantId') ||
      request.headers.get('x-tenant-id');
    if (!companyId) {
      return NextResponse.json({ error: 'Empresa requerida' }, { status: 400 });
    }

    const canAccess = await canAccessTenant(userId, companyId, request.headers.get('x-tenant-id'));
    if (!canAccess) {
      return NextResponse.json({ error: 'Empresa no encontrada o sin permiso' }, { status: 404 });
    }

    const live = await getLiveSARSession(companyId);
    const session = live.session
      ? toPublicSession(live.session)
      : { companyId, status: 'NO_CONECTADO' as const };

    return NextResponse.json({ status: 'OK', session });
  } catch (error) {
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
    const companyId = body?.companyId || body?.tenantId;
    if (!companyId) {
      return NextResponse.json(
        { ok: false, errorHint: 'CONFIG_INCOMPLETA', message: 'Faltan datos de conexión' },
        { status: 422 }
      );
    }

    const canAccess = await canAccessTenant(userId, companyId, request.headers.get('x-tenant-id'));
    if (!canAccess) {
      return NextResponse.json(
        { ok: false, error: 'Empresa no encontrada o sin permiso' },
        { status: 404 }
      );
    }

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

    const companyId =
      new URL(request.url).searchParams.get('companyId') ||
      new URL(request.url).searchParams.get('tenantId') ||
      request.headers.get('x-tenant-id');
    if (!companyId) {
      return NextResponse.json({ error: 'Empresa requerida' }, { status: 400 });
    }

    const canAccess = await canAccessTenant(userId, companyId, request.headers.get('x-tenant-id'));
    if (!canAccess) {
      return NextResponse.json({ error: 'Empresa no encontrada o sin permiso' }, { status: 404 });
    }

    const { error } = await supabaseService.from('system_settings').delete().eq('key', sarSessionKey(companyId));
    if (error) {
      console.error('Error borrando la sesión SAR:', error);
      return NextResponse.json({ ok: false, error: 'No se pudo cerrar la sesión SAR' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error cerrando la sesión SAR:', error);
    return NextResponse.json({ ok: false, error: 'Error interno del servidor' }, { status: 500 });
  }
}