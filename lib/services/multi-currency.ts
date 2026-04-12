export interface ExchangeRate {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  date: Date;
  source: string; // 'BANK', 'CENTRAL_BANK', 'MANUAL'
}

export interface CurrencyAmount {
  amount: number; // in cents
  currency: string;
}

export interface MultiCurrencyTransaction {
  originalAmount: number; // in cents
  originalCurrency: string;
  functionalAmount: number; // in HNL cents
  exchangeRate: number;
  exchangeDate: Date;
}

/**
 * Get current exchange rate between two currencies
 */
export async function getExchangeRate(
  fromCurrency: string,
  toCurrency: string,
  date?: Date
): Promise<number> {
  try {
    const dateParam = date ? date.toISOString().split('T')[0] : undefined;
    const url = `/api/exchange-rate?from=${fromCurrency}&to=${toCurrency}${dateParam ? `&date=${dateParam}` : ''}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to get exchange rate');
    }
    
    const data = await response.json();
    return data.rate;
  } catch (error) {
    console.error('Error getting exchange rate:', error);
    return 1.0;
  }
}

/**
 * Convert amount from one currency to another
 */
export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  date?: Date
): Promise<number> {
  const rate = await getExchangeRate(fromCurrency, toCurrency, date);
  return Math.round(amount * rate);
}


/**
 * Format currency amount for display
 */
export function formatCurrency(
  amount: number,
  currency: string,
  showCurrency: boolean = true
): string {
  const divisor = 100; // Convert from cents
  const amountInUnits = amount / divisor;

  const locale = currency === 'HNL' ? 'es-HN' : 'en-US';
  const currencyCode = currency === 'HNL' ? 'HNL' : 'USD';

  if (!showCurrency) {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amountInUnits);
  }

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountInUnits);
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(currency: string): string {
  switch (currency) {
    case 'HNL':
      return 'L';
    case 'USD':
      return '$';
    default:
      return currency;
  }
}

/**
 * Validate that transaction entries balance in functional currency
 */
export function validateTransactionBalance(
  entries: Array<{ amount: number; originalAmount: number; exchangeRate: number }>
): boolean {
  const functionalTotal = entries.reduce((sum, entry) => sum + entry.amount, 0);
  return functionalTotal === 0;
}

/**
 * Get exchange rate history for a date range
 */
export async function getExchangeRateHistory(
  fromCurrency: string,
  toCurrency: string,
  startDate: Date,
  endDate: Date
): Promise<Array<{ date: Date; rate: number }>> {
  // In a real implementation, this would query a database of historical rates
  // For now, return current rate for each day in the range
  const history: Array<{ date: Date; rate: number }> = [];
  const currentRate = await getExchangeRate(fromCurrency, toCurrency);
  
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    history.push({
      date: new Date(currentDate),
      rate: currentRate
    });
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return history;
}

/**
 * Update exchange rates from external API
 * This would be called periodically to keep rates current
 */
export async function updateExchangeRates(): Promise<void> {
  // In a real implementation, this would fetch from:
  // - Honduran Central Bank API
  // - Commercial bank APIs
  // - Currency data providers
  
  console.log('Exchange rates would be updated here from external APIs');
  
  // Example of what this might look like:
  // const response = await fetch('https://api.bch.hn/v1/rates');
  // const rates = await response.json();
  // await storeExchangeRates(rates);
}

