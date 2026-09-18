/**
 * Tipos TypeScript para entidades contables
 * Centraliza definiciones para evitar `any` / `Record<string,unknown>` y errores en runtime.
 * Fuente: prisma/schema.prisma (Account, Transaction, JournalEntry) + supabase chart_of_accounts/period_locks/account_audit_log
 */

// ---------------------------------------------------------------------------
// Enums / unions
// ---------------------------------------------------------------------------

export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
export type AccountNature = 'DEBIT' | 'CREDIT';
export type VoucherType = 'INGRESO' | 'EGRESO' | 'DIARIO' | 'AJUSTE' | 'BORRADOR';
export type PeriodStatus = 'open' | 'closed' | 'locked';
export type JournalEntryType = 'DEBIT' | 'CREDIT';
export type AccountAuditAction =
  | 'OPENING_BALANCE_UPDATE'
  | 'OPENING_BALANCE_AUTO'
  | 'PERIOD_CLOSED'
  | 'PERIOD_REOPENED'
  | 'PERIOD_LOCKED'
  | 'JOURNAL_CREATE'
  | 'JOURNAL_ENTRY_CREATE'
  | 'INSERT'
  | 'UPDATE'
  | 'DELETE';

// ---------------------------------------------------------------------------
// Prisma — contabilidad doble entrada
// ---------------------------------------------------------------------------

export interface Account {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  type: AccountType;
  description?: string | null;
  parentId?: string | null;
  isActive: boolean;
  createdAt: string; // ISO
  updatedAt: string;
}

export interface Transaction {
  id: string;
  tenantId: string;
  date: string; // ISO
  description: string;
  reference?: string | null;
  voucherType: VoucherType;
  voucherNumber: number;
  currency: string; // HNL | USD
  exchangeRate: number;
  totalAmount: number; // en unidad base (no BigInt en API)
  clienteRTN?: string | null;
  proveedorRTN?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface JournalEntry {
  id: string;
  transactionId: string;
  accountId: string;
  tenantId: string;
  /** Con signo: débito +, crédito − (misma convención que trial-balance) */
  amount: number;
  originalAmount: number;
  type: JournalEntryType;
  currency: string;
  exchangeRate: number;
  description?: string | null;
  cleared: boolean;
  createdAt: string;
}

// Input para creación vía journal-service (acepta ambas convenciones)
export interface JournalEntryInput {
  accountId: string;
  /** Positivo débito, negativo crédito si isDebit omitido; si isDebit presente, valor absoluto */
  amount: number;
  isDebit?: boolean;
  description?: string;
}

export interface CreateJournalInput {
  description: string;
  date: string; // YYYY-MM-DD o ISO
  currency?: string;
  exchangeRate?: number;
  voucherType?: VoucherType;
  reference?: string;
  entries: JournalEntryInput[];
}

// ---------------------------------------------------------------------------
// Supabase — chart_of_accounts
// ---------------------------------------------------------------------------

export interface ChartOfAccountsRow {
  id: string;
  tenant_id: string;
  company_id?: string | null;
  code: string;
  name: string;
  type: AccountType;
  nature: AccountNature;
  level: number;
  parent_id?: string | null;
  is_selectable: boolean;
  is_active: boolean;
  currency?: string | null;
  fiscal_code?: string | null;
  balance: number; // BIGINT en DB, number en API
  opening_balance: number;
  opening_balance_date: string | null; // YYYY-MM-DD
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Supabase — period_locks (cierre mensual + anual month=0)
// ---------------------------------------------------------------------------

export interface PeriodLock {
  id: string;
  tenant_id: string;
  year: number;
  /** 0 = anual, 1-12 = mensual */
  month: number;
  status: PeriodStatus;
  closed_by?: string | null;
  closed_at?: string | null;
  locked_by?: string | null;
  locked_at?: string | null;
  reopened_by?: string | null;
  reopened_at?: string | null;
  reopen_reason?: string | null;
  trial_balance_snapshot?: unknown | null;
  total_debits?: number | null;
  total_credits?: number | null;
  transaction_count?: number | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Supabase — account_audit_log
// ---------------------------------------------------------------------------

export interface AccountAuditLog {
  id: string;
  tenant_id: string;
  account_id: string | null;
  account_code: string;
  action: AccountAuditAction | string;
  old_values?: unknown | null;
  new_values?: unknown | null;
  performed_by: string;
  performed_at: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Helpers de tipo
// ---------------------------------------------------------------------------

export function isAccountType(v: string): v is AccountType {
  return ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'].includes(v);
}

export function isVoucherType(v: string): v is VoucherType {
  return ['INGRESO', 'EGRESO', 'DIARIO', 'AJUSTE', 'BORRADOR'].includes(v);
}

export function assertAccountType(v: string): AccountType {
  if (!isAccountType(v)) throw new Error(`AccountType inválido: ${v}`);
  return v;
}
