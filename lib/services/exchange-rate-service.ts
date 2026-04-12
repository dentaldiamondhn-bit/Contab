import { db } from '@/lib/db';

// Exchange rate service for NIIF compliance
export class ExchangeRateService {
  /**
   * Get the current exchange rate for a currency pair
   */
  static async getCurrentRate(fromCurrency: string, toCurrency: string): Promise<number> {
    try {
      // Try to get the most recent rate
      const latestRate = await db.exchangeRate.findFirst({
        where: {
          fromCurrency,
          toCurrency,
          isActive: true
        },
        orderBy: {
          date: 'desc'
        }
      });

      if (latestRate) {
        return latestRate.rate;
      }

      // If no rate found, try to fetch from external source
      return await this.fetchExternalRate(fromCurrency, toCurrency);
    } catch (error) {
      console.error('Error getting exchange rate:', error);
      return 1.0; // Default to 1:1 if all else fails
    }
  }

  /**
   * Store an exchange rate in the database
   */
  static async storeExchangeRate(
    fromCurrency: string,
    toCurrency: string,
    rate: number,
    source: string = 'MANUAL'
  ): Promise<void> {
    try {
      await db.exchangeRate.create({
        data: {
          fromCurrency,
          toCurrency,
          rate,
          source,
          date: new Date(),
        }
      });
      console.log(`Exchange rate stored: ${fromCurrency} to ${toCurrency} = ${rate} (${source})`);
    } catch (error) {
      console.error('Error storing exchange rate:', error);
    }
  }

  /**
   * Fetch exchange rate from external source (mock implementation)
   */
  private static async fetchExternalRate(fromCurrency: string, toCurrency: string): Promise<number> {
    // In a real implementation, this would call:
    // - Banco Central de Honduras API
    // - Bank APIs (BAC, Ficohsa, etc.)
    // - Exchange rate service API
    
    // For now, return reasonable default rates for Honduras
    const defaultRates: Record<string, number> = {
      'USD-HNL': 24.50,
      'HNL-USD': 0.0408,
      'EUR-HNL': 26.75,
      'HNL-EUR': 0.0373,
    };

    const key = `${fromCurrency}-${toCurrency}`;
    return defaultRates[key] || 1.0;
  }

  /**
   * Get historical exchange rates for a period
   */
  static async getHistoricalRates(
    fromCurrency: string,
    toCurrency: string,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ date: Date; rate: number; source: string }>> {
    try {
      const rates = await db.exchangeRate.findMany({
        where: {
          fromCurrency,
          toCurrency,
          date: {
            gte: startDate,
            lte: endDate,
          },
          isActive: true
        },
        orderBy: {
          date: 'asc'
        }
      });

      return rates.map((rate: {
        id: string;
        date: Date;
        fromCurrency: string;
        toCurrency: string;
        rate: any; // Decimal from database
        source: string;
        isActive: boolean;
        createdAt: Date;
      }) => ({
        date: rate.date,
        rate: Number(rate.rate),
        source: rate.source
      }));
    } catch (error) {
      console.error('Error getting historical rates:', error);
      return [];
    }
  }

  /**
   * Convert amount from original currency to functional currency (HNL)
   */
  static async convertToFunctionalCurrency(
    amount: number,
    originalCurrency: string,
    transactionDate: Date = new Date()
  ): Promise<{
    functionalAmount: number;
    exchangeRate: number;
    exchangeSource: string;
  }> {
    try {
      const functionalCurrency = 'HNL';
      
      if (originalCurrency === functionalCurrency) {
        return {
          functionalAmount: amount,
          exchangeRate: 1.0,
          exchangeSource: 'SAME_CURRENCY'
        };
      }

      // Get the rate for the transaction date or closest available
      const rate = await this.getRateForDate(originalCurrency, functionalCurrency, transactionDate);
      
      const functionalAmount = Math.round(amount * rate.rate);

      return {
        functionalAmount,
        exchangeRate: rate.rate,
        exchangeSource: rate.source
      };
    } catch (error) {
      console.error('Error converting currency:', error);
      return {
        functionalAmount: amount,
        exchangeRate: 1.0,
        exchangeSource: 'ERROR'
      };
    }
  }

  /**
   * Get exchange rate for a specific date (or closest available)
   */
  private static async getRateForDate(
    fromCurrency: string,
    toCurrency: string,
    date: Date
  ): Promise<{ rate: number; source: string }> {
    try {
      // Try to get exact rate for the date
      const exactRate = await db.exchangeRate.findFirst({
        where: {
          fromCurrency,
          toCurrency,
          date: {
            gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
            lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
          },
          isActive: true
        },
        orderBy: {
          date: 'desc'
        }
      });

      if (exactRate) {
        return { rate: exactRate.rate, source: exactRate.source };
      }

      // If no exact rate, get the most recent rate before the date
      const previousRate = await db.exchangeRate.findFirst({
        where: {
          fromCurrency,
          toCurrency,
          date: {
            lt: date
          },
          isActive: true
        },
        orderBy: {
          date: 'desc'
        }
      });

      if (previousRate) {
        return { rate: previousRate.rate, source: previousRate.source };
      }

      // If no historical rate, get current rate
      const currentRate = await this.getCurrentRate(fromCurrency, toCurrency);
      return { rate: currentRate, source: 'CURRENT_RATE' };
    } catch (error) {
      console.error('Error getting rate for date:', error);
      return { rate: 1.0, source: 'ERROR' };
    }
  }

  /**
   * Create currency history records for a transaction
   */
  static async createCurrencyHistory(
    transactionId: string,
    journalEntries: Array<{
      id: string;
      amount: number;
      originalAmount: number;
      currency: string;
      exchangeRate: number;
    }>,
    transactionDate: Date,
    exchangeSource: string = 'MANUAL'
  ): Promise<void> {
    try {
      const historyRecords = journalEntries.map((entry: {
        id: string;
        amount: number;
        originalAmount: number;
        currency: string;
        exchangeRate: number;
      }) => ({
        transactionId,
        journalEntryId: entry.id,
        date: transactionDate,
        originalCurrency: entry.currency,
        originalAmount: BigInt(Math.round(entry.originalAmount * 100)), // Convert to cents
        functionalCurrency: 'HNL',
        functionalAmount: BigInt(Math.round(entry.amount * 100)), // Convert to cents
        exchangeRate: entry.exchangeRate,
        exchangeSource,
        valuationMethod: 'TRANSACTION_DATE'
      }));

      await db.currencyHistory.createMany({
        data: historyRecords
      });

      console.log(`Created ${historyRecords.length} currency history records`);
    } catch (error) {
      console.error('Error creating currency history:', error);
    }
  }

  /**
   * Get currency history for reporting
   */
  static async getCurrencyHistory(
    transactionId?: string,
    startDate?: Date,
    endDate?: Date,
    currency?: string
  ): Promise<Array<{
    id: string;
    date: Date;
    originalCurrency: string;
    originalAmount: number;
    functionalAmount: number;
    exchangeRate: number;
    exchangeSource: string;
    valuationMethod: string;
  }>> {
    try {
      const whereClause: any = {};

      if (transactionId) {
        whereClause.transactionId = transactionId;
      }

      if (startDate || endDate) {
        whereClause.date = {};
        if (startDate) whereClause.date.gte = startDate;
        if (endDate) whereClause.date.lte = endDate;
      }

      if (currency) {
        whereClause.originalCurrency = currency;
      }

      const history = await db.currencyHistory.findMany({
        where: whereClause,
        orderBy: {
          date: 'desc'
        },
        include: {
          transaction: {
            select: {
              id: true,
              date: true,
              description: true,
              reference: true
            }
          },
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
      });

      return history.map((h: {
        id: string;
        date: Date;
        originalCurrency: string;
        originalAmount: BigInt;
        functionalAmount: BigInt;
        exchangeRate: any; // Decimal from database
        exchangeSource: string;
        valuationMethod: string;
      }) => ({
        id: h.id,
        date: h.date,
        originalCurrency: h.originalCurrency,
        originalAmount: Number(h.originalAmount) / 100,
        functionalAmount: Number(h.functionalAmount) / 100,
        exchangeRate: h.exchangeRate,
        exchangeSource: h.exchangeSource,
        valuationMethod: h.valuationMethod
      }));
    } catch (error) {
      console.error('Error getting currency history:', error);
      return [];
    }
  }

  /**
   * Initialize default exchange rates
   */
  static async initializeDefaultRates(): Promise<void> {
    try {
      const defaultRates = [
        { from: 'USD', to: 'HNL', rate: 24.50, source: 'BANCO CENTRAL' },
        { from: 'EUR', to: 'HNL', rate: 26.75, source: 'BANCO CENTRAL' },
        { from: 'GBP', to: 'HNL', rate: 30.25, source: 'BANCO CENTRAL' },
      ];

      for (const rateData of defaultRates) {
        await this.storeExchangeRate(
          rateData.from,
          rateData.to,
          rateData.rate,
          rateData.source
        );
      }

      console.log('Default exchange rates initialized');
    } catch (error) {
      console.error('Error initializing default rates:', error);
    }
  }
}
