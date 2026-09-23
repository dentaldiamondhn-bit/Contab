import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

export type SARUploadConfig = {
  endpoint: string;
  usuario: string;
  passwordEncrypted: string;
  autoconfig: boolean;
};

const AES_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const CONFIRMATION_PATTERN = /(recibido|confirmad|exito|éxito|success|aceptad)/i;

function deriveKey(key?: string): Buffer {
  const raw = key || process.env.SAR_ENC_KEY;
  if (!raw || raw.length < 32) {
    throw new Error(
      'No se puede cifrar/descifrar la configuración SAR: falta la variable de entorno SAR_ENC_KEY (mínimo 32 caracteres).'
    );
  }
  return createHash('sha256').update(raw).digest();
}

export function encryptSARConfig(
  plain: { usuario: string; password: string },
  key?: string
): { usuario: string; passwordEncrypted: string } {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(AES_ALGORITHM, deriveKey(key), iv);
  const encrypted = Buffer.concat([cipher.update(plain.password, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    usuario: plain.usuario,
    passwordEncrypted: Buffer.concat([iv, authTag, encrypted]).toString('base64'),
  };
}

export function decryptSARConfig(config: SARUploadConfig, key?: string): { usuario: string; password: string } {
  if (!config?.passwordEncrypted) {
    throw new Error('No hay contraseña cifrada en la configuración SAR.');
  }
  const payload = Buffer.from(config.passwordEncrypted, 'base64');
  if (payload.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) {
    throw new Error('La configuración cifrada SAR es inválida o está corrupta.');
  }
  const iv = payload.subarray(0, IV_LENGTH);
  const authTag = payload.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const data = payload.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = createDecipheriv(AES_ALGORITHM, deriveKey(key), iv);
  decipher.setAuthTag(authTag);
  const password = Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  return { usuario: config.usuario ?? '', password };
}

export function isSARConfigComplete(config?: SARUploadConfig): boolean {
  return !!config && !!config.endpoint && !!config.usuario && !!config.passwordEncrypted;
}

export type DETUploadResult = {
  ok: boolean;
  status?: number;
  contentType?: string;
  bodyPreview?: string;
  portalConfirmation?: boolean;
  errorHint?: string;
  attempts?: number;
};

function sanitizeFilenamePart(value: string, fallback: string): string {
  const cleaned = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\\/:*?"<>|]/g, '')
    .trim()
    .replace(/\s+/g, '_');
  return cleaned || fallback;
}

export async function submitDETToSARR(
  config: SARUploadConfig,
  detText: string,
  opts: { timeoutMs?: number; periodo?: string; cai?: string; correlativo?: string } = {}
): Promise<DETUploadResult> {
  if (!isSARConfigComplete(config)) {
    return { ok: false, errorHint: 'CONFIG', attempts: 0 };
  }

  let creds: { usuario: string; password: string };
  try {
    creds = decryptSARConfig(config);
  } catch {
    return { ok: false, errorHint: 'CONFIG', attempts: 0 };
  }

  const timeoutMs = opts.timeoutMs ?? 15000;

  const form = new FormData();
  form.append('usuario', creds.usuario);
  form.append('clave', creds.password);
  form.append('periodo', opts.periodo || '');
  form.append('tipoFormulario', '221');
  form.append('cai', opts.cai || '');
  form.append('correlativo', opts.correlativo || '');
  const filename = `DET_${sanitizeFilenamePart(opts.cai, 'CAI')}_${sanitizeFilenamePart(
    opts.correlativo,
    '0'
  )}_${sanitizeFilenamePart(creds.usuario, 'empresa')}.txt`;
  form.append('archivo', new Blob([detText], { type: 'text/plain;charset=utf-8' }), filename);

  const authorization = 'Basic ' + Buffer.from(`${creds.usuario}:${creds.password}`).toString('base64');

  let attempts = 0;
  for (let attempt = 1; attempt <= 2; attempt++) {
    attempts = attempt;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(config.endpoint, {
        method: 'POST',
        headers: { Authorization: authorization },
        body: form,
        signal: controller.signal,
      });
      const text = await response.text();
      const bodyPreview = text.slice(0, 200).trim() || undefined;
      const contentType = response.headers.get('content-type') || undefined;

      if (response.status === 401 || response.status === 403) {
        return {
          ok: false,
          status: response.status,
          contentType,
          bodyPreview,
          portalConfirmation: false,
          errorHint: 'CREDENCIALES',
          attempts,
        };
      }
      if (response.status >= 500) {
        return {
          ok: false,
          status: response.status,
          contentType,
          bodyPreview,
          portalConfirmation: false,
          errorHint: 'PORTAL',
          attempts,
        };
      }
      if (response.status >= 200 && response.status < 300) {
        return {
          ok: true,
          status: response.status,
          contentType,
          bodyPreview,
          portalConfirmation: CONFIRMATION_PATTERN.test(text),
          attempts,
        };
      }
      return {
        ok: false,
        status: response.status,
        contentType,
        bodyPreview,
        portalConfirmation: false,
        errorHint: 'PORTAL',
        attempts,
      };
    } catch (error) {
      const isTimeout = error instanceof Error && error.name === 'AbortError';
      const isNetworkError = error instanceof TypeError;
      if (!isTimeout && isNetworkError && attempt < 2) {
        continue;
      }
      return {
        ok: false,
        errorHint: 'RED',
        bodyPreview: isTimeout ? 'La conexión al portal tardó más del tiempo esperado.' : undefined,
        attempts,
      };
    } finally {
      clearTimeout(timer);
    }
  }
  return { ok: false, errorHint: 'RED', attempts };
}