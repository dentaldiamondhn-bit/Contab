import { decryptSARConfig, isSARConfigComplete } from './det-uploader';
import type { AnnualTaxSummary } from '@/lib/reports/annual-tax';

export type AnnualTaxDeclarationType = 'ISV' | 'ISR' | 'RETENCIONES';

export type AnnualSARUploadConfig = {
  endpoint: string;
  usuario: string;
  passwordEncrypted: string;
  autoconfig: boolean;
  metodo?: 'POST' | 'PUT';
  periodo?: string;
  tipoDeclaracion?: AnnualTaxDeclarationType;
};

export type AnnualTaxUploadResult = {
  ok: boolean;
  status?: number;
  contentType?: string;
  bodyPreview?: string;
  portalConfirmation?: boolean;
  errorHint?: 'CREDENCIALES' | 'RED' | 'PORTAL' | 'CONFIG';
  attempts?: number;
};

const CONFIRMATION_PATTERN = /(recibido|confirmad|exito|éxito|success|aceptad)/i;

export function isAnnualSARConfigComplete(config?: AnnualSARUploadConfig): boolean {
  return isSARConfigComplete(config);
}

export async function submitAnnualTaxToSARR(
  config: AnnualSARUploadConfig,
  payload?: AnnualTaxSummary | null,
  opts: {
    timeoutMs?: number;
    rtn?: string;
    nombre?: string;
    metodo?: 'POST' | 'PUT';
    formulario?: AnnualTaxDeclarationType;
    test?: boolean;
  } = {}
): Promise<AnnualTaxUploadResult> {
  if (!isAnnualSARConfigComplete(config)) {
    return { ok: false, errorHint: 'CONFIG', attempts: 0 };
  }

  let creds: { usuario: string; password: string };
  try {
    creds = decryptSARConfig(config);
  } catch {
    return { ok: false, errorHint: 'CONFIG', attempts: 0 };
  }

  const timeoutMs = opts.timeoutMs ?? 15000;
  const metodo = opts.metodo || config.metodo || 'POST';
  const formulario = opts.formulario || config.tipoDeclaracion || 'ISV';
  const periodo =
    config.periodo || String(payload?.isv?.periodo?.year || new Date().getFullYear());
  const isv = payload?.isv;
  const isr = payload?.isr;
  const retenciones = payload?.retenciones;

  const form = new FormData();
  form.append('usuario', creds.usuario);
  form.append('clave', creds.password);
  form.append('periodo', periodo);
  form.append('formulario', formulario);
  form.append('tipoFormulario', 'DECLARACION_ANUAL');
  if (!opts.test) {
    form.append('rtn', opts.rtn || '');
    form.append('nombreDelContribuyente', opts.nombre || '');
    form.append('totalISV_impuestoAPagar_o_saldoAFavor', String(isv?.amount ?? 0));
    form.append('baseISV', String(isv?.base ?? 0));
    form.append('baseISR', String(isr?.base ?? 0));
    form.append('tasaISR', '25');
    form.append('impuestoISR', String(isr?.amount ?? 0));
    form.append('retenciones_totales', String(retenciones?.amount ?? 0));
    form.append('retenciones_base', String(retenciones?.base ?? 0));
  }

  const authorization = 'Basic ' + Buffer.from(`${creds.usuario}:${creds.password}`).toString('base64');

  let attempts = 0;
  for (let attempt = 1; attempt <= 2; attempt++) {
    attempts = attempt;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(config.endpoint, {
        method: metodo,
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

export function validateAnnualTaxCompleteness(
  summary: AnnualTaxSummary | null | undefined,
  company: { rtn?: string; nombre?: string }
): { errors: { detalle: string }[]; warnings: { detalle: string }[] } {
  const errors: { detalle: string }[] = [];
  const warnings: { detalle: string }[] = [];

  const rtn = (company?.rtn || '').trim();
  const nombre = (company?.nombre || '').trim();
  if (!rtn) {
    errors.push({ detalle: 'Falta el RTN del contribuyente emisor.' });
  }
  if (!nombre) {
    errors.push({ detalle: 'Falta el nombre del contribuyente emisor.' });
  }

  const isv = summary?.isv;
  const isr = summary?.isr;
  const retenciones = summary?.retenciones;

  if (!isv || !(isv.base > 0)) {
    errors.push({ detalle: 'ISV: falta base gravable o tasa ISV aplicable para el ejercicio.' });
  } else if (isv.amount === 0) {
    warnings.push({ detalle: 'ISV: el impuesto a pagar es cero (posible saldo a favor).' });
  }

  if (!isr || !(isr.base > 0)) {
    errors.push({ detalle: 'ISR: falta base gravable (ingresos del ejercicio).' });
  } else if (isr.amount === 0) {
    warnings.push({ detalle: 'ISR: el impuesto calculado es cero en el ejercicio.' });
  }

  if (!retenciones || !(retenciones.amount > 0 || retenciones.base > 0)) {
    errors.push({ detalle: 'Retenciones: faltan montos de retención del ejercicio.' });
  } else if (retenciones.amount === 0) {
    warnings.push({ detalle: 'Retenciones: el monto total de retenciones es cero.' });
  }

  return { errors, warnings };
}