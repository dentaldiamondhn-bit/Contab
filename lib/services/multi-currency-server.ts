import { db } from '@/lib/db';
import { getExchangeRate } from './multi-currency';

export interface MultiCurrencyTransactionData {
  description: string;
  date?: Date;
  reference?: string;
  currency: string;
  entries: Array<{
    accountId: string;
    amount: number; // in transaction currency cents
    description?: string;
  }>;
}

/**
 * Create a multi-currency transaction (server-side only)
 */
export async function createMultiCurrencyTransaction(
  transactionData: MultiCurrencyTransactionData,
  userId?: string
) {
  const { currency, entries, ...rest } = transactionData;
  const transactionDate = transactionData.date || new Date();
  
  // Get exchange rate to functional currency (HNL)
  const exchangeRate = await getExchangeRate(currency, 'HNL', transactionDate);
  
  // Calculate total amounts
  const totalAmount = entries.reduce((sum, entry) => sum + entry.amount, 0);
  const functionalAmount = Math.round(totalAmount * exchangeRate);
  
  // Create the transaction
  const transaction = await (db as any).transaction.create({
    data: {
      ...rest,
      date: transactionDate,
      currency,
      exchangeRate,
      totalAmount: BigInt(totalAmount),
      tenantId: 'default',
    }
  });

  // Create journal entries separately
  await Promise.all(
    entries.map((entry) => {
      const functionalEntryAmount = Math.round(entry.amount * exchangeRate);
      
      return (db as any).journalEntry.create({
        data: {
          transactionId: transaction.id,
          accountId: entry.accountId,
          tenantId: 'default',
          amount: BigInt(functionalEntryAmount), // Functional currency amount
          originalAmount: BigInt(entry.amount), // Original currency amount
          currency,
          exchangeRate,
          description: entry.description
        }
      });
    })
  );

  return transaction;
}

/**
 * Get functional currency balance for an account (server-side only)
 */
export async function getAccountFunctionalBalance(
  accountId: string,
  endDate?: Date
): Promise<number> {
  const entries = await (db as any).journalEntry.findMany({
    where: {
      accountId,
      transaction: {
        date: endDate ? { lte: endDate } : undefined
      }
    }
  } as any);

  return entries.reduce((sum: number, entry: any) => sum + Number(entry.amount), 0);
}
