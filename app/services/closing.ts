import { db } from "@/lib/db";
import { PrismaClient } from '@prisma/client';
import { closeBooks } from '@/lib/period-lock-middleware';

export async function performYearEndClosing(year: number, equityAccountId: String, closedBy: string) {
  return await (db as any).$transaction(async (tx: any) => {
    // VALIDATION 1: Prevent Duplicate Closures
    const existingClosing = await tx.transaction.findFirst({
      where: {
        description: {
          contains: `Cierre Anual de Cuentas de Resultados - Ejercicio ${year}`
        },
        type: "DIARIO",
        number: 9999
      }
    });

    if (existingClosing) {
      throw new Error(`Year-end closing for ${year} has already been performed. Transaction ID: ${existingClosing.id}`);
    }

    // VALIDATION 2: Check P&L Net Profit matches Revenue/Expense closing amounts
    const pnlData = await getPnLDataForValidation(tx, year);
    const calculatedNetChange = pnlData.revenueTotal + pnlData.expenseTotal; // Revenue is negative, Expense is positive
    
    // Get the actual amounts from Revenue/Expense accounts
    const accounts = await tx.account.findMany({
      where: { type: { in: ["REVENUE", "EXPENSE"] } },
      include: { entries: { where: { transaction: { date: { 
        gte: new Date(`${year}-01-01`), 
        lte: new Date(`${year}-12-31`) 
      } } } } }
    });

    let actualNetChange = 0;
    for (const account of accounts) {
      const balance = account.entries.reduce((sum: number, e: any) => sum + Number(e.amount), 0);
      actualNetChange += balance;
    }

    // Validate P&L matches actual calculations
    if (Math.abs(calculatedNetChange - actualNetChange) > 0.01) {
      throw new Error(
        `P&L validation failed. P&L shows net change of ${calculatedNetChange}, but account calculations show ${actualNetChange}. ` +
        'Please review the P&L report and trial balance before proceeding.'
      );
    }

    const closingEntries = [];
    let netChange = 0;

    for (const account of accounts) {
      const balance = account.entries.reduce((sum: number, e: any) => sum + Number(e.amount), 0);
      if (balance === 0) continue;

      // Create a reversing entry (if balance is 500 Debit, we create 500 Credit)
      closingEntries.push({
        accountId: account.id,
        amount: BigInt(-balance), 
      });
      netChange += balance;
    }

    // VALIDATION 3: Ensure net change matches P&L
    if (Math.abs(netChange - actualNetChange) > 0.01) {
      throw new Error('Internal validation error: Net change calculation mismatch');
    }

    // 2. The difference goes to Retained Earnings (Equity)
    closingEntries.push({
      accountId: equityAccountId,
      amount: BigInt(netChange),
    });

    // 3. Create the "Poliza de Cierre"
    const closingTransaction = await tx.transaction.create({
      data: {
        date: new Date(`${year}-12-31T23:59:59`),
        description: `Cierre Anual de Cuentas de Resultados - Ejercicio ${year}`,
        type: "DIARIO",
        number: 9999, // Standard convention for closing entries
        entries: { create: closingEntries }
      }
    });

    // 4. Apply fiscal lock - prevent any further transactions for this year
    const closingDate = new Date(`${year}-12-31T23:59:59`);
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
        period: year.toString(),
        periodType: 'YEARLY',
        closedBy,
        description: `Cierre Anual - Ejercicio ${year}`
      }
    });

    // 5. Create Opening Entry for next year (optional - for next year start)
    await createOpeningEntryForNextYear(tx, year, equityAccountId as string);

    return closingTransaction;
  });
}

// Helper function to get P&L data for validation
async function getPnLDataForValidation(tx: any, year: number) {
  const startDate = new Date(`${year}-01-01`);
  const endDate = new Date(`${year}-12-31`);
  
  const data = await tx.account.findMany({
    where: {
      type: { in: ["REVENUE", "EXPENSE"] }
    },
    include: {
      entries: {
        where: {
          transaction: {
            date: { gte: startDate, lte: endDate }
          }
        }
      }
    }
  });

  const revenue = data.filter((account: any) => account.type === 'REVENUE');
  const expenses = data.filter((account: any) => account.type === 'EXPENSE');

  const revenueTotal = revenue.reduce((sum: number, account: any) => 
    sum + account.entries.reduce((acc: number, e: any) => acc + Number(e.amount), 0), 0
  );
  
  const expenseTotal = expenses.reduce((sum: number, account: any) => 
    sum + account.entries.reduce((acc: number, e: any) => acc + Number(e.amount), 0), 0
  );

  return { revenue, expenses, revenueTotal, expenseTotal };
}

// Helper function to create opening entry for next year
async function createOpeningEntryForNextYear(tx: any, closedYear: number, equityAccountId: string) {
  const nextYear = closedYear + 1;
  const openingDate = new Date(`${nextYear}-01-01T00:00:01`);
  
  // Get all balance sheet accounts (Assets, Liabilities, Equity) as of year-end
  const balanceSheetAccounts = await tx.account.findMany({
    where: { type: { in: ["ASSET", "LIABILITY", "EQUITY"] } },
    include: { 
      entries: { 
        where: { 
          transaction: { 
            date: { 
              gte: new Date(`${closedYear}-01-01`), 
              lte: new Date(`${closedYear}-12-31`) 
            } 
          } 
        } 
      } 
    }
  });

  const openingEntries = [];

  for (const account of balanceSheetAccounts) {
    const balance = account.entries.reduce((sum: number, e: any) => sum + Number(e.amount), 0);
    if (balance === 0) continue;

    // Create opening entry that carries forward the balance
    openingEntries.push({
      accountId: account.id,
      amount: BigInt(balance),
    });
  }

  if (openingEntries.length === 0) return; // No opening entries needed

  // Create opening transaction for next year
  await tx.transaction.create({
    data: {
      date: openingDate,
      description: `Asiento de Apertura - Ejercicio ${nextYear}`,
      type: "DIARIO",
      number: 1, // First transaction of the new year
      entries: { create: openingEntries }
    }
  });
}