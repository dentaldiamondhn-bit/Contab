/**
 * Currency formatting utilities using BigInt for precision
 */

export function formatCurrency(amount: bigint | number, currency: string = 'HNL'): string {
  const cents = typeof amount === 'bigint' ? Number(amount) : amount;
  const value = cents / 100;
  
  return new Intl.NumberFormat('es-HN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatCurrencyShort(amount: bigint | number): string {
  const cents = typeof amount === 'bigint' ? Number(amount) : amount;
  const value = cents / 100;
  
  return new Intl.NumberFormat('es-HN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function parseCurrencyString(value: string): bigint {
  // Remove currency symbols and whitespace
  const cleanValue = value.replace(/[^\d.-]/g, '');
  const numericValue = parseFloat(cleanValue);
  
  if (isNaN(numericValue)) {
    throw new Error(`Invalid currency value: ${value}`);
  }
  
  // Convert to cents (BigInt)
  return BigInt(Math.round(numericValue * 100));
}

export function centsToDollars(cents: bigint): number {
  return Number(cents) / 100;
}

export function dollarsToCents(dollars: number): bigint {
  return BigInt(Math.round(dollars * 100));
}
