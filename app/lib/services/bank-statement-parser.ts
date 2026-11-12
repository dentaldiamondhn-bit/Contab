import * as XLSX from 'xlsx';

export interface BankStatementRow {
  id: string;
  date: Date;
  description: string;
  amount: number;
  reference?: string;
}

/**
 * Parses bank statement Excel files from common Honduran banks
 * Supports BAC and Ficohsa formats
 */
export async function parseBankStatement(file: File): Promise<{
  success: boolean;
  data?: BankStatementRow[];
  error?: string;
}> {
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    
    // Raw data from Excel
    const rawData = XLSX.utils.sheet_to_json(worksheet);

    // Try different parsing strategies based on common bank formats
    let parsedData: BankStatementRow[] = [];

    // Strategy 1: BAC format (Date, Description, Amount)
    if (isBACFormat(rawData)) {
      parsedData = parseBACFormat(rawData);
    }
    // Strategy 2: Ficohsa format (Fecha, Descripción, Monto)
    else if (isFicohsaFormat(rawData)) {
      parsedData = parseFicohsaFormat(rawData);
    }
    // Strategy 3: Generic CSV format
    else {
      parsedData = parseGenericFormat(rawData);
    }

    return {
      success: true,
      data: parsedData
    };

  } catch (error) {
    return {
      success: false,
      error: 'Error parsing bank statement. Please check the file format.'
    };
  }
}

function isBACFormat(data: any[]): boolean {
  if (data.length === 0) return false;
  const firstRow = data[0];
  return 'Date' in firstRow || 'Description' in firstRow || 'Amount' in firstRow;
}

function isFicohsaFormat(data: any[]): boolean {
  if (data.length === 0) return false;
  const firstRow = data[0];
  return 'Fecha' in firstRow || 'Descripción' in firstRow || 'Monto' in firstRow;
}

function parseBACFormat(data: any[]): BankStatementRow[] {
  return data.map((row: any, index: number) => ({
    id: `bank-${index}`,
    date: parseDate(row.Date || row.date || row.DATE),
    description: row.Description || row.description || row.DESCRIPTION || '',
    amount: parseAmount(row.Amount || row.amount || row.AMOUNT),
    reference: row.Reference || row.reference || row.REFERENCE
  }));
}

function parseFicohsaFormat(data: any[]): BankStatementRow[] {
  return data.map((row: any, index: number) => ({
    id: `bank-${index}`,
    date: parseDate(row.Fecha || row.fecha || row.FECHA),
    description: row.Descripción || row.descripcion || row.DESCRIPCION || '',
    amount: parseAmount(row.Monto || row.monto || row.MONTO),
    reference: row.Referencia || row.referencia || row.REFERENCIA
  }));
}

function parseGenericFormat(data: any[]): BankStatementRow[] {
  // Try to detect column names automatically
  const firstRow = data[0];
  const keys = Object.keys(firstRow);
  
  const dateKey = keys.find(k => 
    k.toLowerCase().includes('date') || 
    k.toLowerCase().includes('fecha')
  ) || keys[0];
  
  const descKey = keys.find(k => 
    k.toLowerCase().includes('desc') || 
    k.toLowerCase().includes('concept')
  ) || keys[1];
  
  const amountKey = keys.find(k => 
    k.toLowerCase().includes('amount') || 
    k.toLowerCase().includes('monto')
  ) || keys[2];

  return data.map((row: any, index: number) => ({
    id: `bank-${index}`,
    date: parseDate(row[dateKey]),
    description: row[descKey] || '',
    amount: parseAmount(row[amountKey]),
    reference: row.reference || row.referencia
  }));
}

function parseDate(dateValue: any): Date {
  if (dateValue instanceof Date) return dateValue;
  if (typeof dateValue === 'number') {
    // Excel date number (days since 1899-12-30)
    return new Date((dateValue - 25569) * 86400 * 1000);
  }
  if (typeof dateValue === 'string') {
    return new Date(dateValue);
  }
  return new Date();
}

function parseAmount(amountValue: any): number {
  if (typeof amountValue === 'number') return Math.round(amountValue * 100);
  if (typeof amountValue === 'string') {
    // Handle currency formats like "$1,234.56" or "L. 1,234.56"
    const cleanAmount = amountValue.replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(cleanAmount);
    return isNaN(parsed) ? 0 : Math.round(parsed * 100);
  }
  return 0;
}
