// Withholding utilities - safe for client components (no db imports)

import type { WithholdingType, WithholdingCalculation, WithholdingReceipt, Withholding } from './withholding-types';

/**
 * Calculate withholding based on amount and type
 */
export function calculateWithholding(amount: number, type: WithholdingType): WithholdingCalculation {
  let withholdingRate: number;
  let description: string;

  switch (type) {
    case 'PROFESSIONAL_SERVICES_1%':
      withholdingRate = 0.01;
      description = 'Servicios Profesionales (1%)';
      break;
    case 'PROFESSIONAL_SERVICES_12_5%':
      withholdingRate = 0.125;
      description = 'Servicios Profesionales (12.5%)';
      break;
    default:
      withholdingRate = 0;
      description = 'Sin retención';
  }

  const withholdingAmount = Math.round(amount * withholdingRate);

  return {
    withholdingRate,
    description,
    withholdingAmount,
  };
}

/**
 * Generate withholding receipt data for PDF
 */
export function generateWithholdingReceipt(withholding: Withholding): WithholdingReceipt {
  const calculation = calculateWithholding(withholding.amount, withholding.type);

  return {
    receiptNumber: withholding.receiptNumber || `RET-${withholding.id.slice(0, 8).toUpperCase()}`,
    receiptDate: withholding.paymentDate || new Date(),
    provider: {
      name: withholding.providerName,
      rtn: withholding.providerRTN,
      address: withholding.providerAddress || 'Dirección no especificada',
    },
    invoice: {
      number: withholding.invoiceNumber,
      date: withholding.invoiceDate,
      amount: withholding.amount,
    },
    withholding: {
      rate: withholding.withholdingRate,
      amount: calculation.withholdingAmount,
    },
    totals: {
      subtotal: withholding.amount,
      withholding: calculation.withholdingAmount,
      total: withholding.amount - calculation.withholdingAmount,
    },
  };
}

/**
 * Format withholding rate for display
 */
export function formatWithholdingRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

/**
 * Format withholding type for display
 */
export function formatWithholdingType(type: WithholdingType): string {
  switch (type) {
    case 'PROFESSIONAL_SERVICES_1%':
      return 'Servicios Profesionales (1%)';
    case 'PROFESSIONAL_SERVICES_12_5%':
      return 'Servicios Profesionales (12.5%)';
    default:
      return 'Otro';
  }
}

/**
 * Validate RTN format (Honduran)
 */
export function validateRTN(rtn: string): boolean {
  const rtnPattern = /^\d{8}-\d{1}$/;
  if (!rtnPattern.test(rtn)) {
    return false;
  }

  // Validate check digit (Honduran RTN algorithm)
  const digits = rtn.replace('-', '').split('').map(Number);
  const weights = [4, 3, 2, 7, 6, 5, 4, 3];
  let sum = 0;

  for (let i = 0; i < 8; i++) {
    sum += digits[i] * weights[i];
  }

  const remainder = sum % 11;
  const checkDigit = remainder === 0 ? 0 : 11 - remainder;

  return digits[8] === checkDigit;
}

/**
 * Get current period (YYYY-MM)
 */
export function getCurrentPeriod(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, currency: string = 'HNL'): string {
  return new Intl.NumberFormat('es-HN', {
    style: 'currency',
    currency: currency === 'USD' ? 'USD' : 'HNL',
  }).format(amount / 100); // Convert from cents
}

/**
 * Format currency for display (already in major units)
 */
export function formatCurrencyMajor(amount: number, currency: string = 'HNL'): string {
  return new Intl.NumberFormat('es-HN', {
    style: 'currency',
    currency: currency === 'USD' ? 'USD' : 'HNL',
  }).format(amount);
}