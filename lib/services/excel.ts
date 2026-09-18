import * as XLSX from 'xlsx';
import { formatCurrency } from '@/lib/currency-utils';

/**
 * Exporta datos a un archivo Excel (.xlsx)
 * Soporta múltiples hojas por reporte
 */
export function exportToExcel(data: any[], fileName: string, options?: {
  sheetName?: string;
  columns?: Array<{ header: string; key: string; width?: number }>;
}) {
  const worksheetData = options?.columns
    ? data.map((item) => options.columns.map(col => item[col.key]))
    : data;

  const worksheet = XLSX.utils.json_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();

  const sheetName = options?.sheetName || 'Hoja1';
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Ajustar ancho de columnas si se especifica
  if (options?.columns) {
    options.columns.forEach(col => {
      if (col.width) {
        worksheet['!cols'] = worksheet['!cols'] || [];
        worksheet['!cols'].push({ wch: col.width });
      }
    });
  }

  XLSX.writeFile(workbook, `${fileName}.xlsx`);
  return true;
}

/**
 * Formatea los datos de balances para exportación a Excel
 */
export function formatBalancesForExcel(accounts: any[]) {
  return accounts.map((account: any) => ({
    'Código': account.code,
    'Nombre': account.name,
    'Tipo': account.type,
    'Saldo Anterior': formatCurrency(account.opening_balance || 0),
    'Múebles (Débitos)': formatCurrency(account.totalDebits || 0),
    'Múebles (Créditos)': formatCurrency(account.totalCredits || 0),
    'Saldo Final': formatCurrency(account.endingBalance || 0),
    'Saldo (Presentación)': account.debitBalance !== undefined
      ? account.debitBalance > 0
        ? formatCurrency(account.debitBalance)
        : formatCurrency(account.debitBalance)
      : (account.creditBalance !== undefined
        ? formatCurrency(account.creditBalance)
        : ''),
    'Naturaleza': account.nature || '',
  }));
}

/**
 * Formatea los datos de asientos para exportación a Excel
 */
export function formatPolizasForExcel(polizas: any[]) {
  return polizas.map((poliza: any) => ({
    'Número de Póliza': poliza.voucherNumber,
    'Fecha': poliza.date,
    'Tipo': poliza.voucherType,
    'Descripción': poliza.description,
    'Total': formatCurrency(poliza.totalAmount),
    'Módulo': poliza.entries?.length ? `${poliza.entries.length} líneas` : '',
  }));
}

/**
 * Formatea los datos de asientos detallados para Excel
 */
export function formatPolizasDetailForExcel(polizas: any[]) {
  const rows: any[] = [];

  polizas.forEach((poliza: any) => {
    poliza.entries?.forEach((entry: any) => {
      rows.push({
        'Número Póliza': poliza.voucherNumber,
        'Fecha': poliza.date,
        'Tipo Póliza': poliza.voucherType,
        'Descripción': poliza.description,
        'Código Cuenta': entry.account.code,
        'Nombre Cuenta': entry.account.name,
        'Débe': formatCurrency(entry.amount > 0 ? entry.amount : 0),
        'Haber': formatCurrency(entry.amount < 0 ? Math.abs(entry.amount) : 0),
        'Saldo Línea': formatCurrency(entry.amount),
      });
    });
  });

  return rows;
}

/**
 * Formatea los datos de variaciones para exportación a Excel
 */
export function formatVariationsForExcel(variations: any[]) {
  return variations.map((variation: any) => ({
    'Código Cuenta': variation.code,
    'Nombre Cuenta': variation.name,
    'Tipo': variation.type,
    'Débe Inicial': formatCurrency(variation.fromDebit),
    'Crédito Inicial': formatCurrency(variation.fromCredit),
    'Saldo Inicial': formatCurrency(variation.fromBalance),
    'Débe Final': formatCurrency(variation.toDebit),
    'Crédito Final': formatCurrency(variation.toCredit),
    'Saldo Final': formatCurrency(variation.toBalance),
    'Var. Absoluta': formatCurrency(variation.varAbs),
    'Var. Porcentual': variation.varPct !== null ? `${(variation.varPct * 100).toFixed(2)}%` : 'N/A',
    'Tendencia': variation.trend,
  }));
}

/**
 * Formatea los datos de estado financiero para Excel
 */
export function formatFinancialStatementsForExcel(
  balance: any,
  incomeStatement: any,
  cashFlow: any
) {
  const rows: any[] = [];

  // Balance General
  rows.push({
    Balance: balance?.totalAssets,
    Ingreso: incomeStatement?.revenue,
    Flujo: cashFlow?.netChange
  });

  return rows;
}

export function parseExcelToTransactions(file: File): Promise<{ success: boolean; data?: any[]; error?: string; missingCodes?: string[] }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Parse the Excel data into transaction format
        const parsedData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (parsedData && parsedData.length > 1) {
          const transactions = parsedData.slice(1).map((row: any[]) => ({
            date: row[0] ? String(row[0]) : '',
            description: row[1] ? String(row[1]) : '',
            accountId: row[2] ? String(row[2]) : '',
            amount: row[3] ? Number(row[3]) * 100 : 0, // Convert to centavos
          }));
          
          resolve({
            success: true,
            data: transactions,
          });
        } else {
          resolve({
            success: false,
            error: 'No se pudieron leer los datos del archivo Excel',
          });
        }
      } catch (err) {
        resolve({
          success: false,
          error: err instanceof Error ? err.message : 'Error desconocido al parsear el archivo',
        });
      }
    };
    reader.readAsArrayBuffer(file);
  });
}