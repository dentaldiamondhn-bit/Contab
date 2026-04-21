import { db } from '@/lib/db';

// CAI Status types
export type CAIStatus = 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'EXHAUSTED';

// CAI interface
export interface CAI {
  id: string;
  caiCode: string; // The actual CAI code
  establishmentCode: string; // Código de establecimiento
  pointOfSaleCode: string; // Código de punto de venta (POS)
  documentType: string; // Tipo de documento (FACT, NOTA CRÉDITO, etc.)
  rangeStart: number; // Número inicial del rango
  rangeEnd: number; // Número final del rango
  currentNumber: number; // Último número utilizado
  issueDate: Date; // Fecha de emisión
  expirationDate: Date; // Fecha de vencimiento
  status: CAIStatus;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// CAI Alert types
export interface CAIAlert {
  id: string;
  caiId: string;
  alertType: 'RANGE_WARNING' | 'RANGE_CRITICAL' | 'EXPIRATION_WARNING' | 'EXPIRATION_CRITICAL';
  message: string;
  isRead: boolean;
  createdAt: Date;
}

// CAI Statistics
export interface CAIStatistics {
  totalCAIs: number;
  activeCAIs: number;
  expiringCAIs: number;
  expiredCAIs: number;
  exhaustedCAIs: number;
  totalRemainingInvoices: number;
  averageUsage: number;
}

// Create a new CAI
export async function createCAI(data: Omit<CAI, 'id' | 'status' | 'isActive' | 'createdAt' | 'updatedAt'>): Promise<CAI> {
  const cai = await (db as any).cAI.create({
    data: {
      ...data,
      status: calculateCAIStatus(data.rangeStart, data.rangeEnd, data.currentNumber, data.expirationDate),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  // Create initial alerts if needed
  await checkAndCreateAlerts(cai);

  return cai;
}

// Get all CAIs with filtering
export async function getCAIs(filters: {
  status?: CAIStatus;
  documentType?: string;
  establishmentCode?: string;
  isActive?: boolean;
} = {}): Promise<CAI[]> {
  const where: any = {};
  
  if (filters.status) where.status = filters.status;
  if (filters.documentType) where.documentType = filters.documentType;
  if (filters.establishmentCode) where.establishmentCode = filters.establishmentCode;
  if (filters.isActive !== undefined) where.isActive = filters.isActive;

  return await (db as any).cAI.findMany({
    where,
    orderBy: [
      { expirationDate: 'asc' },
      { createdAt: 'desc' }
    ],
  });
}

// Get CAI by ID
export async function getCAIById(id: string): Promise<CAI | null> {
  return await (db as any).cAI.findUnique({
    where: { id },
  });
}

// Update CAI current number (when a new invoice is generated)
export async function updateCAICurrentNumber(caiId: string, newNumber: number): Promise<CAI> {
  const cai = await (db as any).cAI.update({
    where: { id: caiId },
    data: {
      currentNumber: newNumber,
      updatedAt: new Date(),
    },
  });

  // Update status and check for alerts
  const newStatus = calculateCAIStatus(cai.rangeStart, cai.rangeEnd, newNumber, cai.expirationDate);
  if (newStatus !== cai.status) {
    await (db as any).cAI.update({
      where: { id: caiId },
      data: { status: newStatus },
    });
  }

  await checkAndCreateAlerts(cai);

  return cai;
}

// Calculate CAI status based on current usage and expiration
function calculateCAIStatus(
  rangeStart: number, 
  rangeEnd: number, 
  currentNumber: number, 
  expirationDate: Date
): CAIStatus {
  const now = new Date();
  const remainingInvoices = rangeEnd - currentNumber;
  const daysUntilExpiration = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Check if expired
  if (now > expirationDate) {
    return 'EXPIRED';
  }

  // Check if range exhausted
  if (currentNumber >= rangeEnd) {
    return 'EXHAUSTED';
  }

  // Check expiration warnings
  if (daysUntilExpiration <= 7) {
    return 'EXPIRING';
  }

  // Check range warnings
  if (remainingInvoices <= 10) {
    return 'EXPIRING';
  }

  return 'ACTIVE';
}

// Check and create alerts for CAI
async function checkAndCreateAlerts(cai: CAI): Promise<void> {
  const now = new Date();
  const remainingInvoices = cai.rangeEnd - cai.currentNumber;
  const daysUntilExpiration = Math.ceil((cai.expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Check for existing unread alerts of the same type
  const existingAlerts = await (db as any).cAIAlert.findMany({
    where: {
      caiId: cai.id,
      isRead: false,
    },
  });

  const existingAlertTypes = new Set(existingAlerts.map((alert: CAIAlert) => alert.alertType));

  // Range alerts
  if (remainingInvoices <= 1 && !existingAlertTypes.has('RANGE_CRITICAL')) {
    await createCAIAlert(cai.id, 'RANGE_CRITICAL', 
      `🚨 CRÍTICO: Solo queda 1 factura en el rango del CAI ${cai.caiCode}`
    );
  } else if (remainingInvoices <= 10 && !existingAlertTypes.has('RANGE_WARNING')) {
    await createCAIAlert(cai.id, 'RANGE_WARNING', 
      `⚠️ ATENCIÓN: Quedan ${remainingInvoices} facturas en el rango del CAI ${cai.caiCode}`
    );
  }

  // Expiration alerts
  if (daysUntilExpiration <= 7 && daysUntilExpiration > 0 && !existingAlertTypes.has('EXPIRATION_CRITICAL')) {
    await createCAIAlert(cai.id, 'EXPIRATION_CRITICAL', 
      `🚨 CRÍTICO: El CAI ${cai.caiCode} vence en ${daysUntilExpiration} días`
    );
  } else if (daysUntilExpiration <= 30 && !existingAlertTypes.has('EXPIRATION_WARNING')) {
    await createCAIAlert(cai.id, 'EXPIRATION_WARNING', 
      `⚠️ ATENCIÓN: El CAI ${cai.caiCode} vence en ${daysUntilExpiration} días`
    );
  }
}

// Create a CAI alert
async function createCAIAlert(caiId: string, alertType: CAIAlert['alertType'], message: string): Promise<void> {
  await (db as any).cAIAlert.create({
    data: {
      caiId,
      alertType,
      message,
      isRead: false,
      createdAt: new Date(),
    },
  });
}

// Get all unread alerts
export async function getUnreadAlerts(): Promise<CAIAlert[]> {
  return await (db as any).cAIAlert.findMany({
    where: { isRead: false },
    include: {
      cai: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

// Mark alert as read
export async function markAlertAsRead(alertId: string): Promise<void> {
  await (db as any).cAIAlert.update({
    where: { id: alertId },
    data: { isRead: true },
  });
}

// Mark all alerts as read
export async function markAllAlertsAsRead(): Promise<void> {
  await (db as any).cAIAlert.updateMany({
    where: { isRead: false },
    data: { isRead: true },
  });
}

// Get CAI statistics
export async function getCAIStatistics(): Promise<CAIStatistics> {
  const cais = await getCAIs();
  
  const stats: CAIStatistics = {
    totalCAIs: cais.length,
    activeCAIs: cais.filter(cai => cai.status === 'ACTIVE').length,
    expiringCAIs: cais.filter(cai => cai.status === 'EXPIRING').length,
    expiredCAIs: cais.filter(cai => cai.status === 'EXPIRED').length,
    exhaustedCAIs: cais.filter(cai => cai.status === 'EXHAUSTED').length,
    totalRemainingInvoices: cais.reduce((sum, cai) => {
      const remaining = cai.rangeEnd - cai.currentNumber;
      return sum + Math.max(0, remaining);
    }, 0),
    averageUsage: 0, // Will calculate below
  };

  // Calculate average usage
  const activeCAIs = cais.filter(cai => cai.status === 'ACTIVE');
  if (activeCAIs.length > 0) {
    const totalUsage = activeCAIs.reduce((sum, cai) => {
      const used = cai.currentNumber - cai.rangeStart;
      const total = cai.rangeEnd - cai.rangeStart;
      return sum + (total > 0 ? (used / total) * 100 : 0);
    }, 0);
    stats.averageUsage = totalUsage / activeCAIs.length;
  }

  return stats;
}

// Get next available invoice number for a CAI
export async function getNextInvoiceNumber(caiId: string): Promise<number | null> {
  const cai = await getCAIById(caiId);
  if (!cai || cai.status !== 'ACTIVE') {
    return null;
  }

  return cai.currentNumber + 1;
}

// Validate if a CAI can generate a new invoice
export async function canGenerateInvoice(caiId: string): Promise<{
  canGenerate: boolean;
  reason?: string;
  nextNumber?: number;
}> {
  const cai = await getCAIById(caiId);
  if (!cai) {
    return { canGenerate: false, reason: 'CAI no encontrado' };
  }

  if (cai.status === 'EXPIRED') {
    return { canGenerate: false, reason: 'CAI expirado' };
  }

  if (cai.status === 'EXHAUSTED') {
    return { canGenerate: false, reason: 'Rango de facturación agotado' };
  }

  if (cai.status === 'EXPIRING') {
    const remaining = cai.rangeEnd - cai.currentNumber;
    const daysUntilExpiration = Math.ceil((cai.expirationDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    
    let warning = '';
    if (remaining <= 1) {
      warning = `¡CRÍTICO! Solo queda ${remaining} factura en el rango`;
    } else if (remaining <= 10) {
      warning = `Quedan ${remaining} facturas en el rango`;
    }
    
    if (daysUntilExpiration <= 7) {
      warning += warning ? ' y ' : '';
      warning += `¡CAI vence en ${daysUntilExpiration} días!`;
    }

    return { 
      canGenerate: true, 
      reason: warning,
      nextNumber: cai.currentNumber + 1 
    };
  }

  return { 
    canGenerate: true, 
    nextNumber: cai.currentNumber + 1 
  };
}

// Deactivate a CAI
export async function deactivateCAI(caiId: string): Promise<CAI> {
  return await (db as any).cAI.update({
    where: { id: caiId },
    data: {
      isActive: false,
      updatedAt: new Date(),
    },
  });
}

// Reactivate a CAI
export async function reactivateCAI(caiId: string): Promise<CAI> {
  const cai = await (db as any).cAI.update({
    where: { id: caiId },
    data: {
      isActive: true,
      updatedAt: new Date(),
    },
  });

  // Recalculate status
  const newStatus = calculateCAIStatus(cai.rangeStart, cai.rangeEnd, cai.currentNumber, cai.expirationDate);
  await (db as any).cAI.update({
    where: { id: caiId },
    data: { status: newStatus },
  });

  return cai;
}

// Format CAI for display
export function formatCAIDisplay(cai: CAI): string {
  const remaining = cai.rangeEnd - cai.currentNumber;
  const usage = ((cai.currentNumber - cai.rangeStart) / (cai.rangeEnd - cai.rangeStart)) * 100;
  
  return `${cai.caiCode} (${cai.currentNumber}/${cai.rangeEnd}) - ${usage.toFixed(1)}% usado`;
}

// Get CAI expiration status text
export function getCAIExpirationText(cai: CAI): string {
  const now = new Date();
  const daysUntilExpiration = Math.ceil((cai.expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (cai.status === 'EXPIRED') {
    return 'Vencido';
  }
  
  if (daysUntilExpiration <= 0) {
    return 'Vence hoy';
  }
  
  if (daysUntilExpiration === 1) {
    return 'Vence mañana';
  }
  
  if (daysUntilExpiration <= 7) {
    return `Vence en ${daysUntilExpiration} días`;
  }
  
  if (daysUntilExpiration <= 30) {
    return `Vence en ${daysUntilExpiration} días`;
  }
  
  return `Vence el ${cai.expirationDate.toLocaleDateString('es-HN')}`;
}
