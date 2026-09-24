import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { supabase as supabaseService } from '@/lib/supabase-db';
import { encryptSARConfig } from '@/lib/services/det-uploader';
import { submitAnnualTaxToSARR, validateAnnualTaxCompleteness } from '@/lib/services/annual-tax-uploader';
import { getLiveSARSession, isSARSessionValid } from '@/lib/services/sar-session';
import type {
  AnnualSARUploadConfig,
  AnnualTaxDeclarationType,
} from '@/lib/services/annual-tax-uploader';

const CONFIG_CATEGORY = 'sar';
const CONFIG_KEY_PREFIX = 'annual_tax_sar_config';

const ERROR_HINTS: Record<string, string> = {
  CONFIG: 'Configura la conexión al portal SAR para poder subir la declaración.',
  CREDENCIALES: 'El portal SAR rechazó las credenciales (usuario o contraseña incorrectos).',
  RED: 'No se pudo conectar con el portal SAR (problema de red o tiempo de espera agotado).',
  PORTAL: 'El portal SAR respondió con un error interno.',
};

const DECLARATION_TYPES: AnnualTaxDeclarationType[] = ['ISV', 'ISR', 'RETENCIONES'];

function configKey(tenantId: string): string {
  return `${CONFIG_KEY_PREFIX}:${tenantId}`;
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

async function readAnnualTaxConfig(tenantId: string): Promise<AnnualSARUploadConfig | null> {
  const { data, error } = await supabaseService
    .from('system_settings')
    .select('value')
    .eq('key', configKey(tenantId))
    .maybeSingle();
  if (error || !data?.value) return null;
  try {
    const parsed = JSON.parse(data.value);
    if (parsed && typeof parsed === 'object' && parsed.passwordEncrypted) {
      return parsed as AnnualSARUploadConfig;
    }
    return null;
  } catch {
    return null;
  }
}

async function writeAnnualTaxConfig(
  tenantId: string,
  config: AnnualSARUploadConfig,
  updatedBy: string
): Promise<{ error: any }> {
  const value = JSON.stringify(config);
  const row = {
    key: configKey(tenantId),
    value,
    description: `Configuración de carga SAR de declaraciones anuales (${tenantId})`,
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

function buildSummaryPreview(summary: any): {
  periodo?: number;
  baseISR: number;
  isv: number;
  isr: number;
  retenciones: number;
} | null {
  if (!summary || typeof summary !== 'object') return null;
  return {
    periodo: summary?.isv?.periodo?.year,
    baseISR: summary?.isr?.base ?? 0,
    isv: summary?.isv?.amount ?? 0,
    isr: summary?.isr?.amount ?? 0,
    retenciones: summary?.retenciones?.amount ?? 0,
  };
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
    const { tenantId } = body || {};
    if (!tenantId) {
      return NextResponse.json(
        { ok: false, errorHint: 'CONFIG', error: 'Tenant ID requerido' },
        { status: 400 }
      );
    }

    const canAccess = await canAccessTenant(userId, tenantId, request.headers.get('x-tenant-id'));
    if (!canAccess) {
      return NextResponse.json(
        { ok: false, errorHint: 'CONFIG', error: 'Empresa no encontrada o sin permiso' },
        { status: 404 }
      );
    }

    const action = body?.action || 'upload';

    if (action === 'get-config') {
      const config = await readAnnualTaxConfig(tenantId);
      if (!config) {
        return NextResponse.json({
          configured: false,
          endpoint: '',
          usuario: '',
          hasPassword: false,
          tipoDeclaracion: undefined,
          metodo: undefined,
          periodo: undefined,
        });
      }
      return NextResponse.json({
        configured: true,
        endpoint: config.endpoint,
        usuario: config.usuario,
        hasPassword: !!config.passwordEncrypted,
        tipoDeclaracion: config.tipoDeclaracion,
        metodo: config.metodo,
        periodo: config.periodo,
      });
    }

    if (action === 'save-config') {
      const { endpoint, usuario, password, metodo, periodo, tipoDeclaracion } = body || {};

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

      const existing = await readAnnualTaxConfig(tenantId);
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

      const config: AnnualSARUploadConfig = {
        endpoint: endpoint.trim(),
        usuario: usuario.trim(),
        passwordEncrypted,
        autoconfig: true,
        metodo: metodo === 'PUT' ? 'PUT' : 'POST',
        periodo: typeof periodo === 'string' && periodo.trim() ? periodo.trim() : undefined,
        tipoDeclaracion: DECLARATION_TYPES.includes(tipoDeclaracion)
          ? (tipoDeclaracion as AnnualTaxDeclarationType)
          : undefined,
      };

      const { error } = await writeAnnualTaxConfig(tenantId, config, userId);
      if (error) {
        console.error('Error guardando configuración SAR de declaraciones anuales:', error);
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
        tipoDeclaracion: config.tipoDeclaracion,
        metodo: config.metodo,
        periodo: config.periodo,
      });
    }

    if (action === 'test') {
      const config = await readAnnualTaxConfig(tenantId);
      if (!config) {
        return NextResponse.json({ ok: false, errorHint: 'CONFIG', error: ERROR_HINTS.CONFIG });
      }
      const result = await submitAnnualTaxToSARR(config, null, { test: true });
      return NextResponse.json({
        ...result,
        error: !result.ok && result.errorHint ? ERROR_HINTS[result.errorHint] : undefined,
      });
    }

    const { summary, company, tipo } = body || {};
    const companyInfo = { rtn: company?.rtn, nombre: company?.nombre };

    const sessionState = await getLiveSARSession(tenantId);
    if (!isSARSessionValid(sessionState.session)) {
      return NextResponse.json({
        ok: false,
        status: 'SESION',
        errorHint: 'SESION_NO_VERIFICADA',
        message: 'No hay una sesión verificada con el portal SAR — conecta primero',
        error: 'No hay una sesión verificada con el portal SAR — conecta primero',
      });
    }

    const completeness = validateAnnualTaxCompleteness(summary, companyInfo);
    if (completeness.errors.length > 0) {
      return NextResponse.json({
        ok: false,
        errorHint: 'CONFIG',
        validationErrors: completeness.errors,
        warnings: completeness.warnings,
        error: 'Faltan datos requeridos para subir la declaración al portal SAR.',
        summaryPreview: buildSummaryPreview(summary),
      });
    }

    const config = await readAnnualTaxConfig(tenantId);
    if (!config) {
      return NextResponse.json({ ok: false, errorHint: 'CONFIG', error: ERROR_HINTS.CONFIG });
    }

    const formulario = DECLARATION_TYPES.includes(tipo)
      ? (tipo as AnnualTaxDeclarationType)
      : undefined;

    const result = await submitAnnualTaxToSARR(config, summary, {
      rtn: companyInfo.rtn,
      nombre: companyInfo.nombre,
      formulario,
    });

    return NextResponse.json({
      ...result,
      warnings: completeness.warnings,
      summaryPreview: buildSummaryPreview(summary),
      error: !result.ok && result.errorHint ? ERROR_HINTS[result.errorHint] : undefined,
    });
  } catch (error) {
    console.error('Error subiendo declaraciones anuales al portal SAR:', error);
    return NextResponse.json(
      { ok: false, errorHint: 'CONFIG', error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}