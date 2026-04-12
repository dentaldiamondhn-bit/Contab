import { Prisma } from '@prisma/client';
import { createAuditLog } from './services/audit-service';
import { db } from './db';

export interface AuditContext {
  userId?: string;
  userAgent?: string;
  ipAddress?: string;
}

// Store audit context in a global variable (in production, use proper context management)
let currentAuditContext: AuditContext = {};

/**
 * Set the current audit context (typically called from API routes or middleware)
 */
export function setAuditContext(context: AuditContext) {
  currentAuditContext = context;
}

/**
 * Get the current audit context
 */
export function getAuditContext(): AuditContext {
  return { ...currentAuditContext };
}

/**
 * Clear the current audit context
 */
export function clearAuditContext() {
  currentAuditContext = {};
}

/**
 * Get changed fields between old and new values
 */
function getChangedFields(oldData: any, newData: any): string[] {
  const changedFields: string[] = [];
  
  for (const key in newData) {
    if (oldData[key] !== newData[key]) {
      changedFields.push(key);
    }
  }
  
  return changedFields;
}

/**
 * Clean data for JSON serialization (remove circular references)
 */
function cleanData(data: any): any {
  if (data === null || data === undefined) return data;
  
  if (typeof data === 'object') {
    if (data instanceof Date) {
      return data.toISOString();
    }
    
    if (Array.isArray(data)) {
      return data.map(cleanData);
    }
    
    const cleaned: any = {};
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        cleaned[key] = cleanData(data[key]);
      }
    }
    return cleaned;
  }
  
  return data;
}

/**
 * Prisma middleware for audit logging
 */
export const auditMiddleware = async (params: any, next: any) => {
  const { model, action, args, data } = params;
  
  // Only audit Transaction and JournalEntry models
  if (model !== 'Transaction' && model !== 'JournalEntry') {
    return next(params);
  }

  const tableName = model.toLowerCase();
  let result;

  try {
    switch (action) {
      case 'create':
        // Handle create operations
        result = await next(params);
        
        // Log the creation
        if (result && Array.isArray(result)) {
          // Bulk create - log each record
          for (const record of result) {
            await createAuditLog({
              tableName,
              recordId: record.id,
              action: 'CREATE',
              newValues: cleanData(record),
            });
          }
        } else if (result) {
          // Single create
          await createAuditLog({
            tableName,
            recordId: result.id,
            action: 'CREATE',
            newValues: cleanData(result),
          });
        }
        break;

      case 'update':
        // Get old data before update
        let oldData;
        if (args.where && (args.where.id || (args.where as any)?.id)) {
          const recordId = args.where.id || (args.where as any)?.id;
          oldData = await db[model.toLowerCase() as keyof typeof db].findUnique({
            where: { id: recordId },
          });
        }

        // Perform the update
        result = await next(params);

        // Log the update
        if (oldData && result) {
          const changedFields = getChangedFields(oldData, result);
          
          if (changedFields.length > 0) {
            await createAuditLog({
              tableName,
              recordId: result.id,
              action: 'UPDATE',
              oldValues: cleanData(oldData),
              newValues: cleanData(result),
              changedFields,
            });
          }
        }
        break;

      case 'delete':
        // Get data before deletion
        let dataToDelete;
        if (args.where && (args.where.id || (args.where as any)?.id)) {
          const recordId = args.where.id || (args.where as any)?.id;
          dataToDelete = await db[model.toLowerCase() as keyof typeof db].findUnique({
            where: { id: recordId },
          });
        }

        // Perform the deletion
        result = await next(params);

        // Log the deletion
        if (dataToDelete) {
          await createAuditLog({
            tableName,
            recordId: dataToDelete.id,
            action: 'DELETE',
            oldValues: cleanData(dataToDelete),
          });
        }
        break;

      default:
        // For other actions (find, etc.), just proceed
        result = await next(params);
        break;
    }

    return result;
  } catch (error) {
    // Log the error and re-throw
    console.error(`Audit middleware error for ${action} on ${model}:`, error);
    throw error;
  }
};

/**
 * Helper function to get audit logs for a specific record
 */
export async function getAuditLogs(
  tableName: string,
  recordId: string,
  limit: number = 50
) {
  return await db.auditLog.findMany({
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

/**
 * Helper function to get audit logs for a user
 */
export async function getUserAuditLogs(
  userId: string,
  limit: number = 100
) {
  return await db.auditLog.findMany({
    where: {
      userId,
    },
    orderBy: {
      timestamp: 'desc',
    },
    take: limit,
  });
}

/**
 * Helper function to get all audit logs with pagination
 */
export async function getAllAuditLogs(
  page: number = 1,
  limit: number = 50,
  tableName?: string
) {
  const skip = (page - 1) * limit;
  
  const where = tableName ? { tableName } : {};
  
  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: {
        timestamp: 'desc',
      },
      skip,
      take: limit,
    }),
    db.auditLog.count({ where }),
  ]);

  return {
    logs,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}
