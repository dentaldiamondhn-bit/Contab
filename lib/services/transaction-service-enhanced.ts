import { db } from '@/lib/db';
import { ExchangeRateService } from './exchange-rate-service';

// Enhanced transaction service with NIIF compliance
export class TransactionService {
  /**
   * Create a transaction with proper currency tracking for NIIF compliance
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
  }) {
    try {
      // Get exchange rate if needed
      const exchangeRateResult = await ExchangeRateService.convertToFunctionalCurrency(
        1, // We'll calculate total amount later
        data.currency,
        data.date
      );

      // Calculate total amount in original currency
      const totalAmount = data.entries.reduce((sum: number, entry) => {
        return sum + Math.abs(entry.amount);
      }, 0);

      // Convert to functional currency (HNL)
      const functionalAmount = totalAmount * exchangeRateResult.exchangeRate;

      // Create the transaction
      const transaction = await (db as any).transaction.create({
        data: {
          date: data.date,
          description: data.description,
          reference: data.reference,
          voucherType: data.voucherType,
          voucherNumber: data.voucherNumber,
          currency: data.currency,
          exchangeRate: exchangeRateResult.exchangeRate,
          totalAmount: BigInt(Math.round(totalAmount * 100)), // Convert to cents
          originalTotal: BigInt(Math.round(totalAmount * 100)), // Store original total in cents
          tenantId: 'default',
        }
      });

      // Create journal entries separately
      await Promise.all(
        data.entries.map((entry, index) => {
          // Convert entry amount to functional currency
          const entryFunctionalAmount = entry.amount * exchangeRateResult.exchangeRate;
          const entryAmountCents = BigInt(Math.round(entry.amount * 100));
          const entryFunctionalAmountCents = BigInt(Math.round(entryFunctionalAmount * 100));

          return (db as any).journalEntry.create({
            data: {
              transactionId: transaction.id,
              accountId: entry.accountId,
              tenantId: 'default',
              amount: entryFunctionalAmountCents,
              originalAmount: entryAmountCents,
              currency: data.currency,
              exchangeRate: exchangeRateResult.exchangeRate,
            }
          });
        })
      );

      // Create currency history records
      await ExchangeRateService.createCurrencyHistory(
        transaction.id,
        data.entries.map((entry, index) => ({
          id: index.toString(),
          amount: entry.amount,
          originalAmount: entry.amount,
          currency: data.currency,
          exchangeRate: exchangeRateResult.exchangeRate
        })),
        data.date,
        exchangeRateResult.exchangeSource
      );

      console.log(`Transaction created: ${data.voucherType}-${data.voucherNumber} (${data.currency})`);
      return transaction;
    } catch (error) {
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
            }
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
          currencyHistories: {
            select: {
              id: true,
              date: true,
              originalCurrency: true,
              originalAmount: true,
              functionalAmount: true,
              exchangeRate: true,
              exchangeSource: true,
              valuationMethod: true,
              notes: true
            }
          }
        },
        orderBy: {
          date: 'desc'
        },
        skip: (page - 1) * limit,
        take: limit
      } as any);

      return transactions;
    } catch (error) {
      console.error('Error getting transactions:', error);
      throw error;
    }
  }

  /**
   * Get currency conversion report for NIIF compliance
   */
  static async getCurrencyConversionReport({
    startDate,
    endDate,
    currency
  }: {
    startDate: Date;
    endDate: Date;
    currency?: string;
  }) {
    try {
      const history = await ExchangeRateService.getCurrencyHistory(
        undefined, // All transactions
        startDate,
        endDate,
        currency
      );

      // Group by currency and calculate totals
      const report: Record<string, {
        originalAmount: number;
        functionalAmount: number;
        averageRate: number;
        transactionCount: number;
        rates: Array<{
          date: Date;
          rate: number;
          source: string;
        }>
      }> = {};

      history.forEach(h => {
        const key = h.originalCurrency;
        
        if (!report[key]) {
          report[key] = {
            originalAmount: 0,
            functionalAmount: 0,
            averageRate: 0,
            transactionCount: 0,
            rates: []
          };
        }

        report[key].originalAmount += h.originalAmount;
        report[key].functionalAmount += h.functionalAmount;
        report[key].transactionCount += 1;
        report[key].rates.push({
          date: h.date,
          rate: h.exchangeRate,
          source: h.exchangeSource
        });
      });

      // Calculate average rates
      Object.keys(report).forEach(key => {
        const totalRate = report[key].rates.reduce((sum: number, r) => sum + r.rate, 0);
        report[key].averageRate = totalRate / report[key].rates.length;
      });

      return report;
    } catch (error) {
      console.error('Error generating currency conversion report:', error);
      throw error;
    }
  }

  /**
   * Revalueate transactions for period-end closing
   */
  static async revalueateTransactions(
    startDate: Date,
    endDate: Date,
    targetCurrency: string = 'HNL'
  ): Promise<{
    revaluedCount: number;
    adjustments: Array<{
      transactionId: string;
      originalFunctionalAmount: number;
      newFunctionalAmount: number;
      difference: number;
      originalRate: number;
      newRate: number;
    }>;
  }> {
    try {
      // Get all transactions in the period
      const transactions = await this.getTransactionsWithCurrencyFilter({
        startDate,
        endDate
      });

      const adjustments = [];

      for (const transaction of transactions) {
        if (transaction.currency !== targetCurrency) {
          // Get current rate for the transaction date
          const currentRateResult = await ExchangeRateService.convertToFunctionalCurrency(
            1,
            transaction.currency,
            transaction.date
          );

          const newFunctionalAmount = Number(transaction.totalAmount) / 100 * currentRateResult.exchangeRate;
          const originalFunctionalAmount = Number(transaction.functionalAmount) / 100;
          const difference = newFunctionalAmount - originalFunctionalAmount;

          if (Math.abs(difference) > 0.01) { // Only revalue if difference is significant
            // Update the transaction
            await db.transaction.update({
              where: { id: transaction.id },
              data: {
                exchangeRate: currentRateResult.exchangeRate,
                functionalAmount: BigInt(Math.round(newFunctionalAmount * 100))
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
                amount: Number(entry.amount) / 100,
                originalAmount: entry.originalAmount,
                currency: entry.currency,
                exchangeRate: entry.exchangeRate
              })),
              transaction.date,
              'REVALUATION'
            );

            adjustments.push({
              transactionId: transaction.id,
              originalFunctionalAmount,
              newFunctionalAmount,
              difference,
              originalRate: transaction.exchangeRate,
              newRate: currentRateResult.exchangeRate
            });
          }
        }
      }

      console.log(`Revalued ${adjustments.length} transactions for period ${startDate.toISOString()} to ${endDate.toISOString()}`);

      return {
        revaluedCount: adjustments.length,
        adjustments
      };
    } catch (error) {
      console.error('Error revaluing transactions:', error);
      throw error;
    }
  }
}
