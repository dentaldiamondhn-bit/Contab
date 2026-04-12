import * as XLSX from 'xlsx';
import { BankFormat, MappedTransaction, BankDetectionResult } from './types';

// Bank format configurations based on common Honduran bank Excel exports
const BANK_FORMATS: Record<string, BankFormat> = {
  'BAC': {
    name: 'BAC Credomatic',
    identifier: 'BAC',
    columnPatterns: {
      date: ['Fecha', 'Date', 'FECHA'],
      description: ['Descripción', 'Description', 'Concepto', 'Concept'],
      reference: ['Referencia', 'Reference', 'No. Referencia', 'Número'],
      debit: ['Débito', 'Debit', 'Débitos', 'Debits', 'Cargo', 'Cargo ($)'],
      credit: ['Crédito', 'Credit', 'Créditos', 'Credits', 'Abono', 'Abono ($)'],
      balance: ['Saldo', 'Balance', 'Saldo Disponible', 'Available Balance']
    },
    dateFormat: 'DD/MM/YYYY',
    currencySymbol: '$',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    rowStartIndex: 1,
    requiredColumns: ['date', 'description']
  },
  'FICOHSA': {
    name: 'Banco Ficohsa',
    identifier: 'FICOHSA',
    columnPatterns: {
      date: ['Fecha', 'FECHA', 'Fecha Operación'],
      description: ['Descripción', 'Concepto', 'Descripción de la Operación', 'Detalle'],
      reference: ['Referencia', 'No. Documento', 'Documento', 'N° Documento'],
      debit: ['Débito', 'Cargo', 'Retiro', 'Debito ($)'],
      credit: ['Crédito', 'Abono', 'Depósito', 'Credito ($)'],
      balance: ['Saldo', 'Balance', 'Saldo Contable', 'Saldo Final']
    },
    dateFormat: 'DD/MM/YYYY',
    currencySymbol: 'L.',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    rowStartIndex: 2,
    requiredColumns: ['date', 'description']
  },
  'BANPAIS': {
    name: 'Banpaís',
    identifier: 'BANPAIS',
    columnPatterns: {
      date: ['Fecha', 'FECHA', 'Fecha de Transacción'],
      description: ['Descripción', 'Concepto', 'Detalle de la Operación'],
      reference: ['Referencia', 'No. Referencia', 'Número de Operación'],
      debit: ['Débito', 'Cargo', 'Monto Débito', 'Débitos'],
      credit: ['Crédito', 'Abono', 'Monto Crédito', 'Créditos'],
      balance: ['Saldo', 'Balance', 'Saldo Actual', 'Saldo Disponible']
    },
    dateFormat: 'DD/MM/YYYY',
    currencySymbol: 'L.',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    rowStartIndex: 1,
    requiredColumns: ['date', 'description']
  },
  'ATLANTIDA': {
    name: 'Banco Atlántida',
    identifier: 'BANTLAN',
    columnPatterns: {
      date: ['Fecha', 'FECHA', 'Fecha Transacción'],
      description: ['Descripción', 'Concepto', 'Detalle', 'Glosa'],
      reference: ['Referencia', 'No. Operación', 'Número', 'Cod. Referencia'],
      debit: ['Débito', 'Cargo', 'Retiros', 'Débitos'],
      credit: ['Crédito', 'Abono', 'Depósitos', 'Créditos'],
      balance: ['Saldo', 'Balance', 'Saldo Final', 'Saldo Cta']
    },
    dateFormat: 'DD/MM/YYYY',
    currencySymbol: 'L.',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    rowStartIndex: 1,
    requiredColumns: ['date', 'description']
  },
  'DAVIVIENDA': {
    name: 'Banco Davivienda',
    identifier: 'DAVIVIENDA',
    columnPatterns: {
      date: ['Fecha', 'FECHA', 'Fecha Movimiento'],
      description: ['Descripción', 'Concepto', 'Descripción Movimiento'],
      reference: ['Referencia', 'No. Referencia', 'Número Referencia'],
      debit: ['Débito', 'Cargo', 'Valor Débito', 'Débitos'],
      credit: ['Crédito', 'Abono', 'Valor Crédito', 'Créditos'],
      balance: ['Saldo', 'Balance', 'Saldo Disponible', 'Saldo Cuenta']
    },
    dateFormat: 'DD/MM/YYYY',
    currencySymbol: 'L.',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    rowStartIndex: 1,
    requiredColumns: ['date', 'description']
  },
  'OCCIDENTE': {
    name: 'Banco de Occidente',
    identifier: 'OCCIDENTE',
    columnPatterns: {
      date: ['Fecha', 'FECHA', 'Fecha Operación'],
      description: ['Descripción', 'Concepto', 'Glosa', 'Descripción Movimiento'],
      reference: ['Referencia', 'No. Documento', 'Documento', 'N° Doc'],
      debit: ['Débito', 'Cargo', 'Débitos', 'Retiros'],
      credit: ['Crédito', 'Abono', 'Créditos', 'Depósitos'],
      balance: ['Saldo', 'Balance', 'Saldo Final', 'Saldo Contable']
    },
    dateFormat: 'DD/MM/YYYY',
    currencySymbol: 'L.',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    rowStartIndex: 1,
    requiredColumns: ['date', 'description']
  },
  'PROMERICA': {
    name: 'Banco Promerica',
    identifier: 'PROMERICA',
    columnPatterns: {
      date: ['Fecha', 'FECHA', 'Fecha Transacción'],
      description: ['Descripción', 'Concepto', 'Detalle Operación'],
      reference: ['Referencia', 'No. Referencia', 'Número Operación'],
      debit: ['Débito', 'Cargo', 'Débitos', 'Retiros'],
      credit: ['Crédito', 'Abono', 'Créditos', 'Depósitos'],
      balance: ['Saldo', 'Balance', 'Saldo Actual', 'Saldo Final']
    },
    dateFormat: 'DD/MM/YYYY',
    currencySymbol: 'L.',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    rowStartIndex: 1,
    requiredColumns: ['date', 'description']
  },
  'BANRURAL': {
    name: 'Banrural',
    identifier: 'BANRURAL',
    columnPatterns: {
      date: ['Fecha', 'FECHA', 'Fecha Movimiento'],
      description: ['Descripción', 'Concepto', 'Detalle', 'Glosa'],
      reference: ['Referencia', 'No. Operación', 'Número', 'Cod. Ref'],
      debit: ['Débito', 'Cargo', 'Débitos', 'Retiros'],
      credit: ['Crédito', 'Abono', 'Créditos', 'Depósitos'],
      balance: ['Saldo', 'Balance', 'Saldo Actual', 'Saldo Final']
    },
    dateFormat: 'DD/MM/YYYY',
    currencySymbol: 'L.',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    rowStartIndex: 1,
    requiredColumns: ['date', 'description']
  },
  'LAFISE': {
    name: 'Banco Lafise',
    identifier: 'LAFISE',
    columnPatterns: {
      date: ['Fecha', 'FECHA', 'Fecha Operación'],
      description: ['Descripción', 'Concepto', 'Detalle Operación'],
      reference: ['Referencia', 'No. Referencia', 'Número Operación'],
      debit: ['Débito', 'Cargo', 'Débitos', 'Retiros'],
      credit: ['Crédito', 'Abono', 'Créditos', 'Depósitos'],
      balance: ['Saldo', 'Balance', 'Saldo Actual', 'Saldo Final']
    },
    dateFormat: 'DD/MM/YYYY',
    currencySymbol: 'L.',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    rowStartIndex: 1,
    requiredColumns: ['date', 'description']
  }
};

export class BankExcelMapper {
  /**
   * Detects the bank format from Excel headers
   */
  static detectBankFormat(headers: string[]): BankDetectionResult {
    const scores: Record<string, number> = {};
    
    // Score each bank format based on header matches
    Object.entries(BANK_FORMATS).forEach(([bankKey, format]) => {
      let score = 0;
      let matchedColumns = 0;
      
      Object.entries(format.columnPatterns).forEach(([columnType, patterns]: [string, string[]]) => {
        const hasMatch = patterns.some((pattern: string) => 
          headers.some((header: string) => 
            header.toLowerCase().includes(pattern.toLowerCase()) ||
            pattern.toLowerCase().includes(header.toLowerCase())
          )
        );
        
        if (hasMatch) {
          score += columnType === 'date' || columnType === 'description' ? 3 : 1;
          matchedColumns++;
        }
      });
      
      scores[bankKey] = score;
    });

    // Find the best match
    const bestMatch = Object.entries(scores).reduce((best, [bankKey, score]) => {
      return score > best.score ? { bankKey, score } : best;
    }, { bankKey: '', score: 0 });

    // Determine confidence level
    const totalColumns = Object.keys(BANK_FORMATS[bestMatch.bankKey]?.columnPatterns || {}).length;
    const confidence = bestMatch.score > 0 ? (bestMatch.score / (totalColumns * 2)) * 100 : 0;

    return {
      detectedBank: bestMatch.bankKey,
      confidence,
      format: bestMatch.bankKey ? BANK_FORMATS[bestMatch.bankKey] : null,
      alternativeMatches: Object.entries(scores)
        .filter(([key, score]) => score > 0 && key !== bestMatch.bankKey)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([key, score]) => ({ bank: key, score, format: BANK_FORMATS[key] }))
    };
  }

  /**
   * Maps Excel data to standardized transaction format
   */
  static mapExcelData(data: any[], bankFormat: BankFormat): MappedTransaction[] {
    const headers = Object.keys(data[0] || {});
    const columnMapping = this.buildColumnMapping(headers, bankFormat);
    
    return data
      .slice(bankFormat.rowStartIndex)
      .filter(row => this.isValidRow(row, columnMapping))
      .map((row, index) => this.mapRowToTransaction(row, columnMapping, bankFormat, index));
  }

  /**
   * Builds mapping from Excel columns to standardized fields
   */
  private static buildColumnMapping(headers: string[], format: BankFormat): Record<string, string> {
    const mapping: Record<string, string> = {};
    
    Object.entries(format.columnPatterns).forEach(([field, patterns]: [string, string[]]) => {
      const matchedHeader = headers.find((header: string) => 
        patterns.some((pattern: string) => 
          header.toLowerCase().includes(pattern.toLowerCase()) ||
          pattern.toLowerCase().includes(header.toLowerCase())
        )
      );
      
      if (matchedHeader) {
        mapping[field] = matchedHeader;
      }
    });
    
    return mapping;
  }

  /**
   * Validates if a row contains transaction data
   */
  private static isValidRow(row: any, columnMapping: Record<string, string>): boolean {
    // Check if required fields have valid data
    const dateValue = row[columnMapping.date];
    const descriptionValue = row[columnMapping.description];
    
    return dateValue && descriptionValue && 
           dateValue !== '' && descriptionValue !== '' &&
           !this.isEmptyRow(row);
  }

  /**
   * Checks if row is completely empty
   */
  private static isEmptyRow(row: any): boolean {
    return Object.values(row).every(value => 
      value === null || value === undefined || value === ''
    );
  }

  /**
   * Maps a single row to transaction format
   */
  private static mapRowToTransaction(
    row: any, 
    columnMapping: Record<string, string>, 
    format: BankFormat,
    index: number
  ): MappedTransaction {
    const rawDate = row[columnMapping.date] || '';
    const description = row[columnMapping.description] || '';
    const reference = row[columnMapping.reference] || '';
    const rawDebit = row[columnMapping.debit] || '';
    const rawCredit = row[columnMapping.credit] || '';
    const rawBalance = row[columnMapping.balance] || '';

    return {
      id: `transaction_${index}`,
      date: this.parseDate(rawDate, format.dateFormat),
      description: this.cleanDescription(description),
      reference: this.cleanReference(reference),
      debit: this.parseAmount(rawDebit, format),
      credit: this.parseAmount(rawCredit, format),
      balance: this.parseAmount(rawBalance, format),
      currency: format.currencySymbol === '$' ? 'USD' : 'HNL',
      bankIdentifier: format.identifier,
      bankName: format.name,
      originalRow: row
    };
  }

  /**
   * Parses date based on bank format
   */
  private static parseDate(dateString: string, dateFormat: string): Date {
    if (!dateString) return new Date();
    
    try {
      // Handle different date formats
      if (dateFormat === 'DD/MM/YYYY') {
        const parts = dateString.split('/');
        if (parts.length === 3) {
          const day = parseInt(parts[0]);
          const month = parseInt(parts[1]) - 1; // JS months are 0-indexed
          const year = parseInt(parts[2]);
          return new Date(year, month, day);
        }
      }
      
      // Try parsing as is
      const parsed = new Date(dateString);
      return isNaN(parsed.getTime()) ? new Date() : parsed;
    } catch {
      return new Date();
    }
  }

  /**
   * Cleans description text
   */
  private static cleanDescription(description: string): string {
    return description
      .toString()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\-.,]/g, '');
  }

  /**
   * Cleans reference text
   */
  private static cleanReference(reference: string): string {
    return reference
      .toString()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\-]/g, '');
  }

  /**
   * Parses amount based on bank format
   */
  private static parseAmount(amountString: string, format: BankFormat): number {
    if (!amountString || amountString === '' || amountString === '-') return 0;
    
    try {
      // Remove currency symbols and formatting
      let cleanAmount = amountString
        .toString()
        .replace(format.currencySymbol, '')
        .replace(/\s/g, '')
        .replace(format.thousandsSeparator, '')
        .replace(format.decimalSeparator, '.');
      
      // Handle parentheses for negative numbers (common in banks)
      if (cleanAmount.includes('(') && cleanAmount.includes(')')) {
        cleanAmount = '-' + cleanAmount.replace(/[()]/g, '');
      }
      
      const parsed = parseFloat(cleanAmount);
      return isNaN(parsed) ? 0 : parsed;
    } catch {
      return 0;
    }
  }

  /**
   * Validates mapped transactions
   */
  static validateTransactions(transactions: MappedTransaction[]): {
    valid: MappedTransaction[];
    invalid: MappedTransaction[];
    errors: string[];
  } {
    const valid: MappedTransaction[] = [];
    const invalid: MappedTransaction[] = [];
    const errors: string[] = [];

    transactions.forEach((transaction, index) => {
      const transactionErrors: string[] = [];

      // Validate required fields
      if (!transaction.date || isNaN(transaction.date.getTime())) {
        transactionErrors.push('Fecha inválida');
      }
      
      if (!transaction.description || transaction.description.trim() === '') {
        transactionErrors.push('Descripción requerida');
      }

      // Validate amount logic
      if (transaction.debit > 0 && transaction.credit > 0) {
        transactionErrors.push('No puede tener débito y crédito simultáneamente');
      }

      if (transaction.debit < 0 || transaction.credit < 0) {
        transactionErrors.push('Los montos no pueden ser negativos');
      }

      if (transactionErrors.length > 0) {
        invalid.push(transaction);
        errors.push(`Fila ${index + 1}: ${transactionErrors.join(', ')}`);
      } else {
        valid.push(transaction);
      }
    });

    return { valid, invalid, errors };
  }

  /**
   * Generates summary statistics
   */
  static generateSummary(transactions: MappedTransaction[]): {
    totalTransactions: number;
    totalDebits: number;
    totalCredits: number;
    netAmount: number;
    dateRange: { start: Date; end: Date };
    bankIdentifier: string;
    currency: string;
  } {
    const totalDebits = transactions.reduce((sum, t) => sum + t.debit, 0);
    const totalCredits = transactions.reduce((sum, t) => sum + t.credit, 0);
    
    const dates = transactions
      .map(t => t.date)
      .filter(date => !isNaN(date.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

    return {
      totalTransactions: transactions.length,
      totalDebits,
      totalCredits,
      netAmount: totalCredits - totalDebits,
      dateRange: {
        start: dates[0] || new Date(),
        end: dates[dates.length - 1] || new Date()
      },
      bankIdentifier: transactions[0]?.bankIdentifier || '',
      currency: transactions[0]?.currency || 'HNL'
    };
  }
}
