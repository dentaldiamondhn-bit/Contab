/**
 * Doble de `@/lib/services/sar-session` para `tests/sar`.
 *
 * `writeSARSetting` escribe de verdad en el `system_settings` del supabase falso
 * (mismo patron que el real), para poder observar la clave resultante. Y
 * `getLiveSARSession` lee ESA clave de su propio `companyId`: si test 1 conecta,
 * test 2 sigue sin sesion. Es lo que prueba el aislamiento end-to-end.
 */
import { getSupabaseServer } from './fake-supabase.mjs';

const sb = getSupabaseServer();

export const SAR_SESSION_KEY_PREFIX = 'sar_session';
export const SESSION_DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

export function sarSessionKey(companyId) {
  return `${SAR_SESSION_KEY_PREFIX}:${companyId}`;
}

export async function writeSARSetting(client, key, value, description, updatedBy, category = 'sar') {
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

export function encryptSARSession(session, creds) {
  return JSON.stringify({
    companyId: session.companyId,
    status: session.status,
    endpoint: session.endpoint,
    userLabel: session.userLabel,
    usuario: creds.usuario,
    passwordEncrypted: `enc:${creds.password}`,
    autoconfig: true,
  });
}

export function isSARSessionValid(session) {
  return !!session && session.status === 'CONECTADO';
}

export async function getLiveSARSession(companyId) {
  const { data } = await sb
    .from('system_settings')
    .select('value')
    .eq('key', sarSessionKey(companyId))
    .maybeSingle();
  if (!data?.value) {
    return { session: { companyId, status: 'NO_CONECTADO' }, errorHint: 'NO_CONECTADO' };
  }
  return {
    session: {
      companyId,
      status: 'CONECTADO',
      endpoint: 'https://sar.test/api',
      userLabel: 'u',
      verifiedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + SESSION_DEFAULT_TTL_MS).toISOString(),
    },
  };
}

export async function verifySARCredentials(config) {
  if (!config?.passwordEncrypted) return { ok: false, status: 'CONFIG_INCOMPLETA' };
  return {
    ok: true,
    status: 'CONECTADO',
    expiresAt: new Date(Date.now() + SESSION_DEFAULT_TTL_MS).toISOString(),
    sessionToken: 'token-de-prueba',
  };
}

export function encryptSARSessionForTest(session, creds) {
  return encryptSARSession(session, creds);
}
