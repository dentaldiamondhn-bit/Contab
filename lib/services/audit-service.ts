import { PrismaClient, Prisma } from '@prisma/client';
import { AuditContext } from '@/lib/audit-middleware'; // Import AuditContext interface

export interface AuditLogPayload {
  tableName: string;
  recordId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  oldValues?: any;
  newValues?: any;
  changedFields?: string[];
  userId?: string;
  userAgent?: string;
  ipAddress?: string;
  category?: string; // e.g., 'ADMIN', 'USER'
  description?: string;
  metadata?: any;
}

// Outbox payload - se escribe en la tabla de cola en lugar de auditLog directamente
export interface OutboxPayload {
  tableName: string;
  recordId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  oldValues?: any;
  newValues?: any;
  changedFields?: string[];
  userId?: string;
  userAgent?: string;
  ipAddress?: string;
  category?: string;
  description?: string;
  tenantId?: string;
}

// This function writes to the AuditOutbox instead of directly to auditLog
// It's non-blocking and allows async processing
export async function createAuditOutboxEntry(db: any, payload: OutboxPayload): Promise<void> {
  try {
    await db.auditOutbox.create({
      data: {
        tableName: payload.tableName,
        recordId: payload.recordId,
        action: payload.action,
        oldValues: payload.oldValues !== undefined ? JSON.stringify(payload.oldValues) : Prisma.JsonNull,
        newValues: payload.newValues !== undefined ? JSON.stringify(payload.newValues) : Prisma.JsonNull,
        changedFields: payload.changedFields || [],
        userId: payload.userId,
        userAgent: payload.userAgent,
        ipAddress: payload.ipAddress,
        category: payload.category || 'DATA_CHANGE',
        description: payload.description || `${payload.action} on ${payload.tableName} (ID: ${payload.recordId})`,
        status: 'PENDING',
        tenantId: payload.tenantId,
      },
    });
  } catch (error) {
    console.error('Failed to create audit outbox entry:', error);
    throw error;
  }
}

// Helper function to get audit logs for a specific record (still reads from auditLog)
export async function getPeriodAuditTrail(
  dbClient: any,
  from: Date,
  to: Date,
  tableName?: string
) {
  const where: any = {
    timestamp: {
      gte: from,
      lte: to,
    },
  };

  if (tableName) {
    where.tableName = tableName;
  }

  return await dbClient.auditLog.findMany({
    where,
    orderBy: { timestamp: 'desc' },
  });
}

// Helper to get audit logs for a specific record from outbox
export async function getRecordAuditOutbox(
  db: any,
  tableName: string,
  recordId: string,
  limit: number = 50
) {
  return db.auditOutbox.findMany({
    where: {
      tableName,
      recordId,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
  });
}

// Helper to process the outbox (run as background job)
export async function processAuditOutbox(db: any, batchSize: number = 50): Promise<{ processed: number; failed: number }> {
  const pendingEntries = await db.auditOutbox.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
    take: batchSize,
  });

  if (pendingEntries.length === 0) {
    return { processed: 0, failed: 0 };
  }

  let processed = 0;
  let failed = 0;

  const now = new Date();

  for (const entry of pendingEntries) {
    try {
      // Write to auditLog
      await db.auditLog.create({
        data: {
          tableName: entry.tableName,
          recordId: entry.recordId,
          action: entry.action,
          oldValues: entry.oldValues,
          newValues: entry.newValues,
          changedFields: entry.changedFields,
          userId: entry.userId,
          userAgent: entry.userAgent,
          ipAddress: entry.ipAddress,
          category: entry.category,
          description: entry.description,
          metadata: entry.metadata,
        },
      });

      // Mark as processed
      await db.auditOutbox.update({
        where: { id: entry.id },
        data: {
          status: 'PROCESSED',
          processedAt: now,
        },
      });

      processed++;
    } catch (error) {
      console.error(`Failed to process audit outbox entry ${entry.id}:`, error);
      
      // Mark as failed
      await db.auditOutbox.update({
        where: { id: entry.id },
        data: {
          status: 'FAILED',
        },
      });

      failed++;
    }
  }

  return { processed, failed };
}
