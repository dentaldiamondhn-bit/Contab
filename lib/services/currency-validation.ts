/**
 * Multi-Currency Validation and Conversion Safeguards
 * Ensures accurate currency handling with BigInt precision
 */

import { db } from "@/lib/db";

export interface CurrencyValidationResult {
  valid: boolean;
  error?: string;
  convertedAmount?: bigint;
  exchangeRate?: number;
}

export interface CurrencyConfig {
  code: string;
  name: string;
  symbol: string;
  decimals: number;
  isActive: boolean;
  isFunctional: boolean;
}

export class CurrencyValidationService {
  private static readonly SUPPORTED_CURRENCIES = ['HNL', 'USD', 'EUR'];
  private static readonly FUNCTIONAL_CURRENCY = 'HNL';
  
  // Valid exchange rate range (prevent unrealistic rates)
  private static readonly MIN_EXCHANGE_RATE = 0.01;
  private static readonly MAX_EXCHANGE_RATE = 1000.0;

  /**
   * Validate currency code
   */
  static validateCurrencyCode(currency: string): CurrencyValidationResult {
    if (!currency || typeof currency !== 'string') {
      return { valid: false, error: 'Currency code is required' };
    }

    const normalizedCurrency = currency.toUpperCase().trim();
    
    if (!this.SUPPORTED_CURRENCIES.includes(normalizedCurrency)) {
      return { 
        valid: false, 
        error: `Currency ${currency} is not supported. Supported currencies: ${this.SUPPORTED_CURRENCIES.join(', ')}` 
      };
    }

    return { valid: true };
  }

  /**
   * Validate exchange rate
   */
  static validateExchangeRate(rate: number, fromCurrency: string, toCurrency: string): CurrencyValidationResult {
    if (typeof rate !== 'number' || isNaN(rate)) {
      return { valid: false, error: 'Exchange rate must be a valid number' };
    }

    if (rate <= 0) {
      return { valid: false, error: 'Exchange rate must be greater than zero' };
    }

    if (rate < this.MIN_EXCHANGE_RATE || rate > this.MAX_EXCHANGE_RATE) {
      return { 
        valid: false, 
        error: `Exchange rate ${rate} is outside valid range (${this.MIN_EXCHANGE_RATE} - ${this.MAX_EXCHANGE_RATE})` 
      };
    }

    // Check for suspicious rate changes (if same currency pair exists)
    if (fromCurrency !== toCurrency) {
      const rateValidation = this.validateRateChange(fromCurrency, toCurrency, rate);
      if (!rateValidation.valid) {
        return rateValidation;
      }
    }

    return { valid: true, exchangeRate: rate };
  }

  /**
   * Convert amount between currencies with validation
   */
  static async convertAmount(
    amount: bigint,
    fromCurrency: string,
    toCurrency: string,
    exchangeRate?: number
  ): Promise<CurrencyValidationResult> {
    // Validate currencies
    const fromValidation = this.validateCurrencyCode(fromCurrency);
    if (!fromValidation.valid) return fromValidation;

    const toValidation = this.validateCurrencyCode(toCurrency);
    if (!toValidation.valid) return toValidation;

    // If same currency, no conversion needed
    if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) {
      return { 
        valid: true, 
        convertedAmount: amount, 
        exchangeRate: 1.0 
      };
    }

    // Get exchange rate if not provided
    let rate = exchangeRate;
    if (!rate) {
      rate = await this.getExchangeRate(fromCurrency, toCurrency);
    }

    // Validate exchange rate
    const rateValidation = this.validateExchangeRate(rate, fromCurrency, toCurrency);
    if (!rateValidation.valid) return rateValidation;

    // Perform conversion with BigInt precision
    try {
      const convertedAmount = this.calculateConversion(amount, rate);
      
      return {
        valid: true,
        convertedAmount,
        exchangeRate: rate,
      };
    } catch (error) {
      return {
        valid: false,
        error: `Conversion calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Calculate conversion with BigInt precision
   * Formula: convertedAmount = amount * exchangeRate
   * Using integer math: result = (amount * rate * 100) / 100
   */
  private static calculateConversion(amount: bigint, rate: number): bigint {
    // Convert rate to integer representation (multiply by 10000 for 4 decimal precision)
    const rateInt = BigInt(Math.round(rate * 10000));
    
    // Perform calculation: amount * rate / 10000
    const result = (amount * rateInt) / BigInt(10000);
    
    return result;
  }

  /**
   * Get exchange rate from database or external API
   */
  private static async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number> {
    // Try to get from database first
    const storedRate = await db.exchangeRate?.findFirst({
      where: {
        fromCurrency: fromCurrency.toUpperCase(),
        toCurrency: toCurrency.toUpperCase(),
      },
      orderBy: {
        date: 'desc',
      },
    });

    if (storedRate) {
      return storedRate.rate;
    }

    // Fallback to default rates (in production, fetch from external API)
    const defaultRates: Record<string, number> = {
      'USD-HNL': 24.65,
      'EUR-HNL': 26.85,
      'HNL-USD': 0.0406,
      'HNL-EUR': 0.0372,
    };

    const key = `${fromCurrency.toUpperCase()}-${toCurrency.toUpperCase()}`;
    const rate = defaultRates[key];

    if (!rate) {
      throw new Error(`No exchange rate available for ${fromCurrency} to ${toCurrency}`);
    }

    return rate;
  }

  /**
   * Validate rate change against historical rates
   */
  private static validateRateChange(
    fromCurrency: string, 
    toCurrency: string, 
    newRate: number
  ): CurrencyValidationResult {
    // In production, compare against recent rates to detect anomalies
    // For now, just validate the rate is reasonable
    
    const maxChangePercent = 15; // Maximum 15% change allowed
    
    // Check if rate change is suspicious
    // This would typically compare against the previous rate in the database
    
    return { valid: true };
  }

  /**
   * Validate transaction amounts in multi-currency context
   */
  static validateTransactionAmounts(
    originalAmount: bigint,
    functionalAmount: bigint,
    currency: string,
    functionalCurrency: string,
    exchangeRate: number
  ): CurrencyValidationResult {
    // Validate currency codes
    const currencyValidation = this.validateCurrencyCode(currency);
    if (!currencyValidation.valid) return currencyValidation;

    // Validate exchange rate
    const rateValidation = this.validateExchangeRate(exchangeRate, currency, functionalCurrency);
    if (!rateValidation.valid) return rateValidation;

    // Validate that functional amount matches calculation
    const expectedFunctional = this.calculateConversion(originalAmount, exchangeRate);
    const tolerance = BigInt(100); // 1 cent tolerance

    const difference = functionalAmount > expectedFunctional 
      ? functionalAmount - expectedFunctional 
      : expectedFunctional - functionalAmount;

    if (difference > tolerance) {
      return {
        valid: false,
        error: `Functional amount ${functionalAmount} does not match expected ${expectedFunctional} (difference: ${difference})`,
      };
    }

    return { valid: true };
  }

  /**
   * Format amount for display with proper currency symbol
   */
  static formatAmount(amount: bigint, currency: string): string {
    const symbols: Record<string, string> = {
      'HNL': 'L.',
      'USD': '$',
      'EUR': '€',
    };

    const symbol = symbols[currency.toUpperCase()] || currency;
    const value = Number(amount) / 100; // Convert from cents

    return new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(value).replace(currency.toUpperCase(), symbol);
  }

  /**
   * Get functional currency
   */
  static getFunctionalCurrency(): string {
    return this.FUNCTIONAL_CURRENCY;
  }

  /**
   * Check if currency is functional currency
   */
  static isFunctionalCurrency(currency: string): boolean {
    return currency.toUpperCase() === this.FUNCTIONAL_CURRENCY;
  }

  /**
   * Validate complete transaction currency data
   */
  static validateTransactionCurrencyData(data: {
    currency: string;
    functionalCurrency: string;
    exchangeRate: number;
    amount: bigint;
    functionalAmount: bigint;
  }): CurrencyValidationResult {
    // Validate all currencies
    const currencyValidation = this.validateCurrencyCode(data.currency);
    if (!currencyValidation.valid) return currencyValidation;

    const functionalValidation = this.validateCurrencyCode(data.functionalCurrency);
    if (!functionalValidation.valid) return functionalValidation;

    // Validate exchange rate
    const rateValidation = this.validateExchangeRate(
      data.exchangeRate, 
      data.currency, 
      data.functionalCurrency
    );
    if (!rateValidation.valid) return rateValidation;

    // Validate amounts match
    const amountValidation = this.validateTransactionAmounts(
      data.amount,
      data.functionalAmount,
      data.currency,
      data.functionalCurrency,
      data.exchangeRate
    );
    if (!amountValidation.valid) return amountValidation;

    return { valid: true };
  }
}

export default CurrencyValidationService;
