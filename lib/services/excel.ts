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
    'Saldo (Presentación)': account.debitBalance || account.creditBalance ? 
      (account.debitBalance ? formatCurrency(account.debitBalance) : formatCurrency(account.creditBalance)) : '',
    'Naturaleza': account.nature || '',
  });
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
  });
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
  rows.push({ ... });
  
  return rows;
}

export default {
  exportToExcel,
  formatBalancesForExcel,
  formatPolizasForExcel,
  formatPolizasDetailForExcel,
  formatVariationsForExcel,
};