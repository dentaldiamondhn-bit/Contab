import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { supabase as supabaseService } from '@/lib/supabase-db';
import { encryptSARConfig, isSARConfigComplete } from '@/lib/services/det-uploader';
import type { SARUploadConfig } from '@/lib/services/det-uploader';

const CONFIG_CATEGORY = 'sar';

function configKey(tenantId: string): string {
  return `sar_config:${tenantId}`;
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

async function readSARConfig(tenantId: string): Promise<SARUploadConfig | null> {
  const { data, error } = await supabaseService
    .from('system_settings')
    .select('value')
    .eq('key', configKey(tenantId))
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
  tenantId: string,
  config: SARUploadConfig,
  updatedBy: string
): Promise<{ error: any }> {
  const value = JSON.stringify(config);
  const row = {
    key: configKey(tenantId),
    value,
    description: `Configuración de carga SAR del formulario 221 (${tenantId})`,
    category: CONFIG_CATEGORY,
    updated_at: new Date().toISOString(),
    updated_by: updatedBy,
  };
  const { data: existing } = await supabaseService
    .from('system_settings')
    .select('key')
    .eq('key', configKey(tenantId))
    .maybeSingle();
  if (existing) {
    const { error } = await supabaseService
      .from('system_settings')
      .update(row)
      .eq('key', configKey(tenantId));
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

    const tenantId =
      new URL(request.url).searchParams.get('tenantId') || request.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID requerido' }, { status: 400 });
    }

    const canAccess = await canAccessTenant(userId, tenantId, request.headers.get('x-tenant-id'));
    if (!canAccess) {
      return NextResponse.json({ error: 'Empresa no encontrada o sin permiso' }, { status: 404 });
    }

    const config = await readSARConfig(tenantId);
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
    const { tenantId, endpoint, usuario, password } = body || {};
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID requerido' }, { status: 400 });
    }

    const canAccess = await canAccessTenant(userId, tenantId, request.headers.get('x-tenant-id'));
    if (!canAccess) {
      return NextResponse.json({ error: 'Empresa no encontrada o sin permiso' }, { status: 404 });
    }

    if (typeof endpoint !== 'string' || !endpoint.trim()) {
      return NextResponse.json({ error: 'El endpoint del portal SAR es obligatorio' }, { status: 400 });
    }
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(endpoint.trim());
    } catch {
      return NextResponse.json({ error: 'El endpoint del portal SAR no es una URL válida' }, { status: 400 });
    }
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return NextResponse.json({ error: 'El endpoint del portal SAR debe ser http(s)' }, { status: 400 });
    }
    if (typeof usuario !== 'string' || !usuario.trim()) {
      return NextResponse.json({ error: 'El usuario del portal SAR es obligatorio' }, { status: 400 });
    }

    const existing = await readSARConfig(tenantId);
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

    const { error } = await writeSARConfig(tenantId, config, userId);
    if (error) {
      console.error('Error guardando configuración SAR:', error);
      return NextResponse.json({ error: 'No se pudo guardar la configuración SAR' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, configured: true });
  } catch (error) {
    console.error('Error guardando configuración SAR:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}