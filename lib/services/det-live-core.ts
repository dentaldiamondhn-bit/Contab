'use client';

// DET Live file types
export type DETFileType = 'PURCHASES' | 'SALES' | 'SERVICES' | 'OTHER';

export interface DETLiveFormat {
  fileType: DETFileType;
  period: string; // Format: "YYYY-MM"
  records: DETLiveRecord[];
}

export interface DETLiveRecord {
  rtn: string;
  name: string;
  documentType: string;
  documentNumber: string;
  documentDate: string;
  exemptAmount: number;
  taxableAmount: number;
  taxAmount: number;
  totalAmount: number;
  purchaseType?: string;
  importFlag?: string;
  taxExemptFlag?: string;
  exportFlag?: string;
  taxType?: string;
}

export interface DETExportConfig {
  fileType: DETFileType;
  period: string;
  includeExempt: boolean;
  includeTaxable: boolean;
  includeZeroAmounts: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  accountFilter?: string[];
}

const DET_FORMATS: { [key in DETFileType]: any } = {
  PURCHASES: {
    name: 'Compras',
    fileType: 'C',
    recordLength: 262,
    fields: [
      { name: 'RTN', start: 1, length: 16, required: true },
      { name: 'Nombre', start: 17, length: 150, required: true },
      { name: 'TipoDocumento', start: 167, length: 2, required: true },
      { name: 'NumeroDocumento', start: 169, length: 20, required: true },
      { name: 'FechaDocumento', start: 189, length: 10, required: true },
      { name: 'MontoExento', start: 199, length: 15, required: true },
      { name: 'MontoGravado', start: 214, length: 15, required: true },
      { name: 'MontoImpuesto', start: 229, length: 15, required: true },
      { name: 'MontoTotal', start: 244, length: 15, required: true },
      { name: 'TipoCompra', start: 259, length: 2, required: true },
      { name: 'FlagImportacion', start: 261, length: 1, required: true },
      { name: 'FlagExento', start: 262, length: 1, required: true },
    ]
  },
  SALES: {
    name: 'Ventas',
    fileType: 'V',
    recordLength: 259,
    fields: [
      { name: 'RTN', start: 1, length: 16, required: true },
      { name: 'Nombre', start: 17, length: 150, required: true },
      { name: 'TipoDocumento', start: 167, length: 2, required: true },
      { name: 'NumeroDocumento', start: 169, length: 20, required: true },
      { name: 'FechaDocumento', start: 189, length: 10, required: true },
      { name: 'MontoExento', start: 199, length: 15, required: true },
      { name: 'MontoGravado', start: 214, length: 15, required: true },
      { name: 'MontoImpuesto', start: 229, length: 15, required: true },
      { name: 'MontoTotal', start: 244, length: 15, required: true },
      { name: 'FlagExportacion', start: 259, length: 1, required: true },
    ]
  },
  SERVICES: {
    name: 'Servicios',
    fileType: 'S',
    recordLength: 259,
    fields: [
      { name: 'RTN', start: 1, length: 16, required: true },
      { name: 'Nombre', start: 17, length: 150, required: true },
      { name: 'TipoDocumento', start: 167, length: 2, required: true },
      { name: 'NumeroDocumento', start: 169, length: 20, required: true },
      { name: 'FechaDocumento', start: 189, length: 10, required: true },
      { name: 'MontoExento', start: 199, length: 15, required: true },
      { name: 'MontoGravado', start: 214, length: 15, required: true },
      { name: 'MontoImpuesto', start: 229, length: 15, required: true },
      { name: 'MontoTotal', start: 244, length: 15, required: true },
      { name: 'FlagExportacion', start: 259, length: 1, required: true },
    ]
  },
  OTHER: {
    name: 'Otros',
    fileType: 'O',
    recordLength: 259,
    fields: [
      { name: 'RTN', start: 1, length: 16, required: true },
      { name: 'Nombre', start: 17, length: 150, required: true },
      { name: 'TipoDocumento', start: 167, length: 2, required: true },
      { name: 'NumeroDocumento', start: 169, length: 20, required: true },
      { name: 'FechaDocumento', start: 189, length: 10, required: true },
      { name: 'MontoExento', start: 199, length: 15, required: true },
      { name: 'MontoGravado', start: 214, length: 15, required: true },
      { name: 'MontoImpuesto', start: 229, length: 15, required: true },
      { name: 'MontoTotal', start: 244, length: 15, required: true },
      { name: 'FlagExportacion', start: 259, length: 1, required: true },
    ]
  }
};

export function getDETFileSpec(fileType: DETFileType) {
  return DET_FORMATS[fileType];
}

export function generateDETFileContent(format: DETLiveFormat): string {
  const spec = getDETFileSpec(format.fileType);
  if (!spec) {
    throw new Error(`Unsupported file type: ${format.fileType}`);
  }

  const lines: string[] = [];
  lines.push(createHeaderLine(format));

  format.records.forEach(record => {
    lines.push(createDataLine(record, spec));
  });

  return lines.join('\n');
}

function createHeaderLine(format: DETLiveFormat): string {
  const spec = getDETFileSpec(format.fileType);
  const period = format.period.replace('-', '');
  return `${spec.fileType}${period.padEnd(10, '0')}${''.padEnd(spec.recordLength - 12, ' ')}`;
}

function createDataLine(record: DETLiveRecord, spec: any): string {
  let line = ''.padEnd(spec.recordLength, ' ');

  const fieldMappings: { [key: string]: string } = {
    RTN: record.rtn.padEnd(16, ' '),
    Nombre: record.name.padEnd(150, ' '),
    TipoDocumento: record.documentType.padEnd(2, ' '),
    NumeroDocumento: record.documentNumber.padEnd(20, ' '),
    FechaDocumento: record.documentDate.padEnd(10, ' '),
    MontoExento: formatAmount(record.exemptAmount).padStart(15, '0'),
    MontoGravado: formatAmount(record.taxableAmount).padStart(15, '0'),
    MontoImpuesto: formatAmount(record.taxAmount).padStart(15, '0'),
    MontoTotal: formatAmount(record.totalAmount).padStart(15, '0'),
    TipoCompra: (record.purchaseType || '01').padEnd(2, ' '),
    FlagImportacion: (record.importFlag || 'N').padEnd(1, ' '),
    FlagExento: (record.taxExemptFlag || 'N').padEnd(1, ' '),
    FlagExportacion: (record.exportFlag || 'N').padEnd(1, ' '),
  };

  spec.fields.forEach((field: any) => {
    const value = fieldMappings[field.name] || ''.padEnd(field.length, ' ');
    line = line.substring(0, field.start - 1) + value.substring(0, field.length) + line.substring(field.start - 1 + field.length);
  });

  return line;
}

function formatAmount(amount: number): string {
  return Math.round(amount).toString();
}

export function generateDETCSV(format: DETLiveFormat): string {
  const headers = [
    'RTN',
    'Nombre',
    'Tipo Documento',
    'Numero Documento',
    'Fecha Documento',
    'Monto Exento',
    'Monto Gravado',
    'Monto Impuesto',
    'Monto Total',
  ];

  const spec = getDETFileSpec(format.fileType);
  if (format.fileType === 'PURCHASES') {
    headers.push('Tipo Compra', 'Flag Importación', 'Flag Exento');
  } else if (['SALES', 'SERVICES', 'OTHER'].includes(format.fileType)) {
    headers.push('Flag Exportación');
  }

  const rows = format.records.map(record => {
    const baseRow = [
      record.rtn,
      record.name,
      record.documentType,
      record.documentNumber,
      record.documentDate,
      (record.exemptAmount / 100).toFixed(2),
      (record.taxableAmount / 100).toFixed(2),
      (record.taxAmount / 100).toFixed(2),
      (record.totalAmount / 100).toFixed(2),
    ];

    if (format.fileType === 'PURCHASES') {
      baseRow.push(record.purchaseType || '01');
      baseRow.push(record.importFlag || 'N');
      baseRow.push(record.taxExemptFlag || 'N');
    } else {
      baseRow.push(record.exportFlag || 'N');
    }

    return baseRow.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

export function validateDETFile(content: string, fileType: DETFileType) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const spec = getDETFileSpec(fileType);

  if (!spec) {
    errors.push(`Unsupported file type: ${fileType}`);
    return { isValid: false, errors, warnings };
  }

  const lines = content.split('\n');
  if (lines.length === 0) {
    errors.push('File is empty');
    return { isValid: false, errors, warnings };
  }

  const headerLine = lines[0];
  if (headerLine.length !== spec.recordLength) {
    warnings.push(`Header line length is ${headerLine.length}, expected ${spec.recordLength}`);
  }

  const actualFileType = headerLine.substring(0, 1);
  if (actualFileType !== spec.fileType) {
    errors.push(`File type in header is '${actualFileType}', expected '${spec.fileType}'`);
  }

  lines.slice(1).forEach((line, index) => {
    if (line.length !== spec.recordLength) {
      warnings.push(`Line ${index + 2} length is ${line.length}, expected ${spec.recordLength}`);
    }

    spec.fields.forEach((field: any) => {
      if (field.required) {
        const value = line.substring(field.start - 1, field.start - 1 + field.length).trim();
        if (!value) {
          errors.push(`Line ${index + 2}: Required field '${field.name}' is empty`);
        }
      }
    });
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
