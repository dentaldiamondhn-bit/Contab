import { db } from '@/lib/db';

export interface AccountDetailEntry {
  id: string;
  date: Date;
  description: string;
  reference?: string;
  debitAmount: number; // in cents
  creditAmount: number; // in cents
  runningBalance: number; // in cents
  transactionId: string;
  cleared: boolean;
}

export interface AccountDetailsReport {
  account: {
    id: string;
    code: string;
    name: string;
    type: string;
    description?: string;
  };
  entries: AccountDetailEntry[];
  openingBalance: number; // in cents
  closingBalance: number; // in cents
  totalDebits: number; // in cents
  totalCredits: number; // in cents
  period: {
    startDate: Date;
    endDate: Date;
  };
  generatedAt: Date;
}

/**
 * Generates an Auxiliar de Cuentas (Account Details) report
 * Shows all transactions for a specific account with running balances
 */
export async function generateAccountDetails(
  accountId: string,
  startDate?: Date,
  endDate?: Date
): Promise<AccountDetailsReport | null> {
  // Default to current month if no dates provided
  const now = new Date();
  const periodStart = startDate || new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = endDate || new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Get account details
  const account = await db.account.findUnique({
    where: { id: accountId }
  });

  if (!account) {
    return null;
  }

  // Calculate opening balance (all entries before the period)
  const openingEntries = await db.journalEntry.findMany({
    where: {
      accountId,
      transaction: {
        date: {
          lt: periodStart
        }
      }
    },
    include: {
      transaction: true
    },
    orderBy: {
      transaction: {
        date: 'asc'
      }
    }
  });

  let openingBalance = openingEntries.reduce((sum: bigint, entry: any) => sum + entry.amount, 0n);

  // Get all entries within the period
  const periodEntries = await db.journalEntry.findMany({
    where: {
      accountId,
      transaction: {
        date: {
          gte: periodStart,
          lte: periodEnd
        }
      }
    },
    include: {
      transaction: true
    },
    orderBy: {
      transaction: {
        date: 'asc'
      }
    }
  });

  // Build entries with running balances
  const entries: AccountDetailEntry[] = [];
  let runningBalance = Number(openingBalance);

  for (const entry of periodEntries) {
    const entryAmount = Number(entry.amount);
    runningBalance += entryAmount;

    // Determine debit and credit amounts based on account type and entry amount
    let debitAmount = 0;
    let creditAmount = 0;

    if (['ASSET', 'EXPENSE'].includes(account.type)) {
      // Assets and Expenses: Debits increase, Credits decrease
      if (entryAmount >= 0) {
        debitAmount = entryAmount;
      } else {
        creditAmount = Math.abs(entryAmount);
      }
    } else {
      // Liabilities, Equity, Revenue: Credits increase, Debits decrease
      if (entryAmount >= 0) {
        creditAmount = entryAmount;
      } else {
        debitAmount = Math.abs(entryAmount);
      }
    }

    entries.push({
      id: entry.id,
      date: entry.transaction.date,
      description: entry.transaction.description,
      reference: entry.transaction.reference,
      debitAmount,
      creditAmount,
      runningBalance,
      transactionId: entry.transactionId,
      cleared: entry.cleared
    });
  }

  // Calculate totals
  const totalDebits = entries.reduce((sum, entry) => sum + entry.debitAmount, 0);
  const totalCredits = entries.reduce((sum, entry) => sum + entry.creditAmount, 0);
  const closingBalance = runningBalance;

  return {
    account: {
      id: account.id,
      code: account.code,
      name: account.name,
      type: account.type,
      description: account.description
    },
    entries,
    openingBalance: Number(openingBalance),
    closingBalance,
    totalDebits,
    totalCredits,
    period: {
      startDate: periodStart,
      endDate: periodEnd
    },
    generatedAt: new Date()
  };
}

/**
 * Gets all accounts for selection in the report
 */
export async function getAllAccounts() {
  return await db.account.findMany({
    orderBy: {
      code: 'asc'
    },
    select: {
      id: true,
      code: true,
      name: true,
      type: true
    }
  });
}

/**
 * Formats currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount / 100);
}
