import { encryptSARConfig, decryptSARConfig, isSARConfigComplete } from './det-uploader';
import type { SARUploadConfig } from './det-uploader';
import { supabase as supabaseService } from '@/lib/supabase-db';

export type SARConnectionStatus =
  | 'NO_CONECTADO'
  | 'VERIFICANDO'
  | 'CONECTADO'
  | 'CREDENCIALES_INVALIDAS'
  | 'PORTAL_NO_DISPONIBLE'
  | 'CONFIG_INCOMPLETA'
  | 'SESION_VENCIDA';

export interface SARSessionInfo {
  companyId: string;
  status: SARConnectionStatus;
  endpoint?: string;
  userLabel?: string;
  verifiedAt?: string;
  expiresAt?: string;
  lastError?: string;
  sessionToken?: string;
}

export interface SARVerifyResult {
  ok: boolean;
  status: SARConnectionStatus;
  portalMessage?: string;
  sessionToken?: string;
  expiresAt?: string;
}

export const SAR_SESSION_KEY_PREFIX = 'sar_session';
export const SESSION_DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

export function sarSessionKey(companyId: string): string {
  return `${SAR_SESSION_KEY_PREFIX}:${companyId}`;
}

export async function writeSARSetting(
  client: any,
  key: string,
  value: string,
  description: string,
  updatedBy: string,
  category: string = 'sar'
): Promise<{ error: any }> {
  const row = {
    key,
    value,
    description,
    category,
    updated_at: new Date().toISOString(),
    updated_by: updatedBy,
  };
  const { data: existing } = await client
    .from('system_settings')
    .select('key')
    .eq('key', key)
    .maybeSingle();
  if (existing) {
    const { error } = await client.from('system_settings').update(row).eq('key', key);
    return { error };
  }
  const { error } = await client.from('system_settings').insert([row]);
  return { error };
}

function parseVerificationPayload(text: string): { sessionToken?: string; expiresAt?: string } | null {
  const trimmed = String(text || '').trim();
  if (!trimmed) return null;
  try {
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object') {
        const root = Array.isArray(parsed) ? parsed[0] || {} : parsed;
        const token = root.sessionToken || root.token || root.session?.token;
        const expiresAt = root.expiresAt || root.expiration || root.expires;
        return {
          sessionToken: typeof token === 'string' && token ? token : undefined,
          expiresAt:
            typeof expiresAt === 'string' && !Number.isNaN(Date.parse(expiresAt))
              ? expiresAt
              : undefined,
        };
      }
    }
  } catch {
    return null;
  }
  return null;
}

export async function verifySARCredentials(
  sarConfig: SARUploadConfig,
  endpoint?: string
): Promise<SARVerifyResult> {
  if (!isSARConfigComplete(sarConfig) || !sarConfig.passwordEncrypted) {
    return { ok: false, status: 'CONFIG_INCOMPLETA' };
  }

  let creds: { usuario: string; password: string };
  try {
    creds = decryptSARConfig(sarConfig);
  } catch {
    return { ok: false, status: 'CONFIG_INCOMPLETA' };
  }

  const target = (endpoint?.trim() || sarConfig.endpoint || '').trim();
  if (!target) {
    return { ok: false, status: 'CONFIG_INCOMPLETA' };
  }

  const form = new FormData();
  form.append('usuario', creds.usuario);
  form.append('clave', creds.password);
  form.append('periodo', String(new Date().getFullYear()));
  form.append('formulario', 'ISV');
  form.append('tipoFormulario', 'DECLARACION_ANUAL');

  const authorization = 'Basic ' + Buffer.from(`${creds.usuario}:${creds.password}`).toString('base64');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(target, {
      method: 'POST',
      headers: { Authorization: authorization },
      body: form,
      signal: controller.signal,
    });
    const text = await response.text();

    if (response.status === 401 || response.status === 403) {
      return {
        ok: false,
        status: 'CREDENCIALES_INVALIDAS',
        portalMessage: text.slice(0, 200).trim() || undefined,
      };
    }
    if (response.status >= 500) {
      return {
        ok: false,
        status: 'PORTAL_NO_DISPONIBLE',
        portalMessage: text.slice(0, 200).trim() || undefined,
      };
    }
    if (response.status >= 200 && response.status < 300) {
      const parsed = parseVerificationPayload(text);
      const now = new Date();
      const expiresAt = parsed?.expiresAt || new Date(now.getTime() + SESSION_DEFAULT_TTL_MS).toISOString();
      return {
        ok: true,
        status: 'CONECTADO',
        portalMessage: text.slice(0, 200).trim() || undefined,
        sessionToken: parsed?.sessionToken,
        expiresAt,
      };
    }
    return {
      ok: false,
      status: 'PORTAL_NO_DISPONIBLE',
      portalMessage: text.slice(0, 200).trim() || undefined,
    };
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === 'AbortError';
    return {
      ok: false,
      status: 'PORTAL_NO_DISPONIBLE',
      portalMessage: isTimeout ? 'La conexión al portal tardó más del tiempo esperado.' : undefined,
    };
  } finally {
    clearTimeout(timer);
  }
}

export function encryptSARSession(
  session: SARSessionInfo,
  creds: { usuario: string; password: string },
  key?: string
): string {
  const encrypted = encryptSARConfig(creds, key);
  const payload = {
    v: 1,
    companyId: session.companyId,
    status: session.status,
    endpoint: session.endpoint,
    userLabel: session.userLabel || encrypted.usuario,
    verifiedAt: session.verifiedAt,
    expiresAt: session.expiresAt,
    lastError: session.lastError,
    sessionToken: session.sessionToken,
    usuario: encrypted.usuario,
    passwordEncrypted: encrypted.passwordEncrypted,
    autoconfig: true,
  };
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
}

export function decryptSARSession(
  blob: string,
  key?: string
): { session: SARSessionInfo; config: SARUploadConfig } {
  let parsed: any;
  try {
    parsed = JSON.parse(Buffer.from(blob, 'base64').toString('utf8'));
  } catch {
    throw new Error('La sesión SAR cifrada es inválida o está corrupta.');
  }
  if (!parsed || typeof parsed !== 'object' || typeof parsed.passwordEncrypted !== 'string') {
    throw new Error('La sesión SAR cifrada no contiene credenciales.');
  }
  const config: SARUploadConfig = {
    endpoint: typeof parsed.endpoint === 'string' ? parsed.endpoint : '',
    usuario: typeof parsed.usuario === 'string' ? parsed.usuario : '',
    passwordEncrypted: parsed.passwordEncrypted,
    autoconfig: true,
  };
  decryptSARConfig(config, key);
  const session: SARSessionInfo = {
    companyId: typeof parsed.companyId === 'string' ? parsed.companyId : '',
    status: parsed.status || 'NO_CONECTADO',
    endpoint: config.endpoint || undefined,
    userLabel: typeof parsed.userLabel === 'string' ? parsed.userLabel : config.usuario,
    verifiedAt: typeof parsed.verifiedAt === 'string' ? parsed.verifiedAt : undefined,
    expiresAt: typeof parsed.expiresAt === 'string' ? parsed.expiresAt : undefined,
    lastError: typeof parsed.lastError === 'string' ? parsed.lastError : undefined,
    sessionToken: typeof parsed.sessionToken === 'string' ? parsed.sessionToken : undefined,
  };
  return { session, config };
}

export function isSARSessionValid(session?: SARSessionInfo | null): boolean {
  if (!session || session.status !== 'CONECTADO') return false;
  if (!session.expiresAt) return true;
  return new Date(session.expiresAt).getTime() > Date.now();
}

export async function getLiveSARSession(
  companyId: string,
  opts: { updatedBy?: string } = {}
): Promise<{ session?: SARSessionInfo; errorHint?: string }> {
  if (!companyId) {
    return { session: { companyId: '', status: 'NO_CONECTADO' }, errorHint: 'NO_CONECTADO' };
  }
  const { data, error } = await supabaseService
    .from('system_settings')
    .select('value')
    .eq('key', sarSessionKey(companyId))
    .maybeSingle();
  if (error || !data?.value) {
    return { session: { companyId, status: 'NO_CONECTADO' }, errorHint: 'NO_CONECTADO' };
  }

  let stored: { session: SARSessionInfo; config: SARUploadConfig };
  try {
    stored = decryptSARSession(data.value);
  } catch {
    return { session: { companyId, status: 'SESION_VENCIDA' }, errorHint: 'SESION_INVALIDA' };
  }

  if (isSARSessionValid(stored.session)) {
    return { session: stored.session };
  }

  const result = await verifySARCredentials(stored.config, stored.session.endpoint);
  if (result.ok) {
    const updated: SARSessionInfo = {
      companyId,
      status: 'CONECTADO',
      endpoint: stored.session.endpoint,
      userLabel: stored.session.userLabel,
      verifiedAt: new Date().toISOString(),
      expiresAt: result.expiresAt,
      sessionToken: result.sessionToken,
    };
    try {
      const creds = decryptSARConfig(stored.config);
      const blob = encryptSARSession(updated, creds);
      await writeSARSetting(
        supabaseService,
        sarSessionKey(companyId),
        blob,
        `Sesión del portal SAR (${companyId})`,
        opts.updatedBy || 'system'
      );
    } catch {
      return { session: updated };
    }
    return { session: updated };
  }

  return {
    session: { companyId, status: result.status, lastError: result.portalMessage },
    errorHint: result.status,
  };
}