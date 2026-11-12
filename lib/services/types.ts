export interface BankFormat {
  name: string;
  identifier: string;
  columnPatterns: {
    date: string[];
    description: string[];
    reference: string[];
    debit: string[];
    credit: string[];
    balance: string[];
  };
  dateFormat: string;
  currencySymbol: string;
  decimalSeparator: string;
  thousandsSeparator: string;
  rowStartIndex: number;
  requiredColumns: string[];
}

export interface MappedTransaction {
  id: string;
  date: Date;
  description: string;
  reference: string;
  debit: number;
  credit: number;
  balance: number;
  currency: string;
  bankIdentifier: string;
  bankName: string;
  originalRow: any;
}

export interface BankDetectionResult {
  detectedBank: string;
  confidence: number;
  format: BankFormat | null;
  alternativeMatches: Array<{
    bank: string;
    score: number;
    format: BankFormat;
  }>;
}

export interface ExcelImportResult {
  success: boolean;
  bankDetection: BankDetectionResult;
  transactions: MappedTransaction[];
  summary: {
    totalTransactions: number;
    totalDebits: number;
    totalCredits: number;
    netAmount: number;
    dateRange: { start: Date; end: Date };
    bankIdentifier: string;
    currency: string;
  };
  validation: {
    valid: MappedTransaction[];
    invalid: MappedTransaction[];
    errors: string[];
  };
  errors?: string[];
}
