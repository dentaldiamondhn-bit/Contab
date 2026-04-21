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
    await checkPeriodLock(transactionDate);
  }

  // For update operations, get the existing transaction first
  if (action === 'update') {
    const existingTransaction = await db.transaction.findUnique({
      where: params.args.where
    });
    
    if (existingTransaction) {
      await checkPeriodLock(existingTransaction.date);
    }
  }

  // For delete operations, get the existing transaction first
  if (action === 'delete') {
    const existingTransaction = await db.transaction.findUnique({
      where: params.args.where
    });
    
    if (existingTransaction) {
      await checkPeriodLock(existingTransaction.date);
    }
  }

  return params;
}

async function checkPeriodLock(transactionDate: Date) {
  // Get the last closed date from GlobalSettings
  const settings = await (db as any).globalSettings.findFirst();
  
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
  return await db.$transaction(async (tx: any) => {
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
