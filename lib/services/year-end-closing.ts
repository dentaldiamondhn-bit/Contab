"use server";

import { db } from "@/lib/db";
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
      const bookClosing = await (db as any).bookClosing.create({
        data: {
          period: data.year.toString(),
          periodType: 'YEARLY',
          closedBy: data.closedBy,
          description: data.description || `Cierre del ejercicio ${data.year}`,
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
    const existingClosing = await (db as any).bookClosing.findFirst({
      where: {
        period: year.toString(),
        periodType: 'YEARLY',
      },
    });

    if (existingClosing) {
      return {
        valid: false,
        error: `Year ${year} is already closed`,
      };
    }

    // Check for unclosed months
    const unclosedMonths = await this.getUnclosedMonths(year);
    if (unclosedMonths.length > 0) {
      return {
        valid: false,
        error: `Months ${unclosedMonths.join(', ')} are not closed`,
      };
    }

    return { valid: true };
  }

  /**
   * Get unclosed months for a given year
   */
  private static async getUnclosedMonths(year: number): Promise<number[]> {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59, 999);

    // Check all months to see if they're closed
    const closedMonths = await (db as any).bookClosing.findMany({
      where: {
        period: {
          startsWith: year.toString(),
        },
        periodType: 'MONTHLY',
      },
    });

    const closedMonthNumbers = closedMonths.map((closing: any) => {
      const month = parseInt(closing.period.split('-')[1]);
      return month;
    });

    const unclosedMonths = [];
    for (let month = 1; month <= 12; month++) {
      if (!closedMonthNumbers.includes(month)) {
        unclosedMonths.push(month);
      }
    }

    return unclosedMonths;
  }

  /**
   * Check for unbalanced transactions in the period
   */
  private static async checkUnbalancedTransactions(
    startDate: Date,
    endDate: Date
  ): Promise<boolean> {
    const transactions = await (db as any).transaction.findMany({
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

    for (const transaction of transactions) {
      const debits = transaction.entries.reduce((sum: number, entry: any) => {
        return entry.amount > 0 ? sum + Number(entry.amount) : sum;
      }, 0);
      
      const credits = transaction.entries.reduce((sum: number, entry: any) => {
        return entry.amount < 0 ? sum + Math.abs(Number(entry.amount)) : sum;
      }, 0);

      if (Math.abs(debits - credits) > 0.01) {
        return true;
      }
    }

    return false;
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
    const revenueAccounts = await (db as any).account.findMany({
      where: {
        type: 'REVENUE',
      },
    });

    let totalRevenue = BigInt(0);
    for (const account of revenueAccounts) {
      const entries = await (db as any).journalEntry.findMany({
        where: {
          accountId: account.id,
          transaction: {
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
          amount: { lt: 0 }, // Credits are negative
        },
      });

      const revenue = entries.reduce((sum: bigint, entry: any) => {
        return sum + BigInt(Math.abs(Number(entry.amount)));
      }, BigInt(0));

      totalRevenue += revenue;
    }

    // Get expense accounts
    const expenseAccounts = await (db as any).account.findMany({
      where: {
        type: 'EXPENSE',
      },
    });

    let totalExpenses = BigInt(0);
    for (const account of expenseAccounts) {
      const entries = await (db as any).journalEntry.findMany({
        where: {
          accountId: account.id,
          transaction: {
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
          amount: { gt: 0 }, // Debits are positive
        },
      });

      const expenses = entries.reduce((sum: bigint, entry: any) => {
        return sum + BigInt(Number(entry.amount));
      }, BigInt(0));

      totalExpenses += expenses;
    }

    const netIncome = totalRevenue - totalExpenses;

    return {
      totalRevenue,
      totalExpenses,
      netIncome,
    };
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
    const closingDate = new Date(year, 11, 31, 23, 59, 59, 999);
    const closingDescription = description || `Cierre del ejercicio ${year}`;

    // Create closing transaction
    const closingTransaction = await (db as any).transaction.create({
      data: {
        date: closingDate,
        description: closingDescription,
        voucherType: 'CLOSING',
        voucherNumber: 9999,
        currency: 'HNL',
        exchangeRate: 1.0,
        totalAmount: totalRevenue + totalExpenses,
        tenantId: 'default',
      },
    });

    // Get revenue and expense accounts for closing entries
    const revenueAccounts = await (db as any).account.findMany({
      where: { type: 'REVENUE' }
    });

    const expenseAccounts = await (db as any).account.findMany({
      where: { type: 'EXPENSE' }
    });

    // Create closing entries for revenue accounts (debit to close)
    await Promise.all(
      revenueAccounts.map(async (account: any) => {
        await (db as any).journalEntry.create({
          data: {
            transactionId: closingTransaction.id,
            accountId: account.id,
            tenantId: 'default',
            amount: totalRevenue,
            description: `Cierre - ${account.name}`,
          },
        });
      })
    );

    // Create closing entries for expense accounts (credit to close)
    await Promise.all(
      expenseAccounts.map(async (account: any) => {
        await (db as any).journalEntry.create({
          data: {
            transactionId: closingTransaction.id,
            accountId: account.id,
            tenantId: 'default',
            amount: totalExpenses,
            description: `Cierre - ${account.name}`,
          },
        });
      })
    );

    // Create entry for retained earnings
    await (db as any).journalEntry.create({
      data: {
        transactionId: closingTransaction.id,
        accountId: retainedEarningsAccountId,
        tenantId: 'default',
        amount: netIncome,
        description: `Resultado del ejercicio ${year}`,
      },
    });

    return closingTransaction.id;
  }

  /**
   * Get year-end summary
   */
  static async getYearEndSummary(year: number): Promise<{
    isClosed: boolean;
    totalRevenue: bigint;
    totalExpenses: bigint;
    netIncome: bigint;
    closingDate?: Date;
    closedBy?: string;
  }> {
    // Check if year is closed
    const bookClosing = await (db as any).bookClosing.findFirst({
      where: {
        period: year.toString(),
        periodType: 'YEARLY',
      },
    });

    if (bookClosing) {
      return {
        isClosed: true,
        totalRevenue: BigInt(0),
        totalExpenses: BigInt(0),
        netIncome: BigInt(0),
        closingDate: bookClosing.createdAt,
        closedBy: bookClosing.closedBy,
      };
    }

    // Calculate current year results
    const { totalRevenue, totalExpenses, netIncome } = await this.calculateYearResults(year);

    return {
      isClosed: false,
      totalRevenue,
      totalExpenses,
      netIncome,
    };
  }

  /**
   * Preview year-end closing without executing
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

    // Validate year completeness
    const validation = await this.validateYearIsComplete(year);
    if (!validation.valid) {
      issues.push(validation.error || 'Year validation failed');
    }

    // Check for unbalanced transactions
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59, 999);
    const hasUnbalanced = await this.checkUnbalancedTransactions(startDate, endDate);
    if (hasUnbalanced) {
      issues.push('There are unbalanced transactions in the period');
    }

    // Calculate summary
    const { totalRevenue, totalExpenses, netIncome } = await this.calculateYearResults(year);

    return {
      canClose: issues.length === 0,
      issues,
      summary: {
        totalRevenue,
        totalExpenses,
        netIncome,
      },
    };
  }
}
