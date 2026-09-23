import { getDETFileSpec } from '@/lib/services/det-live-core';

export type DETTipoOperacion = 'COMPRA' | 'VENTA';

export type DETRecord = {
  rtn: string;
  nombre: string;
  tipoDocumento: string;
  numeroDocumento: string;
  fecha: string;
  tipoOperacion: DETTipoOperacion;
  montoExento: number;
  montoGravado: number;
  impuesto: number;
  total: number;
};

export type CairoRange = {
  cai: string;
  inicio: number;
  fin: number;
  correlativoActual: number;
};

export type RangoUsado = {
  cai: string;
  inicio: number;
  fin: number;
  correlativoActual: number;
};

export type CAIRange = {
  cai: string;
  inicio: number;
  fin: number;
  correlativoActual: number;
};

export type SARValidation = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  rangosUsados: RangoUsado[];
};

export type CompletenessField = {
  key: string;
  label: string;
  required: boolean;
};

export type SARCompletenessConfig = {
  company: CompletenessField[];
  caiSettings: CompletenessField[];
  record: CompletenessField[];
};

export const detCompletenessConfig: SARCompletenessConfig = {
  company: [
    { key: 'rtn', label: 'RTN del emisor', required: true },
    { key: 'name', label: 'Nombre del emisor', required: true },
  ],
  caiSettings: [
    { key: 'cai', label: 'código CAI / punto de emisión', required: true },
    { key: 'inicio', label: 'rango inicial autorizado del CAI', required: true },
    { key: 'fin', label: 'rango final autorizado del CAI', required: true },
    { key: 'correlativoActual', label: 'correlativo actual del punto de emisión', required: false },
  ],
  record: [
    { key: 'fecha', label: 'fecha del documento', required: true },
    { key: 'tipoDocumento', label: 'tipo de documento', required: true },
    { key: 'numeroDocumento', label: 'número de documento', required: true },
    { key: 'montos', label: 'montos del documento (exento, gravado, impuesto, total)', required: true },
  ],
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function accountType(item: any): string {
  const account = item.account || {};
  return account.type || item.type || '';
}

function accountCode(item: any): string {
  const account = item.account || {};
  return account.code || item.code || '';
}

function accountName(item: any): string {
  const account = item.account || {};
  return account.name || item.name || 'Sin nombre';
}

function accountBalance(item: any): number {
  return parseFloat(item.balance ?? 0) || 0;
}

function accountCredit(item: any): number {
  return parseFloat(item.credit ?? 0) || 0;
}

function isTaxAccount(item: any): boolean {
  return accountType(item) === 'LIABILITY' && /ISV|impuesto|IVA/i.test(accountName(item));
}

function isExpenseItem(item: any): boolean {
  return accountType(item) === 'EXPENSE' && accountBalance(item) > 0;
}

function isRevenueItem(item: any): boolean {
  return accountType(item) === 'REVENUE' && (accountBalance(item) < 0 || accountCredit(item) > 0);
}

function recordDocumentNumber(item: any, index: number): string {
  const direct =
    item.numeroDocumento ?? item.documentNumber ?? item.invoiceNumber ?? item.numero_factura
    ?? item.voucherNumber ?? item.reference ?? item.transaction?.voucherNumber
    ?? item.journalEntry?.[0]?.transaction?.voucherNumber ?? item.document?.numero;
  if (direct !== undefined && direct !== null && String(direct).trim() !== '') {
    return String(direct).trim();
  }
  const digits = String(accountCode(item) || '').replace(/\D/g, '');
  if (digits) return digits;
  return String(index + 1);
}

export function transformToDET(
  data: any[],
  options?: { rtn?: string; nombre?: string; fecha?: string }
): DETRecord[] {
  const raw = data || [];
  const records: DETRecord[] = [];

  const taxItems = raw.filter(isTaxAccount);
  const totalISV = taxItems.reduce((sum, item) => sum + Math.abs(accountBalance(item)), 0);

  const expenseItems = raw.filter(isExpenseItem);
  const expenseBase = expenseItems.reduce((sum, item) => sum + Math.abs(accountBalance(item)), 0);

  const revenueItems = raw.filter(isRevenueItem);
  const revenueBase = revenueItems.reduce((sum, item) => sum + Math.abs(accountBalance(item)), 0);

  const expenseRate = totalISV > 0 && expenseBase > 0 ? totalISV / expenseBase : 0;
  const revenueRate = totalISV > 0 && revenueBase > 0 ? totalISV / revenueBase : 0;

  let index = 0;

  expenseItems.forEach((item) => {
    const total = round2(Math.abs(accountBalance(item)));
    const impuesto = round2(total * expenseRate);
    const gravado = round2(Math.max(0, total - impuesto));
    records.push({
      rtn: (options?.rtn || item.proveedorRTN || item.supplier?.rtn || item.rtn || '').trim(),
      nombre: (options?.nombre || item.supplier?.name || accountName(item)).trim(),
      tipoDocumento: item.tipoDocumento || item.documentType || '04',
      numeroDocumento: recordDocumentNumber(item, index++),
      fecha: options?.fecha || item.date || '',
      tipoOperacion: 'COMPRA',
      montoExento: round2(item.montoExento || 0),
      montoGravado: gravado,
      impuesto,
      total,
    });
  });

  revenueItems.forEach((item) => {
    const total = round2(Math.abs(accountBalance(item)));
    const impuesto = round2(total * revenueRate);
    const gravado = round2(Math.max(0, total - impuesto));
    records.push({
      rtn: (options?.rtn || item.clienteRTN || item.customer?.rtn || item.rtn || '').trim(),
      nombre: (options?.nombre || item.clienteNombre || item.customer?.name || accountName(item)).trim(),
      tipoDocumento: item.tipoDocumento || item.documentType || '04',
      numeroDocumento: recordDocumentNumber(item, index++),
      fecha: options?.fecha || item.date || '',
      tipoOperacion: 'VENTA',
      montoExento: round2(item.montoExento || 0),
      montoGravado: gravado,
      impuesto,
      total,
    });
  });

  return records;
}

export function validateAgainstSARRanges(
  records: DETRecord[],
  caiRanges: CairoRange[]
): SARValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const rangosUsados: RangoUsado[] = [];

  const ranges = (caiRanges || []).map((r) => ({
    cai: String(r.cai || 'CAI sin código'),
    inicio: Number(r.inicio) || 0,
    fin: Number(r.fin) || 0,
    correlativoActual: Number(r.correlativoActual) || 0,
  }));

  if (ranges.length === 0) {
    warnings.push(
      'No hay CAI ni rango SAR configurado para el punto de emisión. Asigne un rango autorizado antes de declarar el DET en el portal del SAR.'
    );
    return { ok: true, errors, warnings, rangosUsados: [] };
  }

  const usedByRange = new Map<string, number[]>();
  ranges.forEach((r) => {
    usedByRange.set(r.cai, []);
    if (r.correlativoActual >= r.fin) {
      warnings.push(
        `El rango del CAI ${r.cai} está agotado (correlativo actual ${r.correlativoActual} de ${r.fin}).`
      );
    }
  });

  const seenNumbers = new Set<string>();
  (records || []).forEach((record) => {
    const raw = String(record.numeroDocumento || '').trim();
    const digits = raw.replace(/\D/g, '');
    const number = digits ? parseInt(digits, 10) : NaN;

    if (isNaN(number) || digits === '') {
      warnings.push(
        `Registro "${record.nombre || record.numeroDocumento}": sin número de documento válido (${raw || 'vacío'}), no puede verificarse contra el rango SAR.`
      );
      return;
    }

    if (seenNumbers.has(digits)) {
      errors.push(`Número de documento ${raw} duplicado en el período.`);
      return;
    }
    seenNumbers.add(digits);

    const match = ranges.find((r) => number >= r.inicio && number <= r.fin);
    if (!match) {
      const allowed = ranges.map((r) => `${r.inicio}-${r.fin}`).join(', ');
      errors.push(`Documento ${raw} fuera del rango autorizado (${allowed}).`);
      return;
    }

    usedByRange.get(match.cai)!.push(number);
    if (!rangosUsados.some((r) => r.cai === match.cai)) {
      rangosUsados.push({
        cai: match.cai,
        inicio: match.inicio,
        fin: match.fin,
        correlativoActual: match.correlativoActual,
      });
    }
  });

  ranges.forEach((r) => {
    const nums = [...new Set(usedByRange.get(r.cai) || [])].sort((a, b) => a - b);
    if (nums.length > 1) {
      for (let i = 1; i < nums.length; i++) {
        if (nums[i] !== nums[i - 1] + 1) {
          warnings.push(
            `Correlativo no consecutivo en CAI ${r.cai}: salto entre ${nums[i - 1]} y ${nums[i]}.`
          );
          break;
        }
      }
    }
  });

  return { ok: errors.length === 0, errors, warnings, rangosUsados };
}

export function validateCompleteness(
  records: DETRecord[],
  context: { company?: { rtn?: string; name?: string }; cai?: CAIRange },
  config: SARCompletenessConfig = detCompletenessConfig
): SARValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  const company = context?.company || {};
  config.company.forEach((field) => {
    const value = (company as Record<string, unknown>)[field.key];
    if (value === undefined || value === null || String(value).trim() === '') {
      const message = `Falta ${field.label} de la empresa emisora (obligatorio para el archivo DET).`;
      if (field.required) errors.push(message);
      else warnings.push(message);
    }
  });

  const cai = (context?.cai || {}) as Record<string, unknown>;
  config.caiSettings.forEach((field) => {
    const value = cai[field.key];
    const empty =
      value === undefined ||
      value === null ||
      typeof value === 'object' ||
      (typeof value === 'number' && (!isFinite(value) || value === 0)) ||
      String(value).trim() === '';
    if (empty) {
      const message = `Falta ${field.label} (obligatorio para generar el DET del punto de emisión).`;
      if (field.required) errors.push(message);
      else warnings.push(message);
    }
  });

  const list = records || [];
  list.forEach((record, index) => {
    const numero = index + 1;
    config.record.forEach((field) => {
      let empty: boolean;
      if (field.key === 'montos') {
        empty = ['montoExento', 'montoGravado', 'impuesto', 'total'].some(
          (key) => typeof (record as Record<string, unknown>)[key] !== 'number'
            || !isFinite((record as Record<string, unknown>)[key] as number)
        );
      } else {
        const value = (record as Record<string, unknown>)[field.key];
        empty = value === undefined || value === null || String(value).trim() === '';
      }
      if (empty) {
        const message = `Registro ${numero} (${record.nombre || record.numeroDocumento || 'sin nombre'}): falta ${field.label}.`;
        if (field.required) errors.push(message);
        else warnings.push(message);
      }
    });
  });

  if (list.length === 0) {
    warnings.push('No hay registros DET generados para el período seleccionado.');
  }

  return { ok: errors.length === 0, errors, warnings, rangosUsados: [] };
}

export function formatDETForSAR(records: DETRecord[]): string {
  const spec = getDETFileSpec('PURCHASES');
  const lines: string[] = [];

  (records || []).forEach((record) => {
    let line = ''.padEnd(spec.recordLength, ' ');

    const fields: Record<string, string> = {
      RTN: record.rtn.padEnd(16, ' '),
      Nombre: record.nombre.padEnd(150, ' '),
      TipoDocumento: record.tipoDocumento.padEnd(2, ' '),
      NumeroDocumento: record.numeroDocumento.padEnd(20, ' '),
      FechaDocumento: record.fecha.padEnd(10, ' '),
      MontoExento: String(Math.round(record.montoExento || 0)).padStart(15, '0'),
      MontoGravado: String(Math.round(record.montoGravado || 0)).padStart(15, '0'),
      MontoImpuesto: String(Math.round(record.impuesto || 0)).padStart(15, '0'),
      MontoTotal: String(Math.round(record.total || 0)).padStart(15, '0'),
      TipoCompra: record.tipoOperacion === 'COMPRA' ? '01' : '03',
      FlagImportacion: 'N',
      FlagExento: (record.montoExento || 0) > 0 ? 'S' : 'N',
    };

    spec.fields.forEach((field: any) => {
      const value = fields[field.name] || ''.padEnd(field.length, ' ');
      line =
        line.substring(0, field.start - 1) +
        value.substring(0, field.length) +
        line.substring(field.start - 1 + field.length);
    });

    lines.push(line);
  });

  return lines.join('\n');
}

function sanitizeFileNamePart(value: string, fallback: string): string {
  const cleaned = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\\/:*?"<>|]/g, '')
    .trim()
    .replace(/\s+/g, '_');
  return cleaned || fallback;
}

export function getDETFileName(
  record: DETRecord[] | DETRecord,
  empresa: string,
  cai?: string | CAIRange
): string {
  const records = Array.isArray(record) ? record : [record];
  const caiCode = typeof cai === 'string' ? cai : String(cai?.cai || 'CAI');
  const rangeCurrent = typeof cai === 'string' ? NaN : Number(cai?.correlativoActual);
  const correlativo =
    !isNaN(rangeCurrent) && rangeCurrent > 0
      ? String(rangeCurrent)
      : records
          .map((r) => String(r.numeroDocumento || '').replace(/\D/g, ''))
          .filter((digits) => digits !== '')
          .pop() || String(records.length);
  return `DET_${sanitizeFileNamePart(caiCode, 'CAI')}_${sanitizeFileNamePart(correlativo, '0')}_${sanitizeFileNamePart(empresa, 'empresa')}.txt`;
}