import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export type AuditAction = "CREATE" | "UPDATE" | "DELETE";

export interface AuditLogData {
  tableName: string;
  recordId: string;
  action: AuditAction;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  changedFields?: string[];
  userId?: string;
  userAgent?: string;
  ipAddress?: string;
}

export async function createAuditLog(data: AuditLogData): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        tableName: data.tableName,
        recordId: data.recordId,
        action: data.action,
        oldValues: data.oldValues ? JSON.stringify(data.oldValues) : null,
        newValues: data.newValues ? JSON.stringify(data.newValues) : null,
        changedFields: data.changedFields ? JSON.stringify(data.changedFields) : null,
        userId: data.userId,
        userAgent: data.userAgent,
        ipAddress: data.ipAddress,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
    // Don't throw - audit logging should not break the main operation
  }
}

export function identifyChanges(oldValues: Record<string, any>, newValues: Record<string, any>): string[] {
  const changedFields: string[] = [];
  
  for (const key of Object.keys(newValues)) {
    if (oldValues[key] !== newValues[key]) {
      changedFields.push(key);
    }
  }
  
  return changedFields;
}

export function cleanSensitiveData(data: Record<string, any>): Record<string, any> {
  const sensitiveFields = ['password', 'secret', 'token', 'apiKey'];
  const cleaned = { ...data };
  
  for (const field of sensitiveFields) {
    if (cleaned[field]) {
      cleaned[field] = '***REDACTED***';
    }
  }
  
  return cleaned;
}

export async function getRecordAuditTrail(tableName: string, recordId: string) {
  return await db.auditLog.findMany({
    where: {
      tableName,
      recordId,
    },
    orderBy: {
      timestamp: 'desc',
    },
  });
}

export async function getPeriodAuditTrail(startDate: Date, endDate: Date, tableName?: string) {
  try {
    const where: any = {
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (tableName) {
      where.tableName = tableName;
    }

    return await db.auditLog.findMany({
      where,
      orderBy: {
        timestamp: 'desc',
      },
    });
  } catch (error) {
    console.warn('Audit log table may not exist or database connection failed:', error);
    // Return empty array if audit log doesn't exist
    return [];
  }
}

export async function revertToState(tableName: string, recordId: string, targetTimestamp: Date) {
  const auditLogs = await db.auditLog.findMany({
    where: {
      tableName,
      recordId,
      timestamp: {
        lte: targetTimestamp,
      },
    },
    orderBy: {
      timestamp: 'desc',
    },
  });

  if (auditLogs.length === 0) {
    throw new Error("No audit trail found for the specified time");
  }

  // Find the state at or before the target timestamp
  const targetState = auditLogs.find((log: any) => 
    log.timestamp <= targetTimestamp && log.newValues
  );

  if (!targetState || !targetState.newValues) {
    throw new Error("Cannot determine target state");
  }

  const revertData = JSON.parse(targetState.newValues);
  
  // Log the revert action
  await createAuditLog({
    tableName,
    recordId,
    action: "UPDATE",
    oldValues: undefined, // Current state will be captured by the update
    newValues: revertData,
    changedFields: Object.keys(revertData),
  });

  return revertData;
}

export async function exportToCSV(startDate: Date, endDate: Date): Promise<string> {
  const auditLogs = await getPeriodAuditTrail(startDate, endDate);
  
  const headers = [
    'Timestamp',
    'Table',
    'Record ID',
    'Action',
    'Changed Fields',
    'User ID',
    'Old Values',
    'New Values',
  ];

  const rows = auditLogs.map((log: any) => [
    log.timestamp.toISOString(),
    log.tableName,
    log.recordId,
    log.action,
    log.changedFields || '',
    log.userId || '',
    log.oldValues || '',
    log.newValues || '',
  ]);

  return [headers.join(','), ...rows.map((row: any) => row.map((cell: any) => `"${cell}"`).join(','))].join('\n');
}
