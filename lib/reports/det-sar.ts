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

export type DETCompletenessField =
  | 'rtn'
  | 'nombreEmisor'
  | 'cai'
  | 'fecha'
  | 'tipoDocumento'
  | 'numeroDocumento'
  | 'montoExento'
  | 'montoGravado'
  | 'impuesto'
  | 'total';

export type DETCompletenessIssue = {
  campo: DETCompletenessField | string;
  detalle: string;
};

export type DETCompletenessResult = {
  errors: DETCompletenessIssue[];
  warnings: DETCompletenessIssue[];
  missing: string[];
};

const DET_FIELD_LABELS: Record<DETCompletenessField, string> = {
  rtn: 'RTN del emisor',
  nombreEmisor: 'Nombre del emisor',
  cai: 'código CAI',
  fecha: 'fecha del documento',
  tipoDocumento: 'tipo de documento',
  numeroDocumento: 'número de documento',
  montoExento: 'monto exento',
  montoGravado: 'monto gravado',
  impuesto: 'ISV / impuesto',
  total: 'monto total',
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
  emisor: { rtn?: string; nombre?: string }
): DETCompletenessResult {
  const errors: DETCompletenessIssue[] = [];
  const warnings: DETCompletenessIssue[] = [];
  const missing: string[] = [];

  const isBlank = (value: unknown): boolean =>
    value === undefined || value === null || String(value).trim() === '';

  const isNumber = (value: unknown): value is number =>
    typeof value === 'number' && isFinite(value);

  const pushError = (campo: DETCompletenessField | string, detalle: string) => {
    errors.push({ campo, detalle });
    const label = DET_FIELD_LABELS[campo as DETCompletenessField];
    if (label && !missing.includes(label)) missing.push(label);
  };

  const pushWarning = (campo: DETCompletenessField | string, detalle: string) => {
    warnings.push({ campo, detalle });
  };

  if (isBlank(emisor?.rtn)) {
    pushError('rtn', 'Falta el RTN de la empresa emisora (obligatorio en la cabecera del archivo DET).');
  }

  if (isBlank(emisor?.nombre)) {
    pushError('nombreEmisor', 'Falta el nombre de la empresa emisora (obligatorio en la cabecera del archivo DET).');
  }

  if (!isBlank(emisor?.rtn) && !/^\s*\d{14}\s*$/.test(String(emisor?.rtn))) {
    pushWarning(
      'rtn',
      `El RTN de la empresa emisora (${String(emisor?.rtn).trim()}) no parece válido; el archivo usará este valor por defecto.`
    );
  }

  const list = records || [];
  list.forEach((record, index) => {
    const ref = record.nombre || record.numeroDocumento || `registro ${index + 1}`;

    if (isBlank(record.fecha)) {
      pushError('fecha', `${ref}: falta la fecha del documento.`);
    }

    if (isBlank(record.tipoDocumento)) {
      pushError('tipoDocumento', `${ref}: falta el tipo de documento.`);
    }

    if (isBlank(record.numeroDocumento)) {
      pushError('numeroDocumento', `${ref}: falta el número de documento.`);
    }

    if (!isNumber(record.impuesto)) {
      pushError('impuesto', `${ref}: falta el ISV / impuesto del registro.`);
    }

    if (!isNumber(record.total)) {
      pushError('total', `${ref}: falta el monto total del registro.`);
    }

    const rawDocumento = String(record.numeroDocumento || '').trim();
    if (rawDocumento !== '' && !/\d/.test(rawDocumento)) {
      pushWarning(
        'numeroDocumento',
        `${ref}: dato agregado sin número de documento real (${rawDocumento}), verifique antes de declarar.`
      );
    }

    if (!isNumber(record.montoGravado)) {
      pushWarning(
        'montoGravado',
        `${ref}: monto gravado no definido, se asume 0 (verifique antes de declarar).`
      );
      const label = DET_FIELD_LABELS.montoGravado;
      if (!missing.includes(label)) missing.push(label);
    }

    if (isBlank(record.rtn)) {
      pushWarning(
        'rtn',
        `${ref}: el RTN del emisor está vacío en la línea del DET; se usará el valor por defecto.`
      );
    }
  });

  return { errors, warnings, missing };
}

export function getSARRangesSummary(ranges: CAIRange[]): {
  caiCount: number;
  totalDocumentos: number;
  rangoActual: string;
} {
  const list = (ranges || []).map((r) => ({
    cai: String(r.cai || 'CAI sin código'),
    inicio: Number(r.inicio) || 0,
    fin: Number(r.fin) || 0,
    correlativoActual: Number(r.correlativoActual) || 0,
  }));
  const caiCount = list.length;
  const totalDocumentos = list.reduce((sum, r) => sum + Math.max(0, r.fin - r.inicio + 1), 0);
  const rangoActual = list
    .map((r) => `${r.cai}: ${r.correlativoActual}/${r.fin}`)
    .join(' · ') || 'Sin CAI configurado';
  return { caiCount, totalDocumentos, rangoActual };
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