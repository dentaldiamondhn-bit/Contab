import { Prisma } from '@prisma/client';
import { db } from './db';

export async function periodLockMiddleware(
  params: any,
  action: 'create' | 'update' | 'delete',
  model: string
) {
  // Only apply to Transaction model operations
  if (model !== 'Transaction') return params;
  
  // For create operations, check if transaction date is in a locked period
  if (action === 'create' && params.args?.data?.date) {
    const transactionDate = new Date(params.args.data.date);
    await checkPeriodLock(db, transactionDate);
  }

  // For update operations, get the existing transaction first
  if (action === 'update') {
    const existingTransaction = await db.transaction.findUnique({
      where: params.args.where
    });
    
    if (existingTransaction) {
      await checkPeriodLock(db, existingTransaction.date);
    }
  }

  // For delete operations, get the existing transaction first
  if (action === 'delete') {
    const existingTransaction = await db.transaction.findUnique({
      where: params.args.where
    });
    
    if (existingTransaction) {
      await checkPeriodLock(db, existingTransaction.date);
    }
  }

  return params;
}

async function checkPeriodLock(db: any, transactionDate: Date) {
  // Get the last closed date from GlobalSettings
  const settings = await db.globalSettings.findFirst();
  
  if (settings?.lastClosedDate) {
    const lastClosedDate = new Date(settings.lastClosedDate);
    
    // If transaction date is on or before the closed date, throw error
    if (transactionDate <= lastClosedDate) {
      throw new Error(
        `Cannot modify transaction from ${transactionDate.toISOString().split('T')[0]}. ` +
        `Period was closed on ${lastClosedDate.toISOString().split('T')[0]}.`
      );
    }
  }
}

// Helper function to close the books
export async function closeBooks(closingDate: Date, closedBy: string) {
  return await (db as any).$transaction(async (tx: any) => {
    // Update the global settings
    await tx.globalSettings.upsert({
      where: { id: 'default' },
      update: { lastClosedDate: closingDate },
      create: {
        id: 'default',
        lastClosedDate: closingDate
      }
    });

    // Create a book closing record
    await tx.bookClosing.create({
      data: {
        period: closingDate.toISOString().slice(0, 7), // YYYY-MM format
        periodType: 'MONTHLY',
        closedBy
      }
    });
  });
}

export const periodLockExtension = Prisma.defineExtension((client) => {
  return client.$extends({
    query: {
      // @ts-expect-error Prisma $extends callback – generic params, TS2559 known limitation
      async transaction(params: any) {
        const { model, operation, args, query } = params;
        if (model !== 'Transaction') {
          return query(args);
        }

        let result;
        let transactionDate: Date | undefined;

        try {
          switch (operation) {
            case 'create':
              if (args.data?.date) {
                transactionDate = new Date(args.data.date);
                await checkPeriodLock(client, transactionDate); // Pass client to checkPeriodLock
                 }
               result = await query(args);
               break;
            case 'update':
            case 'updateMany':
              if (args.where && (args.where.id || (args.where as any)?.id)) {
                const existingTransaction = await client.transaction.findUnique({ where: args.where });
                if (existingTransaction) {
                  transactionDate = existingTransaction.date;
                  await checkPeriodLock(client, transactionDate);
                }
              }
              result = await query(args);
              break;

            case 'delete':
            case 'deleteMany':
              if (args.where && (args.where.id || (args.where as any)?.id)) {
                const existingTransaction = await client.transaction.findUnique({ where: args.where });
                if (existingTransaction) {
                  await checkPeriodLock(client, existingTransaction.date);
                }
              }
              result = await query(args);
              break;

            default:
              result = await query(args);
              break;
          }
          return result;
        } catch (error) {
          console.error(`Period lock extension error for ${operation} on ${model}:`, error);
          throw error;
        }
      },
    },
  });
});
