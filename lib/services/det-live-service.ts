import { db } from '@/lib/db';

// DET Live file types
export type DETFileType = 'PURCHASES' | 'SALES' | 'SERVICES' | 'OTHER';

// DET Live format specifications
export interface DETLiveFormat {
  fileType: DETFileType;
  period: string; // Format: "YYYY-MM"
  records: DETLiveRecord[];
}

export interface DETLiveRecord {
  // Common fields for all types
  rtn: string; // RTN of the counterparty
  name: string; // Name of the counterparty
  documentType: string; // Document type code
  documentNumber: string; // Document number
  documentDate: string; // Document date (DD/MM/YYYY)
  exemptAmount: number; // Exempt amount (in cents)
  taxableAmount: number; // Taxable amount (in cents)
  taxAmount: number; // Tax amount (in cents)
  totalAmount: number; // Total amount (in cents)
  
  // Additional fields for purchases
  purchaseType?: string; // Purchase type code
  importFlag?: string; // Import flag
  taxExemptFlag?: string; // Tax exempt flag
  
  // Additional fields for sales
  exportFlag?: string; // Export flag
  taxType?: string; // Tax type code
}

// Export configuration
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

// DET Live file format specifications
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

// Generate DET Live file content
export function generateDETFileContent(format: DETLiveFormat): string {
  const spec = DET_FORMATS[format.fileType];
  if (!spec) {
    throw new Error(`Unsupported file type: ${format.fileType}`);
  }

  const lines: string[] = [];
  
  // Header line
  const headerLine = createHeaderLine(format);
  lines.push(headerLine);

  // Data lines
  format.records.forEach(record => {
    const dataLine = createDataLine(record, spec);
    if (dataLine) {
      lines.push(dataLine);
    }
  });

  return lines.join('\n');
}

// Create header line for DET file
function createHeaderLine(format: DETLiveFormat): string {
  const spec = DET_FORMATS[format.fileType];
  const period = format.period.replace('-', ''); // Remove dash from YYYY-MM
  
  return `${spec.fileType}${period.padEnd(10, '0')}${''.padEnd(spec.recordLength - 12, ' ')}`;
}

// Create data line for DET record
function createDataLine(record: DETLiveRecord, spec: any): string {
  let line = ''.padEnd(spec.recordLength, ' ');
  
  // Map fields to line positions
  const fieldMappings: { [key: string]: string } = {
    rtn: record.rtn.padEnd(16, ' '),
    name: record.name.padEnd(150, ' '),
    documentType: record.documentType.padEnd(2, ' '),
    documentNumber: record.documentNumber.padEnd(20, ' '),
    documentDate: record.documentDate.padEnd(10, ' '),
    exemptAmount: formatAmount(record.exemptAmount).padStart(15, '0'),
    taxableAmount: formatAmount(record.taxableAmount).padStart(15, '0'),
    taxAmount: formatAmount(record.taxAmount).padStart(15, '0'),
    totalAmount: formatAmount(record.totalAmount).padStart(15, '0'),
  };

  // Add purchase-specific fields
  if (spec.fileType === 'C') {
    fieldMappings.purchaseType = (record.purchaseType || '01').padEnd(2, ' ');
    fieldMappings.importFlag = (record.importFlag || 'N').padEnd(1, ' ');
    fieldMappings.taxExemptFlag = (record.taxExemptFlag || 'N').padEnd(1, ' ');
  }

  // Add sales-specific fields
  if (spec.fileType === 'V') {
    fieldMappings.exportFlag = (record.exportFlag || 'N').padEnd(1, ' ');
  }

  // Place fields in their positions
  spec.fields.forEach((field: any) => {
    const value = fieldMappings[field.name] || '';
    line = line.substring(0, field.start - 1) + 
           value.substring(0, field.length) + 
           line.substring(field.start - 1 + field.length);
  });

  return line;
}

// Format amount for DET file (in cents, no decimal)
function formatAmount(amount: number): string {
  return Math.round(amount).toString();
}

// Get transactions for DET export
export async function getTransactionsForDET(config: DETExportConfig): Promise<DETLiveRecord[]> {
  const where: any = {};
  
  // Filter by date range
  if (config.dateFrom || config.dateTo) {
    where.date = {};
    if (config.dateFrom) where.date.gte = config.dateFrom;
    if (config.dateTo) where.date.lte = config.dateTo;
  } else {
    // Filter by period if no date range specified
    const year = parseInt(config.period.split('-')[0]);
    const month = parseInt(config.period.split('-')[1]);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    where.date = {
      gte: startDate,
      lte: endDate,
    };
  }

  const transactions = await (db as any).transaction.findMany({
    where,
    include: {
      entries: {
        include: {
          account: true,
        },
      },
    },
    orderBy: { date: 'asc' },
  } as any);

  const records: DETLiveRecord[] = [];

  transactions.forEach((transaction: any) => {
    const transactionDate = transaction.date.toISOString().split('T')[0]; // YYYY-MM-DD
    const formattedDate = formatDateForDET(transactionDate); // DD/MM/YYYY

    transaction.entries.forEach((entry: any) => {
      // Skip if account filter is specified and doesn't match
      if (config.accountFilter && config.accountFilter.length > 0) {
        if (!config.accountFilter.includes(entry.account.code)) {
          return;
        }
      }

      // Determine if this is a purchase or sale based on account type
      const isPurchase = entry.account.type === 'EXPENSE';
      const isSale = entry.account.type === 'REVENUE';

      // Skip if doesn't match the requested file type
      if (config.fileType === 'PURCHASES' && !isPurchase) return;
      if (config.fileType === 'SALES' && !isSale) return;

      // Skip zero amounts if not included
      if (!config.includeZeroAmounts && entry.amount === 0) return;

      const record: DETLiveRecord = {
        rtn: '0801-00000-0', // Default RTN, should be updated with actual data
        name: 'PROVEEDOR/CLIENTE', // Default name, should be updated
        documentType: '01', // Default document type
        documentNumber: transaction.reference || '0000000000',
        documentDate: formattedDate,
        exemptAmount: 0, // Default exempt amount
        taxableAmount: Math.abs(entry.amount), // Use absolute value
        taxAmount: 0, // Default tax amount, should be calculated
        totalAmount: Math.abs(entry.amount), // Use absolute value
      };

      // Set purchase-specific fields
      if (isPurchase) {
        record.purchaseType = '01'; // Default purchase type
        record.importFlag = 'N'; // Default not imported
        record.taxExemptFlag = entry.amount < 0 ? 'S' : 'N'; // Mark as exempt if negative
      }

      // Set sales-specific fields
      if (isSale) {
        record.exportFlag = 'N'; // Default not exported
      }

      records.push(record);
    });
  });

  return records;
}

// Format date for DET files (DD/MM/YYYY)
function formatDateForDET(dateString: string): string {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

// Generate DET file and return as downloadable content
export async function generateDETFile(config: DETExportConfig): Promise<{
  content: string;
  filename: string;
  mimeType: string;
}> {
  const records = await getTransactionsForDET(config);
  
  const format: DETLiveFormat = {
    fileType: config.fileType,
    period: config.period,
    records,
  };

  const content = generateDETFileContent(format);
  const spec = DET_FORMATS[config.fileType];
  
  return {
    content,
    filename: `DET_${spec.fileType}_${config.period.replace('-', '')}.txt`,
    mimeType: 'text/plain',
  };
}

// Generate CSV version for easier viewing
export async function generateDETCSV(config: DETExportConfig): Promise<string> {
  const records = await getTransactionsForDET(config);
  
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

  if (config.fileType === 'PURCHASES') {
    headers.push('Tipo Compra', 'Flag Importación', 'Flag Exento');
  } else if (config.fileType === 'SALES') {
    headers.push('Flag Exportación');
  }

  const rows = records.map(record => {
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

    if (config.fileType === 'PURCHASES') {
      baseRow.push(record.purchaseType || '01');
      baseRow.push(record.importFlag || 'N');
      baseRow.push(record.taxExemptFlag || 'N');
    } else if (config.fileType === 'SALES') {
      baseRow.push(record.exportFlag || 'N');
    }

    return baseRow.map(cell => `"${cell}"`).join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

// Validate DET file format
export function validateDETFile(content: string, fileType: DETFileType): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const spec = DET_FORMATS[fileType];
  
  if (!spec) {
    errors.push(`Unsupported file type: ${fileType}`);
    return { isValid: false, errors, warnings };
  }

  const lines = content.split('\n');
  
  // Check header line
  if (lines.length === 0) {
    errors.push('File is empty');
    return { isValid: false, errors, warnings };
  }

  const headerLine = lines[0];
  if (headerLine.length !== spec.recordLength) {
    errors.push(`Header line length is ${headerLine.length}, expected ${spec.recordLength}`);
  }

  // Check file type in header
  const expectedFileType = spec.fileType;
  const actualFileType = headerLine.substring(0, 1);
  if (actualFileType !== expectedFileType) {
    errors.push(`File type in header is '${actualFileType}', expected '${expectedFileType}'`);
  }

  // Check data lines
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.length !== spec.recordLength) {
      warnings.push(`Line ${i + 1} length is ${line.length}, expected ${spec.recordLength}`);
    }

    // Validate required fields
    spec.fields.forEach((field: any) => {
      if (field.required) {
        const value = line.substring(field.start - 1, field.start - 1 + field.length).trim();
        if (!value) {
          errors.push(`Line ${i + 1}: Required field '${field.name}' is empty`);
        }
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// Get available periods for DET export
export async function getAvailablePeriods(): Promise<string[]> {
  const transactions = await db.transaction.findMany({
    select: { date: true },
    orderBy: { date: 'asc' },
    distinct: ['date'],
  });

  const periods = new Set<string>();
  
  transactions.forEach((transaction: any) => {
    const date = new Date(transaction.date);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    periods.add(`${year}-${month}`);
  });

  return Array.from(periods).sort();
}

// Get DET export statistics
export async function getDETExportStatistics(period: string): Promise<{
  purchases: { count: number; total: number; exempt: number; taxable: number; tax: number };
  sales: { count: number; total: number; exempt: number; taxable: number; tax: number };
}> {
  const year = parseInt(period.split('-')[0]);
  const month = parseInt(period.split('-')[1]);
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const transactions = await (db as any).transaction.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      entries: {
        include: {
          account: true,
        },
      },
    },
  } as any);

  const stats = {
    purchases: { count: 0, total: 0, exempt: 0, taxable: 0, tax: 0 },
    sales: { count: 0, total: 0, exempt: 0, taxable: 0, tax: 0 },
  };

  transactions.forEach((transaction: any) => {
    transaction.entries.forEach((entry: any) => {
      const isPurchase = entry.account.type === 'EXPENSE';
      const isSale = entry.account.type === 'REVENUE';
      const amount = Math.abs(entry.amount);

      if (isPurchase) {
        stats.purchases.count++;
        stats.purchases.total += amount;
        if (amount === 0) {
          stats.purchases.exempt += amount;
        } else {
          stats.purchases.taxable += amount;
        }
      } else if (isSale) {
        stats.sales.count++;
        stats.sales.total += amount;
        if (amount === 0) {
          stats.sales.exempt += amount;
        } else {
          stats.sales.taxable += amount;
        }
      }
    });
  });

  return stats;
}
