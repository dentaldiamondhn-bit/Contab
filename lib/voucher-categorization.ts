import { VOUCHER_TYPES, type VoucherType } from './voucher-types';

// Cash and bank account identifiers
const CASH_BANK_KEYWORDS = [
  'cash', 'bank', 'banco', 'efectivo', 'caja', 'cuenta', 'account',
  'checking', 'savings', 'ahorro', 'corriente'
];

// Account codes that typically represent cash/bank accounts
const CASH_BANK_CODE_PATTERNS = [
  /^1[0-9]{3}$/, // Asset accounts starting with 1 (typically cash/bank)
  /^10[0-9]{2}$/, // More specific cash/bank codes
  /^110[0-9]$/,   // Even more specific
];

/**
 * Determines if an account is a Cash or Bank account
 */
export function isCashOrBankAccount(account: { code: string; name: string; type: string }): boolean {
  const { code, name, type } = account;
  
  // Check account type (Assets are most likely to contain cash/bank)
  if (type.toUpperCase() !== 'ASSET') {
    return false;
  }
  
  // Check account code patterns
  const codeMatches = CASH_BANK_CODE_PATTERNS.some(pattern => pattern.test(code));
  
  // Check name keywords (case insensitive)
  const nameLower = name.toLowerCase();
  const nameMatches = CASH_BANK_KEYWORDS.some(keyword => nameLower.includes(keyword));
  
  return codeMatches || nameMatches;
}

/**
 * Automatically determines voucher type based on transaction entries
 * Rules:
 * - If Cash/Bank account is DEBITED (positive amount) → INGRESO (Income)
 * - If Cash/Bank account is CREDITED (negative amount) → EGRESO (Expense)  
 * - Otherwise → DIARIO (General Journal)
 */
export function autoDetectVoucherType(entries: Array<{ accountId: string; amount: number }>, accounts: Array<{ id: string; code: string; name: string; type: string }>): VoucherType {
  // Find accounts involved in the transaction
  const involvedAccounts = accounts.filter(account => 
    entries.some(entry => entry.accountId === account.id)
  );
  
  // Look for cash/bank accounts in the transaction
  const cashBankEntries = entries.filter(entry => {
    const account = involvedAccounts.find(acc => acc.id === entry.accountId);
    return account && isCashOrBankAccount(account);
  });
  
  if (cashBankEntries.length === 0) {
    // No cash/bank accounts involved → General journal
    return VOUCHER_TYPES.DIARIO;
  }
  
  // Check if any cash/bank account is debited (positive amount)
  const hasCashBankDebit = cashBankEntries.some(entry => entry.amount > 0);
  
  if (hasCashBankDebit) {
    return VOUCHER_TYPES.INGRESO; // Money coming in
  } else {
    return VOUCHER_TYPES.EGRESO;  // Money going out
  }
}

/**
 * Enhanced auto-detection that considers transaction context
 */
export async function smartVoucherCategorization(entries: Array<{ accountId: string; amount: number }>): Promise<VoucherType> {
  const { db } = await import('./db');
  
  // Fetch all accounts involved in the transaction
  const accountIds = entries.map(entry => entry.accountId);
  const accounts = await db.account.findMany({
    where: { id: { in: accountIds } },
    select: { id: true, code: true, name: true, type: true }
  });
  
  return autoDetectVoucherType(entries, accounts);
}
