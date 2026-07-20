import { Prisma } from '@prisma/client';
import { createAuditLog } from './services/audit-service'; // Now imports from the service

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
export const auditExtension = Prisma.defineExtension((client) => {
  return client.$extends({
    query: {
      async $allOperations({ model, operation, args, query }) {
        // Only audit Transaction and JournalEntry models
        if (model !== 'Transaction' && model !== 'JournalEntry') {
          return query(args); // Continue with the original query
        }

        const auditContext = getAuditContext(); // Get context from global store
        if (!auditContext.userId) {
          console.warn(`Audit: No userId in context for ${operation} on ${model}. Skipping audit log.`);
          return query(args);
        }

        const tableName = model.toLowerCase();
        let result;
        let oldData: any;
        let dataToDelete: any;

        try {
          switch (operation) {
            case 'create':
              result = await query(args);
              if (result) {
                const records = Array.isArray(result) ? result : [result];
                for (const record of records) {
                  await createAuditLog(client as any, { // Pass client to createAuditLog
                    tableName,
                    recordId: record.id,
                    action: 'CREATE',
                    newValues: cleanData(record),
                    userId: auditContext.userId,
                    userAgent: auditContext.userAgent,
                    ipAddress: auditContext.ipAddress,
                  });
                }
              }
              break;

            case 'update':
            case 'updateMany': // Handle updateMany as well
              // Need to fetch old data before the update
              if (args.where && (args.where.id || (args.where as any)?.id)) {
                const recordId = args.where.id || (args.where as any)?.id;
                oldData = await (client as any)[tableName].findUnique({ where: { id: recordId } });
              }
              result = await query(args); // Perform the update
              if (oldData && result) {
                const changedFields = getChangedFields(oldData, result);
                if (changedFields.length > 0) {
                  await createAuditLog(client as any, { // Pass client to createAuditLog
                    tableName,
                    recordId: result.id,
                    action: 'UPDATE',
                    oldValues: cleanData(oldData),
                    newValues: cleanData(result),
                    changedFields,
                    userId: auditContext.userId,
                    userAgent: auditContext.userAgent,
                    ipAddress: auditContext.ipAddress,
                  });
                }
              }
              break;

            case 'delete':
            case 'deleteMany': // Handle deleteMany as well
              // Need to fetch data before deletion
              if (args.where && (args.where.id || (args.where as any)?.id)) {
                const recordId = args.where.id || (args.where as any)?.id;
                dataToDelete = await (client as any)[tableName].findUnique({ where: { id: recordId } });
              }
              result = await query(args); // Perform the deletion
              if (dataToDelete) {
                await createAuditLog(client as any, { // Pass client to createAuditLog
                  tableName,
                  recordId: dataToDelete.id,
                  action: 'DELETE',
                  oldValues: cleanData(dataToDelete),
                  userId: auditContext.userId,
                  userAgent: auditContext.userAgent,
                  ipAddress: auditContext.ipAddress,
                });
              }
              break;

            default:
              result = await query(args);
              break;
          }
          return result;
        } catch (error) {
          console.error(`Audit extension error for ${operation} on ${model}:`, error);
          throw error;
        }
      },
    },
  });
});
