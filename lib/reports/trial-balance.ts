import { db } from '@/lib/db';

export interface TrialBalanceAccount {
  id: string;
  code: string;
  name: string;
  type: string;
  openingBalance: number; // in cents
  totalDebits: number; // in cents (period movements)
  totalCredits: number; // in cents (period movements)
  endingBalance: number; // in cents
  debitBalance: number; // in cents (trial balance presentation)
  creditBalance: number; // in cents (trial balance presentation)
}

export interface TrialBalanceReport {
  accounts: TrialBalanceAccount[];
  totalOpeningBalance: number; // in cents
  totalDebits: number; // in cents (period movements)
  totalCredits: number; // in cents (period movements)
  totalEndingBalance: number; // in cents
  totalTrialDebits: number; // in cents (trial balance presentation)
  totalTrialCredits: number; // in cents (trial balance presentation)
  isBalanced: boolean;
  period: {
    startDate: Date;
    endDate: Date;
  };
  generatedAt: Date;
}

/**
 * Generates a Trial Balance report for a specific period
 * Trial Balance proves that Total Debits = Total Credits
 */
export async function generateTrialBalance(
  startDate?: Date,
  endDate?: Date
): Promise<TrialBalanceReport> {
  // Default to current month if no dates provided
  const now = new Date();
  const periodStart = startDate || new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = endDate || new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Get all accounts
  const accounts = await db.account.findMany({
    orderBy: {
      code: 'asc'
    }
  });

  // Calculate balances for each account
  const trialBalanceAccounts: TrialBalanceAccount[] = [];

  for (const account of accounts) {
    // Get opening balance (all entries before period start)
    const openingEntries = await db.journalEntry.findMany({
      where: {
        accountId: account.id,
        transaction: {
          date: {
            lt: periodStart
          }
        }
      },
      include: {
        transaction: true
      }
    });

    // Get period entries (movements during period)
    const periodEntries = await db.journalEntry.findMany({
      where: {
        accountId: account.id,
        transaction: {
          date: {
            gte: periodStart,
            lte: periodEnd
          }
        }
      },
      include: {
        transaction: true
      }
    });

    // Calculate opening balance
    let openingBalance = 0n;
    for (const entry of openingEntries) {
      openingBalance += entry.amount;
    }

    // Calculate period movements
    let periodDebits = 0;
    let periodCredits = 0;
    
    for (const entry of periodEntries) {
      const amount = Number(entry.amount);
      if (amount > 0) {
        periodDebits += amount;
      } else {
        periodCredits += Math.abs(amount);
      }
    }

    // Calculate ending balance
    let endingBalance = openingBalance;
    for (const entry of periodEntries) {
      endingBalance += entry.amount;
    }

    // Determine trial balance presentation (debit/credit columns)
    let debitBalance = 0;
    let creditBalance = 0;

    const endingBalanceNumber = Number(endingBalance);

    // Normal balance rules for trial balance presentation:
    // Assets, Expenses: Normal debit balance
    // Liabilities, Equity, Revenue: Normal credit balance
    if (['ASSET', 'EXPENSE'].includes(account.type)) {
      if (endingBalanceNumber >= 0) {
        debitBalance = endingBalanceNumber;
      } else {
        creditBalance = Math.abs(endingBalanceNumber);
      }
    } else {
      if (endingBalanceNumber >= 0) {
        creditBalance = endingBalanceNumber;
      } else {
        debitBalance = Math.abs(endingBalanceNumber);
      }
    }

    trialBalanceAccounts.push({
      id: account.id,
      code: account.code,
      name: account.name,
      type: account.type,
      openingBalance: Number(openingBalance),
      totalDebits: periodDebits,
      totalCredits: periodCredits,
      endingBalance: Number(endingBalance),
      debitBalance,
      creditBalance
    });
  }

  // Calculate totals
  const totalOpeningBalance = trialBalanceAccounts.reduce((sum, account) => sum + account.openingBalance, 0);
  const totalDebits = trialBalanceAccounts.reduce((sum, account) => sum + account.totalDebits, 0);
  const totalCredits = trialBalanceAccounts.reduce((sum, account) => sum + account.totalCredits, 0);
  const totalEndingBalance = trialBalanceAccounts.reduce((sum, account) => sum + account.endingBalance, 0);
  const totalTrialDebits = trialBalanceAccounts.reduce((sum, account) => sum + account.debitBalance, 0);
  const totalTrialCredits = trialBalanceAccounts.reduce((sum, account) => sum + account.creditBalance, 0);

  const isBalanced = totalTrialDebits === totalTrialCredits;

  return {
    accounts: trialBalanceAccounts,
    totalOpeningBalance,
    totalDebits,
    totalCredits,
    totalEndingBalance,
    totalTrialDebits,
    totalTrialCredits,
    isBalanced,
    period: {
      startDate: periodStart,
      endDate: periodEnd
    },
    generatedAt: new Date()
  };
}

/**
 * Checks if a specific period is closed
 */
export async function isPeriodClosed(period: string, periodType: 'MONTHLY' | 'YEARLY'): Promise<boolean> {
  const closing = await db.bookClosing.findUnique({
    where: {
      period_periodType: {
        period,
        periodType
      }
    }
  });

  return !!closing;
}

/**
 * Closes the books for a specific period
 */
export async function closeBooks(
  period: string,
  periodType: 'MONTHLY' | 'YEARLY',
  closedBy: string,
  description?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if period is already closed
    const existingClosing = await db.bookClosing.findUnique({
      where: {
        period_periodType: {
          period,
          periodType
        }
      }
    });

    if (existingClosing) {
      return {
        success: false,
        error: `Books for ${period} (${periodType}) are already closed`
      };
    }

    // Generate trial balance to ensure books are balanced
    let startDate: Date;
    let endDate: Date;

    if (periodType === 'MONTHLY') {
      const [year, month] = period.split('-').map(Number);
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0); // Last day of month
    } else {
      const year = Number(period);
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31); // Last day of year
    }

    const trialBalance = await generateTrialBalance(startDate, endDate);

    if (!trialBalance.isBalanced) {
      return {
        success: false,
        error: `Cannot close books: Trial Balance is not balanced. Debits: ${formatCurrency(trialBalance.totalDebits)}, Credits: ${formatCurrency(trialBalance.totalCredits)}`
      };
    }

    // Close the books
    await db.bookClosing.create({
      data: {
        period,
        periodType,
        closedBy,
        description
      }
    });

    return {
      success: true
    };

  } catch (error) {
    return {
      success: false,
      error: 'Error closing books: ' + (error as Error).message
    };
  }
}

/**
 * Gets all closed periods
 */
export async function getClosedPeriods(): Promise<Array<{
  id: string;
  period: string;
  periodType: string;
  closedAt: Date;
  closedBy: string;
  description?: string;
}>> {
  return await db.bookClosing.findMany({
    orderBy: {
      closedAt: 'desc'
    }
  });
}

/**
 * Formats currency for display
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount / 100);
}
