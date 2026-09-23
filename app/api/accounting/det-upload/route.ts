import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { supabase as supabaseService } from '@/lib/supabase-db';
import { submitDETToSARR } from '@/lib/services/det-uploader';
import type { SARUploadConfig } from '@/lib/services/det-uploader';

const ERROR_HINTS: Record<string, string> = {
  CONFIG: 'Configura primero la carga SAR (Perfil → SAR).',
  CREDENCIALES: 'El portal SAR rechazó las credenciales (usuario o contraseña incorrectos).',
  RED: 'No se pudo conectar con el portal SAR (problema de red o tiempo de espera agotado).',
  PORTAL: 'El portal SAR respondió con un error interno.',
};

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
    .eq('key', `sar_config:${tenantId}`)
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
    const { tenantId, detText, periodo, cai, correlativo } = body || {};
    if (!tenantId) {
      return NextResponse.json({ ok: false, errorHint: 'CONFIG', error: 'Tenant ID requerido' }, { status: 400 });
    }

    const canAccess = await canAccessTenant(userId, tenantId, request.headers.get('x-tenant-id'));
    if (!canAccess) {
      return NextResponse.json(
        { ok: false, errorHint: 'CONFIG', error: 'Empresa no encontrada o sin permiso' },
        { status: 404 }
      );
    }

    const config = await readSARConfig(tenantId);
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
    console.error('Error subiendo DET al portal SAR:', error);
    return NextResponse.json(
      { ok: false, errorHint: 'CONFIG', error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}