// CAI utilities - safe for client components (no db imports)

import type { CAI, CAIStatus } from './cai-types';

/**
 * Format CAI for display
 */
export function formatCAIDisplay(cai: CAI): string {
  return `${cai.establishmentCode}-${cai.emissionPointCode}-${String(cai.currentNumber).padStart(8, '0')}`;
}

/**
 * Get CAI expiration status text
 */
export function getCAIExpirationText(cai: CAI): string {
  const now = new Date();
  const daysUntilExpiration = Math.ceil((cai.expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiration < 0) {
    return `Expiró hace ${Math.abs(daysUntilExpiration)} días`;
  } else if (daysUntilExpiration === 0) {
    return 'Expira hoy';
  } else if (daysUntilExpiration <= 30) {
    return `Expira en ${daysUntilExpiration} días`;
  } else {
    return `Expira en ${daysUntilExpiration} días`;
  }
}

/**
 * Get CAI status from dates and range
 */
export function computeCAIStatus(cai: CAI): CAIStatus {
  const now = new Date();
  const daysUntilExpiration = Math.ceil((cai.expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const remainingRange = cai.rangeEnd - cai.currentNumber;

  if (remainingRange <= 0) {
    return 'EXHAUSTED';
  }
  if (daysUntilExpiration < 0) {
    return 'EXPIRED';
  }
  if (daysUntilExpiration <= 30) {
    return 'EXPIRING';
  }
  return 'ACTIVE';
}

/**
 * Calculate range usage percentage
 */
export function getRangeUsagePercentage(cai: CAI): number {
  if (cai.rangeEnd <= cai.rangeStart) return 100;
  return ((cai.currentNumber - cai.rangeStart) / (cai.rangeEnd - cai.rangeStart)) * 100;
}

/**
 * Format CAI status for display
 */
export function formatCAIStatus(status: CAIStatus): string {
  switch (status) {
    case 'ACTIVE':
      return 'Activo';
    case 'EXPIRING':
      return 'Por Expirar';
    case 'EXPIRED':
      return 'Expirado';
    case 'EXHAUSTED':
      return 'Agotado';
    default:
      return 'Desconocido';
  }
}