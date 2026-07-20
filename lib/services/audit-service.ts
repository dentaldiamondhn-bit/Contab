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

// This function will be called by the audit extension
export async function createAuditLog(db: any, payload: AuditLogPayload) {
  try {
    await db.auditLog.create({
      data: {
        tableName: payload.tableName,
        recordId: payload.recordId,
        action: payload.action,
        oldValues: payload.oldValues || Prisma.JsonNull,
        newValues: payload.newValues || Prisma.JsonNull,
        changedFields: payload.changedFields || [],
        userId: payload.userId || 'system',
        userAgent: payload.userAgent,
        ipAddress: payload.ipAddress,
        category: payload.category || 'DATA_CHANGE',
        description: payload.description || `${payload.action} on ${payload.tableName} (ID: ${payload.recordId})`,
        metadata: payload.metadata || Prisma.JsonNull,
      },
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
}

// Helper function to get audit logs for a specific record

// Helper to get audit log trail for a date range
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

// Helper function to get audit logs for a specific record
export function getAuditLogs(
  db: any,
  tableName: string,
  recordId: string,
  limit: number = 50
) {
  return db.auditLog.findMany({
    where: {
      tableName,
      recordId,
    },
    orderBy: {
      timestamp: 'desc',
    },
    take: limit,
  });
}

// Helper function to get audit logs for a user
export async function getUserAuditLogs(
  db: any,
  userId: string,
  limit: number = 100
) {
  return db.auditLog.findMany({
    where: {
      userId,
    },
    orderBy: {
      timestamp: 'desc',
    },
    take: limit,
  });
}

// Helper function to get all audit logs with pagination
export async function getAllAuditLogs(
  db: any,
  page: number = 1,
  limit: number = 50,
  tableName?: string
) {
  const skip = (page - 1) * limit;
  
  const where = tableName ? { tableName } : {};
  
  const [logs, total] = await Promise.all([
    db.auditLog.findMany({ where, orderBy: { timestamp: 'desc' }, skip, take: limit }),
    db.auditLog.count({ where }),
  ]);

  return { logs, total, page, totalPages: Math.ceil(total / limit) };
}
