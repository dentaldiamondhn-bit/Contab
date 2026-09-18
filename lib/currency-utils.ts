/**
 * Currency formatting utilities using BigInt for precision
 */

export interface ExchangeRate {
  rate: number;
  date: Date;
  fromCurrency: string;
  toCurrency: string;
  source?: string;
}

/**
 * Formatea un monto con el símbolo de moneda
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

/**
 * Formatea un monto corto (sin símbolo de moneda)
 */
export function formatCurrencyShort(amount: bigint | number): string {
  const cents = typeof amount === 'bigint' ? Number(amount) : amount;
  const value = cents / 100;

  return new Intl.NumberFormat('es-HN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Parsea una cadena de moneda a BigInt
 */
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

/**
 * Convierte centavos a dólares
 */
export function centsToDollars(cents: bigint): number {
  return Number(cents) / 100;
}

/**
 * Convierte dólares a centavos
 */
export function dollarsToCents(dollars: number): bigint {
  return BigInt(Math.round(dollars * 100));
}

/**
 * Valida RTN (Honduran Tax ID) format
 * RTN format: 8 digits followed by 1 check digit (8-1)
 */
export function validateRTN(rtn: string): boolean {
  const rtnPattern = /^\d{8}-\d{1}$/;
  if (!rtnPattern.test(rtn)) {
    return false;
  }
  // Additional validation could be added here (check digit calculation)
  return true;
}

/**
 * Obtiene la tasa de cambio histórica para una fecha y par de divisas específicos
 * Busca en la tabla ExchangeRateHistory, o usa la tasa por defecto si no hay registro
 */
export async function getHistoricalExchangeRate(
  db: any,
  date: Date,
  fromCurrency: string = 'HNL',
  toCurrency: string = 'HNL'
): Promise<ExchangeRate> {
  if (fromCurrency === toCurrency) {
    return {
      rate: 1,
      date: new Date(),
      fromCurrency,
      toCurrency,
    };
  }

  // Buscar tasa histórica en la base de datos
  const historicalRate = await db.exchangeRateHistory.findFirst({
    where: {
      date: {
        lte: date,
      },
      fromCurrency,
      toCurrency,
    },
    orderBy: {
      date: 'desc',
    },
  });

  if (historicalRate) {
    return {
      rate: Number(historicalRate.rate),
      date: new Date(historicalRate.date),
      fromCurrency,
      toCurrency,
      source: historicalRate.source,
    };
  }

  // Si no hay tasa histórica, retornar la tasa por defecto (HNL a HNL es 1, otros usan 24.70)
  const defaultRate = fromCurrency === 'HNL' && toCurrency === 'HNL' ? 1 : 24.70;

  return {
    rate: defaultRate,
    date: new Date(),
    fromCurrency,
    toCurrency,
  };
}

/**
 * Obtiene la tasa de cambio para una transacción, buscando la tasa histórica del día
 */
export async function getTransactionExchangeRate(
  db: any,
  transactionDate: Date,
  currency: string = 'HNL'
): Promise<{ rate: number; date: Date }> {
  if (currency === 'HNL') {
    return { rate: 24.70, date: transactionDate };
  }

  // Buscar tasa histórica para la fecha de la transacción
  const historicalRate = await db.exchangeRateHistory.findFirst({
    where: {
      date: {
        lte: transactionDate,
      },
    },
    orderBy: {
      date: 'desc',
    },
    take: 1,
  });

  if (historicalRate) {
    return { rate: Number(historicalRate.rate), date: new Date(historicalRate.date) };
  }

  // Tasa por defecto si no hay registro histórico
  return { rate: 24.70, date: transactionDate };
}