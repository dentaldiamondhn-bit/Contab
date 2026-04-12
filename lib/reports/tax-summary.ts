import { db } from '@/lib/db';

// Honduran tax rates (as of 2024)
const HONDURAN_IVA_RATE = 0.15; // 15% Sales Tax (IVA)
const HONDURAN_ISR_RATES = [
  { min: 0, max: 200000, rate: 0, fixed: 0 }, // Exempt up to L.200,000 annually
  { min: 200001, max: 500000, rate: 0.15, fixed: 0 }, // 15% on excess over L.200,000
  { min: 500001, max: 1000000, rate: 0.20, fixed: 45000 }, // 20% on excess over L.500,000 + L.45,000
  { min: 1000001, max: Infinity, rate: 0.25, fixed: 145000 }, // 25% on excess over L.1,000,000 + L.145,000
];

export interface TaxableTransaction {
  id: string;
  date: Date;
  description: string;
  amount: number; // in cents
  taxRate: number;
  taxAmount: number; // in cents
  type: 'SALE' | 'PURCHASE' | 'EXEMPT';
}

export interface TaxSummaryReport {
  period: {
    startDate: Date;
    endDate: Date;
  };
  currency: 'LPS' | 'USD'; // Honduran Lempira or USD
  sales: {
    totalSales: number; // in cents
    taxableSales: number; // in cents
    exemptSales: number; // in cents
    ivaCollected: number; // in cents
  };
  purchases: {
    totalPurchases: number; // in cents
    taxablePurchases: number; // in cents
    exemptPurchases: number; // in cents
    ivaPaid: number; // in cents
  };
  netIva: number; // in cents (Collected - Paid)
  income: {
    grossIncome: number; // in cents
    deductibleExpenses: number; // in cents
    taxableIncome: number; // in cents
    isrTax: number; // in cents
  };
  generatedAt: Date;
}

/**
 * Generates a Tax Summary report for Honduran tax context
 * Includes IVA (Sales Tax) and ISR (Income Tax) calculations
 */
export async function generateTaxSummary(
  startDate?: Date,
  endDate?: Date,
  currency: 'LPS' | 'USD' = 'LPS'
): Promise<TaxSummaryReport> {
  // Default to current year if no dates provided
  const now = new Date();
  const periodStart = startDate || new Date(now.getFullYear(), 0, 1);
  const periodEnd = endDate || new Date(now.getFullYear(), 11, 31);

  // Get all accounts to identify tax-relevant accounts
  const accounts = await db.account.findMany({
    select: {
      id: true,
      code: true,
      name: true,
      type: true
    }
  });

  // Identify account codes for tax calculations
  const revenueAccounts = accounts.filter((acc: any) => acc.type === 'REVENUE');
  const expenseAccounts = accounts.filter((acc: any) => acc.type === 'EXPENSE');
  const assetAccounts = accounts.filter((acc: any) => acc.type === 'ASSET');

  // Get all journal entries for the period
  const allEntries = await db.journalEntry.findMany({
    where: {
      transaction: {
        date: {
          gte: periodStart,
          lte: periodEnd
        }
      }
    },
    include: {
      transaction: true,
      account: true
    }
  });

  // Calculate sales (revenue)
  const salesEntries = allEntries.filter((entry: any) => 
    revenueAccounts.some((acc: any) => acc.id === entry.accountId) && entry.amount > 0
  );

  const totalSales = salesEntries.reduce((sum: number, entry: any) => sum + Number(entry.amount), 0);
  
  // For simplicity, assume 80% of sales are taxable (can be refined with account codes)
  const taxableSales = Math.round(totalSales * 0.8);
  const exemptSales = totalSales - taxableSales;
  const ivaCollected = Math.round(taxableSales * HONDURAN_IVA_RATE);

  // Calculate purchases (expenses and cost of goods)
  const purchaseEntries = allEntries.filter((entry: any) => 
    (expenseAccounts.some((acc: any) => acc.id === entry.accountId) || 
     (assetAccounts.some((acc: any) => acc.id === entry.accountId) && entry.amount < 0)) &&
    entry.amount < 0
  );

  const totalPurchases = Math.abs(purchaseEntries.reduce((sum: number, entry: any) => sum + Number(entry.amount), 0));
  
  // For simplicity, assume 70% of purchases are taxable (can be refined with account codes)
  const taxablePurchases = Math.round(totalPurchases * 0.7);
  const exemptPurchases = totalPurchases - taxablePurchases;
  const ivaPaid = Math.round(taxablePurchases * HONDURAN_IVA_RATE);

  // Calculate income tax
  const grossIncome = totalSales;
  const deductibleExpenses = totalPurchases;
  const taxableIncome = Math.max(0, grossIncome - deductibleExpenses);
  
  // Convert to Lempira for ISR calculation (assuming 1 USD = 24.5 LPS)
  const conversionRate = currency === 'USD' ? 24.5 : 1;
  const taxableIncomeLPS = taxableIncome * conversionRate / 100; // Convert cents to LPS
  
  const isrTaxLPS = calculateISR(taxableIncomeLPS);
  const isrTax = Math.round(isrTaxLPS / conversionRate * 100); // Convert back to cents

  const netIva = ivaCollected - ivaPaid;

  return {
    period: {
      startDate: periodStart,
      endDate: periodEnd
    },
    currency,
    sales: {
      totalSales,
      taxableSales,
      exemptSales,
      ivaCollected
    },
    purchases: {
      totalPurchases,
      taxablePurchases,
      exemptPurchases,
      ivaPaid
    },
    netIva,
    income: {
      grossIncome,
      deductibleExpenses,
      taxableIncome,
      isrTax
    },
    generatedAt: new Date()
  };
}

/**
 * Calculates Honduran Income Tax (ISR) based on taxable income
 */
function calculateISR(taxableIncomeLPS: number): number {
  for (const bracket of HONDURAN_ISR_RATES) {
    if (taxableIncomeLPS >= bracket.min && taxableIncomeLPS <= bracket.max) {
      const excess = Math.max(0, taxableIncomeLPS - bracket.min);
      return bracket.fixed + (excess * bracket.rate);
    }
  }
  return 0;
}

/**
 * Gets taxable transactions with tax details
 */
export async function getTaxableTransactions(
  type: 'SALE' | 'PURCHASE',
  startDate?: Date,
  endDate?: Date
): Promise<TaxableTransaction[]> {
  const now = new Date();
  const periodStart = startDate || new Date(now.getFullYear(), 0, 1);
  const periodEnd = endDate || new Date(now.getFullYear(), 11, 31);

  // Get accounts based on type
  const accountTypes = type === 'SALE' ? ['REVENUE'] : ['EXPENSE', 'ASSET'];
  
  const accounts = await db.account.findMany({
    where: {
      type: { in: accountTypes }
    }
  });

  const accountIds = accounts.map((acc: any) => acc.id);

  const entries = await db.journalEntry.findMany({
    where: {
      accountId: { in: accountIds },
      transaction: {
        date: {
          gte: periodStart,
          lte: periodEnd
        }
      }
    },
    include: {
      transaction: true,
      account: true
    },
    orderBy: {
      transaction: {
        date: 'desc'
      }
    }
  });

  return entries.map((entry: any) => {
    const amount = Math.abs(Number(entry.amount));
    const isExempt = entry.account.name.toLowerCase().includes('exempt') || 
                     entry.transaction.description.toLowerCase().includes('exento');
    
    return {
      id: entry.id,
      date: entry.transaction.date,
      description: entry.transaction.description,
      amount,
      taxRate: isExempt ? 0 : HONDURAN_IVA_RATE,
      taxAmount: isExempt ? 0 : Math.round(amount * HONDURAN_IVA_RATE),
      type: isExempt ? 'EXEMPT' : type
    };
  });
}

/**
 * Formats currency for display
 */
export function formatTaxCurrency(amount: number, currency: 'LPS' | 'USD' = 'LPS'): string {
  const divisor = currency === 'LPS' ? 1 : 100; // LPS stored as whole units, USD as cents
  
  return new Intl.NumberFormat(currency === 'LPS' ? 'es-HN' : 'en-US', {
    style: 'currency',
    currency: currency === 'LPS' ? 'HNL' : 'USD'
  }).format(amount / divisor);
}
