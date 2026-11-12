"use server";

import * as XLSX from 'xlsx';
import { db } from "@/lib/db";
import { parseCurrencyString } from "@/lib/currency-utils";
import { getNextVoucherNumber } from "@/lib/voucher-types";

export interface ExcelImportResult {
  success: boolean;
  message: string;
  details: {
    accountsCreated: number;
    transactionsCreated: number;
    entriesCreated: number;
    errors: string[];
    warnings: string[];
  };
}

export interface BulkTransactionData {
  date: string;
  description: string;
  voucherType: string;
  entries: Array<{
    accountCode: string;
    accountName: string;
    debit?: number;
    credit?: number;
    description?: string;
    currency?: string;
    exchangeRate?: number;
  }>;
}

export class ExcelImportService {
  /**
   * Import accounts from Excel file
   */
  static async importAccountsFromExcel(fileBuffer: Buffer): Promise<ExcelImportResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let accountsCreated = 0;

    try {
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      for (const row of data) {
        try {
          const rowData = row as any;
          
          // Validate required fields
          if (!rowData.code || !rowData.name || !rowData.type) {
            warnings.push(`Skipping row: Missing required fields (code, name, or type)`);
            continue;
          }

          // Check if account already exists
          const existingAccount = await db.account.findFirst({
            where: {
              OR: [
                { code: String(rowData.code) },
                { name: String(rowData.name) }
              ]
            }
          });

          if (existingAccount) {
            warnings.push(`Account ${rowData.code} - ${rowData.name} already exists, skipping`);
            continue;
          }

          // Create account
          const account = await (db as any).account.create({
            data: {
              code: String(rowData.code),
              name: String(rowData.name),
              type: String(rowData.type).toUpperCase(),
              description: rowData.description ? String(rowData.description) : null,
              parentId: rowData.parentCode ? await this.findAccountIdByCode(String(rowData.parentCode)) : null,
              tenantId: 'default',
            }
          });

          
          accountsCreated++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Error creating account: ${errorMessage}`);
        }
      }

      return {
        success: errors.length === 0,
        message: `Import completed. Created ${accountsCreated} accounts.`,
        details: {
          accountsCreated,
          transactionsCreated: 0,
          entriesCreated: 0,
          errors,
          warnings,
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: `Import failed: ${errorMessage}`,
        details: {
          accountsCreated,
          transactionsCreated: 0,
          entriesCreated: 0,
          errors: [...errors, errorMessage],
          warnings,
        }
      };
    }
  }

  /**
   * Import historical transactions from Excel
   */
  static async importTransactionsFromExcel(fileBuffer: Buffer): Promise<ExcelImportResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let transactionsCreated = 0;
    let entriesCreated = 0;

    try {
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      // Group rows by transaction
      const transactionGroups = this.groupRowsByTransaction(data);

      for (const group of transactionGroups) {
        try {
          // Validate transaction group
          const validation = this.validateTransactionGroup(group);
          if (!validation.valid) {
            errors.push(`Transaction ${group.date} - ${group.description}: ${validation.error}`);
            continue;
          }

          // Get voucher number
          const voucherNumber = await getNextVoucherNumber(
            group.voucherType as any, 
            new Date(group.date)
          );

          // Process entries
          const processedEntries = [];
          let totalAmount = 0n;

          for (const entry of group.entries) {
            const account = await db.account.findFirst({
              where: { code: entry.accountCode }
            });

            if (!account) {
              errors.push(`Account ${entry.accountCode} not found for transaction ${group.date}`);
              continue;
            }

            const amount = entry.debit 
              ? parseCurrencyString(String(entry.debit))
              : -parseCurrencyString(String(entry.credit || 0));

            const originalAmount = entry.currency && entry.currency !== 'HNL' && entry.exchangeRate
              ? BigInt(Math.round(Number(amount) * (entry.exchangeRate || 1)))
              : amount;

            processedEntries.push({
              accountId: account.id,
              amount,
              originalAmount,
              currency: entry.currency || 'HNL',
              exchangeRate: entry.exchangeRate || 1,
            });

            totalAmount += amount > 0 ? amount : -amount;
            entriesCreated++;
          }

          // Create transaction
          const transaction = await (db as any).transaction.create({
            data: {
              date: new Date(group.date),
              description: group.description,
              voucherType: group.voucherType as any,
              voucherNumber,
              totalAmount,
              currency: 'HNL',
              exchangeRate: 1,
              tenantId: 'default',
            },
          });

          // Create journal entries separately
          await Promise.all(
            processedEntries.map((entry: any) =>
              (db as any).journalEntry.create({
                data: {
                  transactionId: transaction.id,
                  accountId: entry.accountId,
                  tenantId: 'default',
                  amount: BigInt(entry.amount),
                  originalAmount: BigInt(entry.amount),
                  currency: 'HNL',
                  exchangeRate: 1,
                },
              })
            )
          );

          transactionsCreated++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Error creating transaction: ${errorMessage}`);
        }
      }

      return {
        success: errors.length === 0,
        message: `Import completed. Created ${transactionsCreated} transactions with ${entriesCreated} entries.`,
        details: {
          accountsCreated: 0,
          transactionsCreated,
          entriesCreated,
          errors,
          warnings,
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: `Import failed: ${errorMessage}`,
        details: {
          accountsCreated: 0,
          transactionsCreated,
          entriesCreated,
          errors: [...errors, errorMessage],
          warnings,
        }
      };
    }
  }

  /**
   * Import Chart of Accounts with hierarchical structure
   */
  static async importChartOfAccounts(fileBuffer: Buffer): Promise<ExcelImportResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let accountsCreated = 0;

    try {
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      // Sort by code to ensure parent accounts are created first
      const sortedData = (data as any[]).sort((a, b) => {
        const codeA = String(a.code || '');
        const codeB = String(b.code || '');
        return codeA.localeCompare(codeB);
      });

      for (const row of sortedData) {
        try {
          const rowData = row as any;
          
          if (!rowData.code || !rowData.name || !rowData.type) {
            warnings.push(`Skipping row: Missing required fields`);
            continue;
          }

          // Find parent if specified
          let parentId = null;
          if (rowData.parentCode) {
            const parent = await db.account.findFirst({
              where: { code: String(rowData.parentCode) }
            });
            parentId = parent?.id || null;
          }

          // Check for existing account
          const existingAccount = await db.account.findFirst({
            where: { code: String(rowData.code) }
          });

          if (existingAccount) {
            // Update existing account
            await db.account.update({
              where: { id: existingAccount.id },
              data: {
                name: String(rowData.name),
                type: String(rowData.type).toUpperCase(),
                description: rowData.description ? String(rowData.description) : null,
                parentId,
              }
            });

            warnings.push(`Updated existing account: ${rowData.code}`);
          } else {
            // Create new account
            const account = await (db as any).account.create({
              data: {
                code: String(rowData.code),
                name: String(rowData.name),
                type: String(rowData.type).toUpperCase(),
                description: rowData.description ? String(rowData.description) : null,
                parentId,
                tenantId: 'default',
              }
            });

            
            accountsCreated++;
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Error with account: ${errorMessage}`);
        }
      }

      return {
        success: errors.length === 0,
        message: `Chart of accounts import completed. Created ${accountsCreated} accounts.`,
        details: {
          accountsCreated,
          transactionsCreated: 0,
          entriesCreated: 0,
          errors,
          warnings,
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: `Import failed: ${errorMessage}`,
        details: {
          accountsCreated,
          transactionsCreated: 0,
          entriesCreated: 0,
          errors: [...errors, errorMessage],
          warnings,
        }
      };
    }
  }

  /**
   * Generate Excel template for accounts import
   */
  static generateAccountsTemplate(): Buffer {
    const template = [
      {
        code: '1001',
        name: 'Caja',
        type: 'ASSET',
        description: 'Efectivo en caja',
        parentCode: '',
      },
      {
        code: '1201',
        name: 'Cuentas por Cobrar',
        type: 'ASSET',
        description: 'Clientes',
        parentCode: '',
      },
      {
        code: '2101',
        name: 'ISV por Pagar',
        type: 'LIABILITY',
        description: 'Impuesto sobre ventas',
        parentCode: '',
      },
      {
        code: '4101',
        name: 'Ventas',
        type: 'REVENUE',
        description: 'Ingresos por ventas',
        parentCode: '',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Accounts Template');
    
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  /**
   * Generate Excel template for transactions import
   */
  static generateTransactionsTemplate(): Buffer {
    const template = [
      {
        transaction_id: '1',
        date: '2024-01-15',
        description: 'Venta de servicios',
        voucher_type: 'INGRESO',
        account_code: '1201',
        account_name: 'Cuentas por Cobrar',
        debit: 11500,
        credit: 0,
        currency: 'HNL',
        exchange_rate: 1,
        entry_description: 'Factura #001',
      },
      {
        transaction_id: '1',
        date: '2024-01-15',
        description: 'Venta de servicios',
        voucher_type: 'INGRESO',
        account_code: '4101',
        account_name: 'Ventas',
        debit: 0,
        credit: 10000,
        currency: 'HNL',
        exchange_rate: 1,
        entry_description: 'Ventas',
      },
      {
        transaction_id: '1',
        date: '2024-01-15',
        description: 'Venta de servicios',
        voucher_type: 'INGRESO',
        account_code: '2101',
        account_name: 'ISV por Pagar',
        debit: 0,
        credit: 1500,
        currency: 'HNL',
        exchange_rate: 1,
        entry_description: 'ISV 15%',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transactions Template');
    
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  // Helper methods
  private static async findAccountIdByCode(code: string): Promise<string | null> {
    const account = await db.account.findFirst({
      where: { code }
    });
    return account?.id || null;
  }

  private static groupRowsByTransaction(data: any[]): BulkTransactionData[] {
    const groups = new Map<string, BulkTransactionData>();

    for (const row of data) {
      const key = `${row.date}_${row.description}_${row.transaction_id || '1'}`;
      
      if (!groups.has(key)) {
        groups.set(key, {
          date: row.date,
          description: row.description,
          voucherType: row.voucher_type || 'DIARIO',
          entries: [],
        });
      }

      const group = groups.get(key)!;
      group.entries.push({
        accountCode: row.account_code,
        accountName: row.account_name,
        debit: row.debit ? Number(row.debit) : undefined,
        credit: row.credit ? Number(row.credit) : undefined,
        description: row.entry_description,
        currency: row.currency,
        exchangeRate: row.exchange_rate ? Number(row.exchange_rate) : undefined,
      });
    }

    return Array.from(groups.values());
  }

  private static validateTransactionGroup(group: BulkTransactionData): { valid: boolean; error?: string } {
    // Check required fields
    if (!group.date || !group.description) {
      return { valid: false, error: 'Missing date or description' };
    }

    // Validate entries balance
    let totalDebits = 0;
    let totalCredits = 0;

    for (const entry of group.entries) {
      if (entry.debit) totalDebits += entry.debit;
      if (entry.credit) totalCredits += entry.credit;
    }

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      return { valid: false, error: `Entries do not balance: Debits=${totalDebits}, Credits=${totalCredits}` };
    }

    if (totalDebits === 0 && totalCredits === 0) {
      return { valid: false, error: 'Transaction has no amounts' };
    }

    return { valid: true };
  }
}

export default ExcelImportService;
