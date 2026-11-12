
import { db } from '@/lib/db-server';
import { ExchangeRateService } from './exchange-rate-service';
import { z } from 'zod';

// Zod schema for transaction creation validation
export const TransactionCreationSchema = z.object({
  date: z.date(),
  description: z.string().min(1, 'Description is required'),
  reference: z.string().optional(),
  voucherType: z.string().min(1, 'Voucher type is required'),
  voucherNumber: z.number().int().positive('Voucher number must be positive'),
  currency: z.string().min(1, 'Currency is required'),
  entries: z.array(z.object({
    accountId: z.string().min(1, 'Account ID is required'),
    amount: z.number().finite('Amount must be a valid number'),
    type: z.enum(['DEBIT', 'CREDIT']),
  })).min(1, 'At least one entry is required'),
  tenantId: z.string().optional().refine(
    (val) => !val || /^[0-9a-f-]+$/.test(val),
    { message: 'Invalid tenantId format' }
  ),
});

export type TransactionCreationInput = z.infer<typeof TransactionCreationSchema>;

// Enhanced transaction service with NIIF compliance
export class TransactionService {
  /**
   * Create a transaction with proper currency tracking for NIIF compliance
   * 
   * Validation: Uses Zod schema to validate incoming payload before database operations
   * This ensures data integrity and prevents malformed payloads from hitting the database.
   */
  static async createTransaction(data: {
    date: Date;
    description: string;
    reference?: string;
    voucherType: string;
    voucherNumber: number;
    currency: string;
    entries: Array<{
      accountId: string;
      amount: number; // Amount in original currency
      type: 'DEBIT' | 'CREDIT';
    }>;
    tenantId?: string;
  }) {
    try {
      // Validate input using Zod schema
      const validatedData = TransactionCreationSchema.parse({
        date: data.date,
        description: data.description,
        reference: data.reference,
        voucherType: data.voucherType,
        voucherNumber: data.voucherNumber,
        currency: data.currency,
        entries: data.entries,
        tenantId: data.tenantId,
      });

      // Get exchange rate if needed
      const exchangeRateResult = await ExchangeRateService.convertToFunctionalCurrency(
        1, // We'll calculate total amount later
        validatedData.currency,
        validatedData.date
      );

      // Calculate total amount in original currency
      const totalAmount = validatedData.entries.reduce((sum: number, entry) => {
        return sum + Math.abs(entry.amount);
      }, 0);

      // Convert to functional currency (HNL)
      const functionalAmount = totalAmount * exchangeRateResult.exchangeRate;

      // Create the transaction
      const transaction = await (db as any).transaction.create({
        data: {
          date: validatedData.date,
          description: validatedData.description,
          reference: validatedData.reference,
          voucherType: validatedData.voucherType,
          voucherNumber: validatedData.voucherNumber,
          currency: validatedData.currency,
          exchangeRate: exchangeRateResult.exchangeRate,
          totalAmount: BigInt(Math.round(totalAmount * 100)), // Convert to cents
          originalTotal: BigInt(Math.round(totalAmount * 100)), // Store original total in cents
          tenantId: validatedData.tenantId || 'default',
        }
      });

      // Create journal entries separately
      await Promise.all(
        validatedData.entries.map((entry, index) => {
          // Convert entry amount to functional currency
          const entryFunctionalAmount = entry.amount * exchangeRateResult.exchangeRate;
          const entryAmountCents = BigInt(Math.round(entry.amount * 100));
          const entryFunctionalAmountCents = BigInt(Math.round(entryFunctionalAmount * 100));

          return (db as any).journalEntry.create({
            data: {
              transactionId: transaction.id,
              accountId: entry.accountId,
              tenantId: validatedData.tenantId || 'default',
              amount: entryFunctionalAmountCents,
              originalAmount: entryAmountCents,
              currency: validatedData.currency,
              exchangeRate: exchangeRateResult.exchangeRate,
            }
          });
        })
      );

      // Create currency history records
      await ExchangeRateService.createCurrencyHistory(
        transaction.id,
        validatedData.entries.map((entry, index) => ({
          id: index.toString(),
          amount: entry.amount,
          originalAmount: entry.amount,
          currency: validatedData.currency,
          exchangeRate: exchangeRateResult.exchangeRate
        })),
        validatedData.date,
        exchangeRateResult.exchangeSource
      );

      console.log(`Transaction created: ${validatedData.voucherType}-${validatedData.voucherNumber} (${validatedData.currency})`);
      return transaction;
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Validation error creating transaction:', error.issues);
        throw new Error(`Validation failed: ${error.issues.map(e => e.message).join(', ')}`);
      }
      console.error('Error creating transaction:', error);
      throw error;
    }
  }

  /**
   * Get transaction with currency history
   */
  static async getTransactionWithHistory(transactionId: string) {
    try {
      const transaction = await (db as any).transaction.findUnique({
        where: { id: transactionId },
        include: {
          entries: {
            include: {
              account: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  type: true
                }
              }
            },
          },
          currencyHistories: {
              include: {
                journalEntry: {
                  select: {
                    id: true,
                    account: {
                      select: {
                        id: true,
                        name: true,
                        code: true
                      }
                    }
                  }
                }
              }
            }
          }
        } as any);

      return transaction;
    } catch (error) {
      console.error('Error getting transaction:', error);
      throw error;
    }
  }

  /**
   * Get transactions with currency filtering
   */
  static async getTransactionsWithCurrencyFilter({
    startDate,
    endDate,
    currency,
    page = 1,
    limit = 50
  }: {
    startDate?: Date;
    endDate?: Date;
    currency?: string;
    page?: number;
    limit?: number;
  } = {}) {
    try {
      const whereClause: any = {};

      if (startDate || endDate) {
        whereClause.date = {};
        if (startDate) whereClause.date.gte = startDate;
        if (endDate) whereClause.date.lte = endDate;
      }

      if (currency) {
        whereClause.currency = currency;
      }

      const transactions = await (db as any).transaction.findMany({
        where: whereClause,
        include: {
          entries: {
            include: {
              account: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  type: true
                }
              }
            }
          },
          currencyHistories: true
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { date: 'desc' }
      } as any);

      return transactions;
    } catch (error) {
      console.error('Error getting transactions:', error);
      throw error;
    }
  }

  /**
   * Revalue transaction with current exchange rate
   */
  static async revalueTransaction(transactionId: string) {
    try {
      const transaction = await (db as any).transaction.findUnique({
        where: { id: transactionId },
        include: {
          entries: true,
          currencyHistories: true
        }
      } as any);

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // Get current exchange rate
      const currentRateResult = await ExchangeRateService.convertToFunctionalCurrency(
        1,
        transaction.currency,
        new Date()
      );

      // Calculate new functional amount
      const newFunctionalAmount = Number(transaction.totalAmount) / 100 * currentRateResult.exchangeRate;
      const originalFunctionalAmount = Number(transaction.totalAmount) / 100 * transaction.exchangeRate.toNumber();
      const difference = newFunctionalAmount - originalFunctionalAmount;

      if (Math.abs(difference) > 0.01) { // Only revalue if difference is significant
        // Update the transaction
        await db.transaction.update({
          where: { id: transaction.id },
          data: {
            exchangeRate: currentRateResult.exchangeRate
          }
        });

        // Update journal entries
        for (const entry of transaction.entries) {
          const newEntryAmount = entry.originalAmount * currentRateResult.exchangeRate;
          await db.journalEntry.update({
            where: { id: entry.id },
            data: {
              amount: entry.amount > 0 ? BigInt(Math.round(newEntryAmount * 100)) : BigInt(Math.round(newEntryAmount * 100)),
              exchangeRate: currentRateResult.exchangeRate
            }
          });
        }

        // Update currency history
        await ExchangeRateService.createCurrencyHistory(
          transaction.id,
          transaction.entries.map((entry: any) => ({
            id: entry.id,
            amount: entry.amount,
            originalAmount: entry.originalAmount,
            currency: transaction.currency,
            exchangeRate: currentRateResult.exchangeRate
          })),
          new Date(),
          currentRateResult.exchangeSource
        );
      }

      return { success: true, difference };
    } catch (error) {
      console.error('Error revaluing transaction:', error);
      throw error;
    }
  }

  /**
   * Get exchange rate history for a currency pair
   */
  static async getExchangeRateHistory(fromCurrency: string, toCurrency: string, fromDate?: Date, toDate?: Date) {
    try {
      const where: any = {
        fromCurrency,
        toCurrency,
      };
      
      if (fromDate || toDate) {
        where.date = {};
        if (fromDate) where.date.gte = fromDate;
        if (toDate) where.date.lte = toDate;
      }
      
      const history = await db.exchangeRateHistory.findMany({
        where,
        orderBy: { date: 'desc' }
      });

      return history;
    } catch (error) {
      console.error('Error getting exchange rate history:', error);
      throw error;
    }
  }
}

export default TransactionService;
