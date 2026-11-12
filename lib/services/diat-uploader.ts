import { decryptSARConfig, isSARConfigComplete } from './det-uploader';
import type { SARUploadConfig } from './det-uploader';

export type DiatUploadStatus = 'SUCCESS' | 'CREDENCIALES' | 'RED' | 'PORTAL' | 'CONFIG';

export type DiatRecord = {
  tipoDocumento: string;
  numeroDocumento: string;
  fecha: string;
  rtn: string;
  nombre: string;
  cai: string;
  exento: number;
  gravado: number;
  impuesto: number;
  total: number;
};

export type DiatUploadPayload = {
  period: string;
  rtn: string;
  razonSocial: string;
  domicilioFiscal: string;
  telefono: string;
  email: string;
  regimen: string;
  totalVentas: number;
  impuestoVentas: number;
  totalCompras: number;
  impuestoCompras: number;
  creditoFiscal: number;
  isvAPagar: number;
  operaciones: number;
  ventas: DiatRecord[];
  compras: DiatRecord[];
};

export type DiatUploadResult = {
  ok: boolean;
  status: DiatUploadStatus;
  message: string;
  trackingCode?: string;
  portalResponse?: unknown;
  contentType?: string;
  bodyPreview?: string;
  attempts: number;
};

export type DiatConfig = SARUploadConfig;

const CONFIRMATION_PATTERN = /(recibido|confirmad|exito|éxito|success|aceptad)/i;

function isPeriodValid(period: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(String(period || ''));
}

function num(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function extractTrackingCode(text: string): string | undefined {
  if (!text) return undefined;
  const patterns = [
    /(?:codigo|code|folio|receipt|tracking|numero|número|correlativo)[^\d]{0,32}(\d{5,})/i,
    /(?:código|numero\simprimido|num)[^\d]{0,32}([A-Z0-9]{6,})/i,
    /([A-Z0-9]{6,}-\d{4,})/,
  ];
  for (const re of patterns) {
    const match = text.match(re);
    if (match?.[1]) return match[1].trim();
  }
  return undefined;
}

function classifySARResponse(
  status: number,
  text: string,
  config: { contentType?: string; attempts: number }
): DiatUploadResult {
  if (status === 401 || status === 403) {
    return {
      ok: false,
      status: 'CREDENCIALES',
      message: 'El portal SAR rechazó las credenciales (usuario o contraseña incorrectos).',
      contentType: config.contentType,
      bodyPreview: text.slice(0, 200).trim() || undefined,
      attempts: config.attempts,
    };
  }
  if (status >= 500) {
    return {
      ok: false,
      status: 'PORTAL',
      message: 'El portal SAR respondió con un error interno.',
      contentType: config.contentType,
      bodyPreview: text.slice(0, 200).trim() || undefined,
      attempts: config.attempts,
    };
  }
  if (status >= 200 && status < 300) {
    const parsed = parsePortalResponse(text);
    return {
      ok: true,
      status: 'SUCCESS',
      message: 'Enviado al portal SAR.',
      trackingCode: extractTrackingCode(text),
      portalResponse: parsed,
      contentType: config.contentType,
      bodyPreview: text.slice(0, 200).trim() || undefined,
      attempts: config.attempts,
    };
  }
  return {
    ok: false,
    status: 'PORTAL',
    message: 'El portal SAR respondió con un error interno.',
    contentType: config.contentType,
    bodyPreview: text.slice(0, 200).trim() || undefined,
    attempts: config.attempts,
  };
}

function parsePortalResponse(text: string): unknown {
  try {
    const trimmed = String(text || '').trim();
    if (!trimmed) return undefined;
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return JSON.parse(trimmed);
    }
    return { confirmed: CONFIRMATION_PATTERN.test(trimmed), raw: trimmed.slice(0, 200) };
  } catch {
    return { raw: String(text || '').slice(0, 200) };
  }
}

export function isDiatSARConfigComplete(config?: DiatConfig): boolean {
  return isSARConfigComplete(config);
}

export async function submitDiatToSARR(
  config: DiatConfig,
  diat: DiatUploadPayload,
  opts: { timeoutMs?: number; retries?: number } = {}
): Promise<DiatUploadResult> {
  if (!isDiatSARConfigComplete(config)) {
    return { ok: false, status: 'CONFIG', message: 'Configura la conexión al portal SAR (endpoint, usuario y contraseña).', attempts: 0 };
  }

  let creds: { usuario: string; password: string };
  try {
    creds = decryptSARConfig(config);
  } catch {
    return { ok: false, status: 'CONFIG', message: 'La configuración cifrada del portal SAR es inválida o está corrupta.', attempts: 0 };
  }

  const timeoutMs = opts.timeoutMs ?? 15000;
  const maxAttempts = opts.retries !== undefined ? Math.max(1, opts.retries + 1) : 2;

  const form = new FormData();
  form.append('usuario', creds.usuario);
  form.append('clave', creds.password);
  form.append('periodo', diat.period);
  form.append('formulario', 'DIAT');
  form.append('tipoFormulario', 'DIAT');
  form.append('rtn', diat.rtn || '');
  form.append('nombreDelContribuyente', diat.razonSocial || '');
  form.append('domicilioFiscal', diat.domicilioFiscal || '');
  form.append('telefono', diat.telefono || '');
  form.append('email', diat.email || '');
  form.append('regimen', diat.regimen || '');
  form.append('totalVentas', String(diat.totalVentas ?? 0));
  form.append('impuestoVentas', String(diat.impuestoVentas ?? 0));
  form.append('totalCompras', String(diat.totalCompras ?? 0));
  form.append('impuestoCompras', String(diat.impuestoCompras ?? 0));
  form.append('creditoFiscal', String(diat.creditoFiscal ?? 0));
  form.append('isvAPagar', String(diat.isvAPagar ?? 0));
  form.append('operaciones', String(diat.operaciones ?? 0));
  form.append('ventas', JSON.stringify(diat.ventas || []));
  form.append('compras', JSON.stringify(diat.compras || []));

  const authorization = 'Basic ' + Buffer.from(`${creds.usuario}:${creds.password}`).toString('base64');

  let attempts = 0;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
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
      return classifySARResponse(response.status, text, {
        contentType: response.headers.get('content-type') || undefined,
        attempts,
      });
    } catch (error) {
      const isTimeout = error instanceof Error && error.name === 'AbortError';
      const isNetworkError = error instanceof TypeError;
      if (!isTimeout && isNetworkError && attempt < maxAttempts) {
        continue;
      }
      return {
        ok: false,
        status: 'RED',
        message: 'No se pudo conectar con el portal SAR (problema de red o tiempo de espera agotado).',
        bodyPreview: isTimeout ? 'La conexión al portal tardó más del tiempo esperado.' : undefined,
        attempts,
      };
    } finally {
      clearTimeout(timer);
    }
  }
  return { ok: false, status: 'RED', message: 'No se pudo conectar con el portal SAR.', attempts };
}

export function validateDiatCompleteness(
  diat: DiatUploadPayload | null | undefined
): { ok: boolean; errors: { detalle: string }[]; warnings: { detalle: string }[] } {
  const errors: { detalle: string }[] = [];
  const warnings: { detalle: string }[] = [];

  if (!diat || typeof diat !== 'object') {
    return {
      ok: false,
      errors: [{ detalle: 'No hay datos DIAT para el período seleccionado.' }],
      warnings,
    };
  }

  const rtn = String(diat.rtn || '').trim();
  const razonSocial = String(diat.razonSocial || '').trim();
  if (!rtn) {
    errors.push({ detalle: 'Falta el RTN del declarante.' });
  }
  if (!razonSocial) {
    errors.push({ detalle: 'Falta la razón social del declarante.' });
  }
  if (!isPeriodValid(diat.period)) {
    errors.push({ detalle: 'El período del DIAT no es válido (formato esperado YYYY-MM).' });
  }

  const operaciones = num(diat.operaciones);
  if (operaciones === 0) {
    errors.push({ detalle: 'No hay operaciones (ventas o compras) registradas para el período.' });
  }

  const ventas = Array.isArray(diat.ventas) ? diat.ventas : [];
  ventas.forEach((record, index) => {
    const total = num(record?.total);
    if (total <= 0) return;
    if (!String(record?.nombre || '').trim()) {
      errors.push({ detalle: `Venta ${index + 1}: falta el nombre del cliente.` });
    }
    if (!String(record?.fecha || '').trim()) {
      errors.push({ detalle: `Venta ${index + 1} (${record?.nombre || 'sin nombre'}): falta la fecha del documento.` });
    }
    if (!String(record?.numeroDocumento || '').trim()) {
      errors.push({ detalle: `Venta ${index + 1} (${record?.nombre || 'sin nombre'}): falta el número del documento.` });
    }
    if (!String(record?.tipoDocumento || '').trim()) {
      warnings.push({ detalle: `Venta ${index + 1}: falta el tipo de documento (se enviará como FACT).` });
    }
  });

  const compras = Array.isArray(diat.compras) ? diat.compras : [];
  compras.forEach((record, index) => {
    const total = num(record?.total);
    if (total <= 0) return;
    if (!String(record?.nombre || '').trim()) {
      errors.push({ detalle: `Compra ${index + 1}: falta el nombre del proveedor.` });
    }
    if (!String(record?.fecha || '').trim()) {
      errors.push({ detalle: `Compra ${index + 1} (${record?.nombre || 'sin nombre'}): falta la fecha de la factura.` });
    }
    if (!String(record?.numeroDocumento || '').trim()) {
      errors.push({ detalle: `Compra ${index + 1} (${record?.nombre || 'sin nombre'}): falta el número de la factura.` });
    }
  });

  const isvAPagar = num(diat.isvAPagar);
  if (isvAPagar === 0) {
    warnings.push({ detalle: 'El ISV a pagar del período es cero; verifique antes de enviar.' });
  }

  const allWithTotal = [...ventas, ...compras].filter((r) => num(r?.total) > 0);
  const zeroAmount =
    allWithTotal.length > 0 &&
    allWithTotal.every((r) => num(r?.exento) === 0 && num(r?.gravado) === 0 && num(r?.impuesto) === 0);
  if (zeroAmount) {
    warnings.push({ detalle: 'Las operaciones registradas tienen montos en cero; verifique antes de enviar.' });
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function buildDiatUploadPayload(report: {
  period: string;
  declarante: {
    rtn?: string;
    razonSocial?: string;
    domicilioFiscal?: string;
    telefono?: string;
    email?: string;
    regimen?: string;
  };
  resumen: {
    totalVentas?: number;
    impuestoVentas?: number;
    totalCompras?: number;
    impuestoCompras?: number;
    creditoFiscal?: number;
    isvAPagar?: number;
    operaciones?: number;
  };
  ventas: {
    records: Array<{
      rtn?: string;
      nombre?: string;
      tipoDocumento?: string;
      numeroDocumento?: string;
      fecha?: string;
      cai?: string;
      exento?: number;
      gravado?: number;
      impuesto?: number;
      total?: number;
    }>;
  };
  compras: {
    records: Array<{
      supplierRtn?: string;
      supplierName?: string;
      invoiceNumber?: string;
      invoiceDate?: string;
      cai?: string;
      exento?: number;
      gravado?: number;
      impuesto?: number;
      total?: number;
    }>;
  };
}): DiatUploadPayload {
  const ventas = (report?.ventas?.records || []).map((r) => ({
    tipoDocumento: String(r?.tipoDocumento || 'FACT'),
    numeroDocumento: String(r?.numeroDocumento || ''),
    fecha: String(r?.fecha || ''),
    rtn: String(r?.rtn || ''),
    nombre: String(r?.nombre || ''),
    cai: String(r?.cai || ''),
    exento: num(r?.exento),
    gravado: num(r?.gravado),
    impuesto: num(r?.impuesto),
    total: num(r?.total),
  }));
  const compras = (report?.compras?.records || []).map((r) => ({
    tipoDocumento: 'FACT',
    numeroDocumento: String(r?.invoiceNumber || ''),
    fecha: String(r?.invoiceDate || ''),
    rtn: String(r?.supplierRtn || ''),
    nombre: String(r?.supplierName || ''),
    cai: String(r?.cai || ''),
    exento: num(r?.exento),
    gravado: num(r?.gravado),
    impuesto: num(r?.impuesto),
    total: num(r?.total),
  }));
  return {
    period: String(report?.period || ''),
    rtn: String(report?.declarante?.rtn || ''),
    razonSocial: String(report?.declarante?.razonSocial || ''),
    domicilioFiscal: String(report?.declarante?.domicilioFiscal || ''),
    telefono: String(report?.declarante?.telefono || ''),
    email: String(report?.declarante?.email || ''),
    regimen: String(report?.declarante?.regimen || ''),
    totalVentas: num(report?.resumen?.totalVentas),
    impuestoVentas: num(report?.resumen?.impuestoVentas),
    totalCompras: num(report?.resumen?.totalCompras),
    impuestoCompras: num(report?.resumen?.impuestoCompras),
    creditoFiscal: num(report?.resumen?.creditoFiscal),
    isvAPagar: num(report?.resumen?.isvAPagar),
    operaciones: num(report?.resumen?.operaciones),
    ventas,
    compras,
  };
}