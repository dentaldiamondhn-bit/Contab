// CAI server-side functions
// These functions require database access and should only be used in server components or API routes

import { db } from '@/lib/db-server';
import type { CAI, CAIStatus, CAIAlert, CAIStatistics } from './cai-types';
import { formatCAIDisplay, getCAIExpirationText, computeCAIStatus, getRangeUsagePercentage } from './cai-utils';

/**
 * Get all CAIs with filters
 */
export async function getCAIs(filters?: {
  status?: CAIStatus;
  companyId?: string;
}): Promise<CAI[]> {
  const where: Record<string, unknown> = {};

  if (filters?.status) where.status = filters.status;
  if (filters?.companyId) where.companyId = filters.companyId;

  const cais = await db.cAI.findMany({
    where,
    orderBy: { expirationDate: 'asc' },
  });

  return cais as unknown as CAI[];
}

/**
 * Get CAI statistics
 */
export async function getCAIStatistics(): Promise<CAIStatistics> {
  const cais = await db.cAI.findMany();

  let totalRangeAvailable = 0;
  let totalRangeUsed = 0;

  for (const cai of cais) {
    totalRangeAvailable += cai.rangeEnd - cai.rangeStart + 1;
    totalRangeUsed += cai.currentNumber - cai.rangeStart + 1;
  }

  const stats: CAIStatistics = {
    totalCAIs: cais.length,
    activeCAIs: 0,
    expiringCAIs: 0,
    expiredCAIs: 0,
    exhaustedCAIs: 0,
    totalRangeAvailable,
    totalRangeUsed,
    usagePercentage: totalRangeAvailable > 0 ? (totalRangeUsed / totalRangeAvailable) * 100 : 0,
  };

  for (const cai of cais) {
    const status = computeCAIStatus(cai);
    switch (status) {
      case 'ACTIVE':
        stats.activeCAIs++;
        break;
      case 'EXPIRING':
        stats.expiringCAIs++;
        break;
      case 'EXPIRED':
        stats.expiredCAIs++;
        break;
      case 'EXHAUSTED':
        stats.exhaustedCAIs++;
        break;
    }
  }

  return stats;
}

/**
 * Get unread alerts
 */
export async function getUnreadAlerts(companyId?: string): Promise<CAIAlert[]> {
  const where: Record<string, unknown> = { read: false };
  if (companyId) where.companyId = companyId;

  const alerts = await db.cAIAlert.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return alerts as unknown as CAIAlert[];
}

/**
 * Mark all alerts as read
 */
export async function markAllAlertsAsRead(companyId?: string): Promise<number> {
  const where: Record<string, unknown> = { read: false };
  if (companyId) where.companyId = companyId;

  const result = await db.cAIAlert.updateMany({
    where,
    data: { read: true },
  });

  return result.count;
}

/**
 * Create a new CAI
 */
export async function createCAI(data: {
  caiCode: string;
  establishmentCode: string;
  emissionPointCode: string;
  rangeStart: number;
  rangeEnd: number;
  expirationDate: Date;
  companyId?: string;
}): Promise<CAI> {
  // Compute initial status
  const tempCAI = {
    ...data,
    currentNumber: data.rangeStart - 1,
  } as CAI;

  const status = computeCAIStatus(tempCAI);

  const cai = await db.cAI.create({
    data: {
      caiCode: data.caiCode,
      establishmentCode: data.establishmentCode,
      emissionPointCode: data.emissionPointCode,
      rangeStart: data.rangeStart,
      rangeEnd: data.rangeEnd,
      currentNumber: data.rangeStart - 1,
      expirationDate: data.expirationDate,
      status,
      companyId: data.companyId,
    },
  });

  // Create alert if expiring soon
  if (status === 'EXPIRING') {
    await createExpirationAlert(cai.id, data.companyId);
  }

  return cai as unknown as CAI;
}

/**
 * Update CAI current number (when invoice is generated)
 */
export async function updateCAICurrentNumber(
  caiId: string,
  newNumber: number
): Promise<CAI> {
  const cai = await db.cAI.findUnique({ where: { id: caiId } });
  if (!cai) throw new Error('CAI not found');

  if (newNumber > cai.rangeEnd) {
    throw new Error('Cannot exceed range end');
  }

  const updatedCAI = await db.cAI.update({
    where: { id: caiId },
    data: { currentNumber: newNumber },
  });

  // Check if status changed
  const newStatus = computeCAIStatus({ ...cai, currentNumber: newNumber } as CAI);
  if (newStatus !== cai.status) {
    await db.cAI.update({
      where: { id: caiId },
      data: { status: newStatus },
    });

    if (newStatus === 'EXPIRING') {
      await createExpirationAlert(caiId, cai.companyId || undefined);
    } else if (newStatus === 'EXHAUSTED') {
      await createExhaustedAlert(caiId, cai.companyId || undefined);
    }
  }

  return updatedCAI as unknown as CAI;
}

/**
 * Check if can generate invoice with this CAI
 */
export async function canGenerateInvoice(caiId: string): Promise<{ can: boolean; reason?: string }> {
  const cai = await db.cAI.findUnique({ where: { id: caiId } });
  if (!cai) return { can: false, reason: 'CAI not found' };

  const status = computeCAIStatus(cai);
  if (status === 'EXPIRED') return { can: false, reason: 'CAI expired' };
  if (status === 'EXHAUSTED') return { can: false, reason: 'CAI range exhausted' };

  return { can: true };
}

/**
 * Create expiration alert
 */
async function createExpirationAlert(caiId: string, companyId?: string): Promise<void> {
  const existing = await db.cAIAlert.findFirst({
    where: {
      caiId,
      type: 'EXPIRING',
      read: false,
    },
  });

  if (!existing) {
    await db.cAIAlert.create({
      data: {
        caiId,
        type: 'EXPIRING',
        message: 'CAI próximo a expirar (30 días o menos)',
        companyId,
      },
    });
  }
}

/**
 * Create exhausted alert
 */
async function createExhaustedAlert(caiId: string, companyId?: string): Promise<void> {
  const existing = await db.cAIAlert.findFirst({
    where: {
      caiId,
      type: 'RANGE_EXHAUSTED',
      read: false,
    },
  });

  if (!existing) {
    await db.cAIAlert.create({
      data: {
        caiId,
        type: 'RANGE_EXHAUSTED',
        message: 'CAI ha agotado su rango de facturación',
        companyId,
      },
    });
  }
}

/**
 * Get CAI by ID
 */
export async function getCAIById(id: string): Promise<CAI | null> {
  const cai = await db.cAI.findUnique({
    where: { id },
  });

  return cai as unknown as CAI | null;
}

/**
 * Delete a CAI
 */
export async function deleteCAI(id: string): Promise<void> {
  await db.cAI.delete({
    where: { id },
  });
}

// Re-export utilities
export { formatCAIDisplay, getCAIExpirationText, computeCAIStatus, getRangeUsagePercentage } from './cai-utils';