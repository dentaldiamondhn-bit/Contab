"use server";

import { db } from "@/lib/db";
import { AuditService } from "@/lib/services/audit-service";
import { formatCurrency } from "@/lib/currency-utils";

export interface YearEndClosingData {
  year: number;
  closedBy: string;
  retainedEarningsAccountId: string;
  description?: string;
}

export interface YearEndResult {
  success: boolean;
  message: string;
  summary?: {
    totalRevenue: bigint;
    totalExpenses: bigint;
    netIncome: bigint;
    closingEntryId?: string;
    bookClosingId?: string;
  };
  errors?: string[];
}

export class YearEndClosingService {
  /**
   * Perform comprehensive year-end closing
   */
  static async performYearEndClosing(data: YearEndClosingData): Promise<YearEndResult> {
    const errors: string[] = [];

    try {
      // Validate year is complete
      const yearValidation = await this.validateYearIsComplete(data.year);
      if (!yearValidation.valid) {
        return {
          success: false,
          message: yearValidation.error || 'Year validation failed',
          errors: [yearValidation.error || 'Validation failed'],
        };
      }

      // Calculate revenue and expenses for the year
      const { totalRevenue, totalExpenses, netIncome } = await this.calculateYearResults(data.year);

      // Create closing entries
      const closingEntryId = await this.createClosingEntries(
        data.year,
        totalRevenue,
        totalExpenses,
        netIncome,
        data.retainedEarningsAccountId,
        data.description
      );

      // Create book closing record
      const bookClosing = await db.bookClosing.create({
        data: {
          period: data.year.toString(),
          periodType: 'YEARLY',
          closedBy: data.closedBy,
          description: data.description || `Cierre del ejercicio ${data.year}`,
        },
      });

      // Log audit trail
      await AuditService.createAuditLog({
        tableName: 'BookClosing',
        recordId: bookClosing.id,
        action: 'CREATE',
        newValues: {
          year: data.year,
          totalRevenue: totalRevenue.toString(),
          totalExpenses: totalExpenses.toString(),
          netIncome: netIncome.toString(),
          closedBy: data.closedBy,
        },
      });

      return {
        success: true,
        message: `Year ${data.year} closed successfully. Net income: ${formatCurrency(netIncome)}`,
        summary: {
          totalRevenue,
          totalExpenses,
          netIncome,
          closingEntryId,
          bookClosingId: bookClosing.id,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: `Year-end closing failed: ${errorMessage}`,
        errors: [...errors, errorMessage],
      };
    }
  }

  /**
   * Validate that the year is complete and ready for closing
   */
  private static async validateYearIsComplete(year: number): Promise<{ valid: boolean; error?: string }> {
    // Check if year is already closed
    const existingClosing = await db.bookClosing.findFirst({
      where: {
        period: year.toString(),
        periodType: 'YEARLY',
      },
    });

    if (existingClosing) {
      return { valid: false, error: `Year ${year} is already closed` };
    }

    // Check if all months are closed
    const unclosedMonths = await db.bookClosing.findMany({
      where: {
        period: {
          startsWith: year.toString(),
        },
        periodType: 'MONTHLY',
      },
    });

    const closedMonths = unclosedMonths.length;
    if (closedMonths < 12) {
      return {
        valid: false,
        error: `Not all months are closed. Only ${closedMonths} of 12 months are closed.`,
      };
    }

    // Check for unbalanced transactions
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59, 999);

    const unbalancedTransactions = await this.checkUnbalancedTransactions(startDate, endDate);
    if (unbalancedTransactions.length > 0) {
      return {
        valid: false,
        error: `Found ${unbalancedTransactions.length} unbalanced transactions that must be corrected before closing.`,
      };
    }

    return { valid: true };
  }

  /**
   * Calculate year results (revenue, expenses, net income)
   */
  private static async calculateYearResults(year: number): Promise<{
    totalRevenue: bigint;
    totalExpenses: bigint;
    netIncome: bigint;
  }> {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59, 999);

    // Get revenue accounts
    const revenueAccounts = await db.account.findMany({
      where: { type: 'REVENUE' },
    });

    // Get expense accounts
    const expenseAccounts = await db.account.findMany({
      where: { type: 'EXPENSE' },
    });

    // Calculate total revenue (sum of credits)
    let totalRevenue = 0n;
    for (const account of revenueAccounts) {
      const entries = await db.journalEntry.findMany({
        where: {
          accountId: account.id,
          amount: { lt: 0 }, // Credits
          transaction: {
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
        },
      });
      totalRevenue += entries.reduce((sum: bigint, entry: any) => sum - entry.amount, 0n);
    }

    // Calculate total expenses (sum of debits)
    let totalExpenses = 0n;
    for (const account of expenseAccounts) {
      const entries = await db.journalEntry.findMany({
        where: {
          accountId: account.id,
          amount: { gt: 0 }, // Debits
          transaction: {
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
        },
      });
      totalExpenses += entries.reduce((sum: bigint, entry: any) => sum + entry.amount, 0n);
    }

    const netIncome = totalRevenue - totalExpenses;

    return { totalRevenue, totalExpenses, netIncome };
  }

  /**
   * Create closing journal entries
   */
  private static async createClosingEntries(
    year: number,
    totalRevenue: bigint,
    totalExpenses: bigint,
    netIncome: bigint,
    retainedEarningsAccountId: string,
    description?: string
  ): Promise<string> {
    const closingDate = new Date(year, 11, 31); // December 31st

    // Create closing transaction
    const closingTransaction = await db.transaction.create({
      data: {
        date: closingDate,
        description: description || `Cierre de ejercicio ${year} - Asiento de cierre`,
        voucherType: 'AJUSTE',
        voucherNumber: 1, // Special closing voucher number
        totalAmount: totalRevenue + totalExpenses,
        functionalAmount: totalRevenue + totalExpenses,
        currency: 'HNL',
        functionalCurrency: 'HNL',
        exchangeRate: 1,
        entries: {
          create: [
            // Close revenue accounts (debit revenue, credit income summary)
            ...(totalRevenue > 0n ? [{
              accountId: '', // Will be replaced with income summary account
              amount: totalRevenue,
              originalAmount: totalRevenue,
              currency: 'HNL',
              exchangeRate: 1,
            }] : []),
            // Close expense accounts (debit income summary, credit expenses)
            ...(totalExpenses > 0n ? [{
              accountId: '', // Will be replaced with income summary account
              amount: -totalExpenses,
              originalAmount: totalExpenses,
              currency: 'HNL',
              exchangeRate: 1,
            }] : []),
            // Transfer net income to retained earnings
            {
              accountId: retainedEarningsAccountId,
              amount: netIncome,
              originalAmount: netIncome,
              currency: 'HNL',
              exchangeRate: 1,
            },
          ],
        },
      },
    });

    return closingTransaction.id;
  }

  /**
   * Check for unbalanced transactions in a date range
   */
  private static async checkUnbalancedTransactions(
    startDate: Date,
    endDate: Date
  ): Promise<any[]> {
    const transactions = await db.transaction.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        entries: true,
      },
    });

    const unbalanced: any[] = [];

    for (const transaction of transactions) {
      const sum = transaction.entries.reduce((acc: bigint, entry: any) => acc + entry.amount, 0n);
      if (sum !== 0n) {
        unbalanced.push(transaction);
      }
    }

    return unbalanced;
  }

  /**
   * Get year-end summary for a specific year
   */
  static async getYearEndSummary(year: number): Promise<{
    isClosed: boolean;
    totalRevenue: bigint;
    totalExpenses: bigint;
    netIncome: bigint;
    closingDate?: Date;
    closedBy?: string;
  }> {
    const bookClosing = await db.bookClosing.findFirst({
      where: {
        period: year.toString(),
        periodType: 'YEARLY',
      },
    });

    const { totalRevenue, totalExpenses, netIncome } = await this.calculateYearResults(year);

    return {
      isClosed: !!bookClosing,
      totalRevenue,
      totalExpenses,
      netIncome,
      closingDate: bookClosing?.closedAt,
      closedBy: bookClosing?.closedBy,
    };
  }

  /**
   * Preview year-end closing before committing
   */
  static async previewYearEndClosing(year: number): Promise<{
    canClose: boolean;
    issues: string[];
    summary: {
      totalRevenue: bigint;
      totalExpenses: bigint;
      netIncome: bigint;
    };
  }> {
    const issues: string[] = [];

    // Validate year is complete
    const validation = await this.validateYearIsComplete(year);
    if (!validation.valid) {
      issues.push(validation.error || 'Validation failed');
    }

    // Calculate results
    const { totalRevenue, totalExpenses, netIncome } = await this.calculateYearResults(year);

    // Check for any warnings
    if (netIncome < 0n) {
      issues.push(`Warning: Net loss of ${formatCurrency(netIncome)}`);
    }

    return {
      canClose: validation.valid,
      issues,
      summary: {
        totalRevenue,
        totalExpenses,
        netIncome,
      },
    };
  }
}

export default YearEndClosingService;
