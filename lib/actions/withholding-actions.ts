// Server Actions for Withholding
// These functions can be called from client components via form actions or useTransition

'use server';

import { db } from '@/lib/db-server';
import type { Withholding, WithholdingType, WithholdingStatus, WithholdingStatistics } from './withholding-types';
import { calculateWithholding, getCurrentPeriod, formatCurrency } from './withholding-utils';

/**
 * Get all withholdings with filters
 */
export async function getWithholdings(filters?: {
  type?: WithholdingType;
  status?: WithholdingStatus;
  period?: string;
  providerRTN?: string;
  startDate?: Date;
  endDate?: Date;
}): Promise<Withholding[]> {
  const where: Record<string, unknown> = {};

  if (filters?.type) where.type = filters.type;
  if (filters?.status) where.status = filters.status;
  if (filters?.period) where.period = filters.period;
  if (filters?.providerRTN) where.providerRTN = filters.providerRTN;

  if (filters?.startDate || filters?.endDate) {
    where.invoiceDate = {};
    if (filters.startDate) (where.invoiceDate as Record<string, Date>).gte = filters.startDate;
    if (filters.endDate) (where.invoiceDate as Record<string, Date>).lte = filters.endDate;
  }

  const withholdings = await db.withholding.findMany({
    where,
    orderBy: { invoiceDate: 'desc' },
  });

  return withholdings as unknown as Withholding[];
}

/**
 * Get withholding statistics
 */
export async function getWithholdingStatistics(period?: string): Promise<WithholdingStatistics> {
  const where: Record<string, unknown> = {};
  if (period) where.period = period;

  const withholdings = await db.withholding.findMany({
    where,
  });

  const stats: WithholdingStatistics = {
    totalWithholdings: withholdings.length,
    totalAmount: 0,
    totalWithholdingAmount: 0,
    byType: {
      'PROFESSIONAL_SERVICES_1%': { count: 0, amount: 0, withholdingAmount: 0 },
      'PROFESSIONAL_SERVICES_12_5%': { count: 0, amount: 0, withholdingAmount: 0 },
      OTHER: { count: 0, amount: 0, withholdingAmount: 0 },
    },
    byStatus: {
      PENDING: 0,
      PAID: 0,
      CANCELLED: 0,
    },
  };

  for (const w of withholdings) {
    stats.totalAmount += w.amount;
    stats.totalWithholdingAmount += w.withholdingAmount;
    stats.byType[w.type].count++;
    stats.byType[w.type].amount += w.amount;
    stats.byType[w.type].withholdingAmount += w.withholdingAmount;
    stats.byStatus[w.status]++;
  }

  return stats;
}

/**
 * Create a new withholding
 */
export async function createWithholding(data: {
  type: WithholdingType;
  invoiceNumber: string;
  invoiceDate: Date;
  providerName: string;
  providerRTN: string;
  providerAddress?: string;
  amount: number; // Base amount in cents
  period: string;
  description: string;
}): Promise<Withholding> {
  const calculation = calculateWithholding(data.amount, data.type);

  const withholding = await db.withholding.create({
    data: {
      type: data.type,
      invoiceNumber: data.invoiceNumber,
      invoiceDate: data.invoiceDate,
      providerName: data.providerName,
      providerRTN: data.providerRTN,
      providerAddress: data.providerAddress,
      amount: data.amount,
      withholdingRate: calculation.withholdingRate,
      withholdingAmount: calculation.withholdingAmount,
      period: data.period,
      description: data.description,
      status: 'PENDING',
    },
  });

  return withholding as unknown as Withholding;
}

/**
 * Update withholding status
 */
export async function updateWithholdingStatus(
  id: string,
  status: WithholdingStatus,
  paymentDate?: Date,
  receiptNumber?: string
): Promise<Withholding> {
  const updateData: Record<string, unknown> = { status };
  if (paymentDate) updateData.paymentDate = paymentDate;
  if (receiptNumber) updateData.receiptNumber = receiptNumber;

  const withholding = await db.withholding.update({
    where: { id },
    data: updateData,
  });

  return withholding as unknown as Withholding;
}

/**
 * Get withholding by ID
 */
export async function getWithholdingById(id: string): Promise<Withholding | null> {
  const withholding = await db.withholding.findUnique({
    where: { id },
  });

  return withholding as unknown as Withholding | null;
}

/**
 * Delete a withholding
 */
export async function deleteWithholding(id: string): Promise<void> {
  await db.withholding.delete({
    where: { id },
  });
}

/**
 * Export withholdings to CSV format
 */
export async function exportWithholdingsToCSV(period?: string): Promise<string> {
  const withholdings = await getWithholdings(period ? { period } : undefined);

  const headers = [
    'Número de Recibo',
    'Fecha de Factura',
    'Número de Factura',
    'Proveedor',
    'RTN Proveedor',
    'Monto Factura',
    'Tipo Retención',
    'Tasa Retención',
    'Monto Retención',
    'Período',
    'Estado',
  ];

  const rows = withholdings.map((w) => [
    w.receiptNumber || `RET-${w.id.slice(0, 8).toUpperCase()}`,
    w.invoiceDate.toISOString().split('T')[0],
    w.invoiceNumber,
    w.providerName,
    w.providerRTN,
    formatCurrency(w.amount),
    formatWithholdingType(w.type),
    `${(w.withholdingRate * 100).toFixed(1)}%`,
    formatCurrency(w.withholdingAmount),
    w.period,
    w.status,
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

// Re-export utilities for client components
export { 
  formatWithholdingType, 
  getCurrentPeriod, 
  formatCurrency,
  calculateWithholding,
  generateWithholdingReceipt,
  formatWithholdingRate,
  validateRTN,
} from './withholding-utils';