// lib/accounting-utils.ts
// Utilidades de contabilidad para validar y procesar transacciones

// Tipos de cuenta en español para mostrar en UI
export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  ASSET: 'Activo',
  LIABILITY: 'Pasivo',
  EQUITY: 'Patrimonio',
  REVENUE: 'Ingresos',
  EXPENSE: 'Gastos',
};

// Colores para badges de tipos de cuenta
export const ACCOUNT_TYPE_COLORS: Record<string, string> = {
  ASSET: 'bg-cyan-100 text-cyan-800',
  LIABILITY: 'bg-red-100 text-red-800',
  EQUITY: 'bg-green-100 text-green-800',
  REVENUE: 'bg-purple-100 text-purple-800',
  EXPENSE: 'bg-orange-100 text-orange-800',
};

/**
 * Obtiene la etiqueta en español para un tipo de cuenta
 * Works for all companies/tenants
 */
export const getAccountTypeLabel = (type: string): string => {
  return ACCOUNT_TYPE_LABELS[type] || type;
};

/**
 * Obtiene las clases de color para un tipo de cuenta
 */
export const getAccountTypeColor = (type: string): string => {
  return ACCOUNT_TYPE_COLORS[type] || 'bg-gray-100 text-gray-800';
};

export interface JournalEntry {
  account_id: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface TransactionData {
  tenant_id: string;
  date: string;
  description: string;
  voucher_type: 'INGRESO' | 'EGRESO' | 'DIARIO';
  voucher_number: number;
  currency?: string;
  exchange_rate?: number;
  entries: JournalEntry[];
}

/**
 * Valida que el Debe sea igual al Haber en una póliza
 */
export const validateEntry = (entries: { debit: number; credit: number }[]) => {
  const totalDebit = entries.reduce((sum, e) => sum + e.debit, 0);
  const totalCredit = entries.reduce((sum, e) => sum + e.credit, 0);
  
  if (totalDebit !== totalCredit) {
    const difference = totalDebit - totalCredit;
    throw new Error(
      `La póliza está descuadrada. ` +
      `Total Debe: ${totalDebit}, Total Haber: ${totalCredit}. ` +
      `Diferencia: ${difference > 0 ? '+' : ''}${difference}`
    );
  }
  
  // Validación adicional: no puede haber débito y crédito en la misma cuenta
  const accountsWithBoth = entries.filter((e: any) => e.account_id && e.debit > 0 && e.credit > 0);
  if (accountsWithBoth.length > 0) {
    throw new Error(
      'Una cuenta no puede tener débito y crédito en la misma póliza. ' +
      'Cuentas con ambos valores: ' + accountsWithBoth.map((e: any) => e.account_id).join(', ')
    );
  }
  
  // Validación: al menos un débito y un crédito
  const hasDebit = entries.some(e => e.debit > 0);
  const hasCredit = entries.some(e => e.credit > 0);
  
  if (!hasDebit || !hasCredit) {
    throw new Error('La póliza debe tener al menos un débito y un crédito');
  }
  
  return true;
};

/**
 * Calcula el balance de una cuenta
 */
export const calculateAccountBalance = (entries: JournalEntry[]) => {
  const totalDebit = entries.reduce((sum, e) => sum + e.debit, 0);
  const totalCredit = entries.reduce((sum, e) => sum + e.credit, 0);
  return totalDebit - totalCredit;
};

/**
 * Determina el tipo de saldo de una cuenta según su naturaleza
 */
export const getBalanceType = (accountType: string, balance: number) => {
  if (balance === 0) return 'ZERO';
  
  switch (accountType.toUpperCase()) {
    case 'ASSET':
    case 'EXPENSE':
      return balance > 0 ? 'DEBIT' : 'CREDIT';
    case 'LIABILITY':
    case 'EQUITY':
    case 'REVENUE':
      return balance > 0 ? 'CREDIT' : 'DEBIT';
    default:
      return 'UNKNOWN';
  }
};

/**
 * Formatea montos en centavos a formato de moneda
 */
export const formatCurrency = (amountInCents: number, currency: string = 'HNL') => {
  const amount = amountInCents / 100;
  return new Intl.NumberFormat('es-HN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

/**
 * Genera el siguiente número de voucher
 */
export const getNextVoucherNumber = (voucherType: string, lastNumber?: number) => {
  if (!lastNumber) return 1;
  return lastNumber + 1;
};

/**
 * Valida estructura de una transacción completa
 */
export const validateTransaction = (transaction: TransactionData) => {
  // Validar campos requeridos
  const requiredFields: (keyof TransactionData)[] = ['tenant_id', 'date', 'description', 'voucher_type', 'voucher_number'];
  for (const field of requiredFields) {
    if (!transaction[field]) {
      throw new Error(`El campo ${field} es requerido`);
    }
  }
  
  // Validar tipo de voucher
  const validVoucherTypes = ['INGRESO', 'EGRESO', 'DIARIO'];
  if (!validVoucherTypes.includes(transaction.voucher_type)) {
    throw new Error(`Tipo de voucher inválido. Debe ser uno de: ${validVoucherTypes.join(', ')}`);
  }
  
  // Validar que tenga partidas
  if (!transaction.entries || transaction.entries.length === 0) {
    throw new Error('La transacción debe tener al menos una partida');
  }
  
  // Validar balance de partidas
  validateEntry(transaction.entries);
  
  // Validar que todas las partidas tengan cuenta
  for (const entry of transaction.entries) {
    if (!entry.account_id) {
      throw new Error('Todas las partidas deben tener una cuenta asociada');
    }
  }
  
  return true;
};

/**
 * Prepara una transacción para guardar en la base de datos
 */
export const prepareTransaction = (transaction: TransactionData) => {
  // Validar primero
  validateTransaction(transaction);
  
  // Preparar datos para Prisma/Supabase
  return {
    ...transaction,
    currency: transaction.currency || 'HNL',
    exchange_rate: transaction.exchange_rate || 24.70,
    status: 'POSTED',
    entries: transaction.entries.map(entry => ({
      ...entry,
      debit: entry.debit || 0,
      credit: entry.credit || 0
    }))
  };
};

/**
 * Calcula el balance de comprobación
 */
export const calculateTrialBalance = (accounts: any[], entries: JournalEntry[]) => {
  return accounts.map(account => {
    const accountEntries = entries.filter(e => e.account_id === account.id);
    const balance = calculateAccountBalance(accountEntries);
    
    return {
      account_id: account.id,
      code: account.code,
      name: account.name,
      type: account.type,
      debit: balance > 0 && ['ASSET', 'EXPENSE'].includes(account.type) ? balance : 0,
      credit: balance > 0 && ['LIABILITY', 'EQUITY', 'REVENUE'].includes(account.type) ? Math.abs(balance) : 0,
      balance: Math.abs(balance),
      balance_type: getBalanceType(account.type, balance)
    };
  });
};

/**
 * Calcula el desglose de impuestos (ISV) a partir del total con impuesto incluido
 * 
 * @param totalWithTax - Monto total con impuesto incluido (en centavos)
 *                      Ejemplo: 115000 para L. 1,150.00
 * @param taxRate - Tasa de impuesto (0.15 para 15% o 0.18 para 18%)
 *                 Por defecto: 0.15 (15%)
 * 
 * @returns Objeto con el desglose de montos
 * 
 * @example
 * ```typescript
 * const result = calculateTaxBreakdown(115000, 0.15);
 * console.log(result);
 * // {
 * //   netAmount: 100000,    // L. 1,000.00
 * //   taxAmount: 15000,     // L. 150.00
 * //   totalWithTax: 115000  // L. 1,150.00
 * // }
 * ```
 */
export const calculateTaxBreakdown = (
  totalWithTax: number, // En centavos (ej: 115000 para L. 1,150.00)
  taxRate: number = 0.15 // Ahora acepta cualquier tasa de impuesto
) => {
  // 1. Calcular el monto base (Neto)
  // Fórmula: Total / (1 + tasa)
  const netAmount = Math.round(totalWithTax / (1 + taxRate));
  
  // 2. Calcular el impuesto (ISV)
  const taxAmount = totalWithTax - netAmount;

  return {
    netAmount,
    taxAmount,
    totalWithTax
  };
};

/**
 * Convierte centavos a córdobas
 * 
 * @param cents - Monto en centavos
 * @returns Monto en córdobas
 * 
 * @example
 * ```typescript
 * fromCents(115000); // 1150.00
 * fromCents(15050); // 150.50
 * ```
 */
export const fromCents = (cents: number): number => {
  return cents / 100;
};

/**
 * Convierte un monto de córdobas a centavos
 * 
 * @param amount - Monto en córdobas
 * @returns Monto en centavos (redondeado)
 * 
 * @example
 * ```typescript
 * toCents(1150.00); // 115000
 * toCents(150.50); // 15050
 * ```
 */
export const toCents = (amount: number): number => {
  return Math.round(amount * 100);
};

/**
 * Valida que un asiento contable esté balanceado usando el formato amount (+/-)
 * 
 * @param entries - Array de asientos con amount
 * @returns true si está balanceado (suma = 0), false si no
 * 
 * @example
 * ```typescript
 * const entries = [
 *   { account_id: '1101', amount: 100000 },  // Débito
 *   { account_id: '5101', amount: -100000 }  // Crédito
 * ];
 * isBalanced(entries); // true
 * ```
 */
export const isBalanced = (entries: { amount: number }[]): boolean => {
  const sum = entries.reduce((total, entry) => total + entry.amount, 0);
  return sum === 0;
};

/**
 * Genera un resumen de transacciones por período
 */
export const generateTransactionSummary = (transactions: any[]) => {
  const summary = {
    total_transactions: transactions.length,
    by_type: {} as Record<string, number>,
    total_amount: 0,
    date_range: {
      start: null as string | null,
      end: null as string | null
    }
  };
  
  transactions.forEach(tx => {
    // Contar por tipo
    summary.by_type[tx.voucher_type] = (summary.by_type[tx.voucher_type] || 0) + 1;
    
    // Sumar montos (usando el total de débitos como referencia)
    const totalDebit = tx.entries?.reduce((sum: number, e: JournalEntry) => sum + e.debit, 0) || 0;
    summary.total_amount += totalDebit;
    
    // Actualizar rango de fechas
    if (!summary.date_range.start || tx.date < summary.date_range.start) {
      summary.date_range.start = tx.date;
    }
    if (!summary.date_range.end || tx.date > summary.date_range.end) {
      summary.date_range.end = tx.date;
    }
  });
  
  return summary;
};
