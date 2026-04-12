import * as XLSX from 'xlsx';
import { TransactionFormValues } from "@/lib/validations/transaction";

/**
 * Transforms an Excel File into a format our App understands.
 * Expected Excel Columns: Date, Description, AccountCode, Amount
 */
export async function parseExcelToTransactions(file: File): Promise<{
  success: boolean;
  data?: any[];
  error?: string;
  missingCodes?: string[];
}> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/parse-excel', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to parse Excel file');
    }

    return await response.json();
  } catch (error) {
    return {
      success: false,
      error: 'Error al procesar el archivo Excel. Asegúrese de que el formato sea correcto.'
    };
  }
}

/**
 * Exports your Ledger to a downloadable Excel file
 */
export function exportToExcel(data: any[], fileName: string) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Ledger");
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}