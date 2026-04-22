import { PrismaClient } from '@prisma/client';
import { TaxConfigService, TaxConfigWithAccount } from '@/lib/services/tax-config';

const prisma = new PrismaClient();

export interface MonthlyTaxReport {
  period: string; // "YYYY-MM"
  sales: {
    totalBase: number; // in cents
    totalTax: number; // in cents
    details: TaxReportDetail[];
  };
  purchases: {
    totalBase: number; // in cents
    totalTax: number; // in cents
    details: TaxReportDetail[];
  };
  summary: {
    totalTaxToPay: number; // in cents (Sales Tax - Purchases Tax)
    totalBaseSales: number; // in cents
    totalBasePurchases: number; // in cents
  };
  taxConfig: TaxConfigWithAccount;
}

export interface TaxReportDetail {
  accountCode: string;
  accountName: string;
  totalBase: number; // in cents
  totalTax: number; // in cents
  transactionCount: number;
  effectiveRate: number; // actual tax rate applied
}

export class TaxReportingService {
  /**
   * Generate monthly tax report for SAR declaration
   */
  static async generateMonthlyReport(period: string): Promise<MonthlyTaxReport> {
    // Validate period format
    if (!period.match(/^\d{4}-\d{2}$/)) {
      throw new Error('Period must be in format YYYY-MM');
    }

    const [year, month] = period.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999); // Last day of month

    // Get active tax configuration
    const taxConfigs = await TaxConfigService.getActiveTaxConfigs();
    const standardTaxConfig = taxConfigs.find(config => config.rate === 0.15);
    
    if (!standardTaxConfig) {
      throw new Error('Standard ISV tax configuration (15%) not found');
    }

    // Get tax-related accounts
    const taxAccounts = await this.getTaxRelatedAccounts();

    // Calculate sales tax (ISV on sales)
    const salesDetails = await this.calculateSalesTax(startDate, endDate, taxAccounts);
    
    // Calculate purchases tax (ISV on purchases)
    const purchasesDetails = await this.calculatePurchasesTax(startDate, endDate, taxAccounts);

    // Calculate totals
    const salesTotalBase = salesDetails.reduce((sum, detail) => sum + detail.totalBase, 0);
    const salesTotalTax = salesDetails.reduce((sum, detail) => sum + detail.totalTax, 0);
    const purchasesTotalBase = purchasesDetails.reduce((sum, detail) => sum + detail.totalBase, 0);
    const purchasesTotalTax = purchasesDetails.reduce((sum, detail) => sum + detail.totalTax, 0);

    return {
      period,
      sales: {
        totalBase: salesTotalBase,
        totalTax: salesTotalTax,
        details: salesDetails
      },
      purchases: {
        totalBase: purchasesTotalBase,
        totalTax: purchasesTotalTax,
        details: purchasesDetails
      },
      summary: {
        totalTaxToPay: Math.max(0, salesTotalTax - purchasesTotalTax),
        totalBaseSales: salesTotalBase,
        totalBasePurchases: purchasesTotalBase
      },
      taxConfig: standardTaxConfig
    };
  }

  /**
   * Calculate ISV on sales from revenue accounts
   */
  private static async calculateSalesTax(
    startDate: Date,
    endDate: Date,
    taxAccounts: any[]
  ): Promise<TaxReportDetail[]> {
    const revenueAccounts = await prisma.account.findMany({
      where: {
        type: 'REVENUE'
      }
    });

    const salesDetails: TaxReportDetail[] = [];

    for (const account of revenueAccounts) {
      // Get all credit entries (revenue) for this account in the period
      const entries = await (prisma as any).journalEntry.findMany({
        where: {
          accountId: account.id,
          amount: { lt: 0 }, // Credits are negative
          transaction: {
            date: {
              gte: startDate,
              lte: endDate
            }
          }
        },
        include: {
          transaction: true
        }
      } as any);

      if (entries.length === 0) continue;

      // Calculate base amount (absolute value of credits)
      const totalBase = entries.reduce((sum: number, entry: any) => sum + Math.abs(entry.amount), 0);

      // Calculate corresponding tax entries
      const taxEntries = await this.findRelatedTaxEntries(entries.map((e: any) => e.transactionId));

      // Calculate total tax from related tax entries
      const totalTax = taxEntries.reduce((sum: number, entry: any) => sum + Math.abs(entry.amount), 0);

      // Calculate effective rate
      const effectiveRate = totalBase > 0 ? totalTax / totalBase : 0;

      salesDetails.push({
        accountCode: account.code,
        accountName: account.name,
        totalBase,
        totalTax,
        transactionCount: entries.length,
        effectiveRate
      });
    }

    return salesDetails.sort((a, b) => b.totalBase - a.totalBase);
  }

  /**
   * Calculate ISV on purchases from expense accounts
   */
  private static async calculatePurchasesTax(
    startDate: Date,
    endDate: Date,
    taxAccounts: any[]
  ): Promise<TaxReportDetail[]> {
    const expenseAccounts = await prisma.account.findMany({
      where: {
        type: 'EXPENSE'
      }
    });

    const purchasesDetails: TaxReportDetail[] = [];

    for (const account of expenseAccounts) {
      // Get all debit entries (expenses) for this account in the period
      const entries = await (prisma as any).journalEntry.findMany({
        where: {
          accountId: account.id,
          amount: { gt: 0 }, // Debits are positive
          transaction: {
            date: {
              gte: startDate,
              lte: endDate
            }
          }
        },
        include: {
          transaction: true
        }
      } as any);

      if (entries.length === 0) continue;

      // Calculate base amount (debits)
      const totalBase = entries.reduce((sum: number, entry: any) => sum + entry.amount, 0);

      // Calculate corresponding tax entries (ISV on purchases)
      const taxEntries = await this.findRelatedTaxEntries(entries.map((e: any) => e.transactionId));

      // Calculate total tax from related tax entries
      const totalTax = taxEntries.reduce((sum: number, entry: any) => sum + Math.abs(entry.amount), 0);

      // Calculate effective rate
      const effectiveRate = totalBase > 0 ? totalTax / totalBase : 0;

      purchasesDetails.push({
        accountCode: account.code,
        accountName: account.name,
        totalBase,
        totalTax,
        transactionCount: entries.length,
        effectiveRate
      });
    }

    return purchasesDetails.sort((a, b) => b.totalBase - a.totalBase);
  }

  /**
   * Find tax entries related to a list of transaction IDs
   */
  private static async findRelatedTaxEntries(transactionIds: string[]) {
    // Get tax payable accounts
    const taxPayableAccounts = await prisma.account.findMany({
      where: {
        type: 'LIABILITY',
        name: {
          contains: 'ISV'
        }
      }
    });

    const taxAccountIds = taxPayableAccounts.map(account => account.id);

    return await prisma.journalEntry.findMany({
      where: {
        accountId: {
          in: taxAccountIds
        },
        transactionId: {
          in: transactionIds
        }
      }
    });
  }

  /**
   * Get tax-related accounts for reporting
   */
  private static async getTaxRelatedAccounts() {
    return await prisma.account.findMany({
      where: {
        OR: [
          { type: 'REVENUE' },
          { type: 'EXPENSE' },
          { 
            type: 'LIABILITY',
            name: {
              contains: 'ISV'
            }
          }
        ]
      },
      select: {
        id: true,
        name: true,
        code: true,
        type: true
      }
    });
  }

  /**
   * Get available periods for reporting
   */
  static async getAvailablePeriods(): Promise<string[]> {
    // Get the earliest transaction date
    const earliestTransaction = await prisma.transaction.findFirst({
      orderBy: {
        date: 'asc'
      },
      select: {
        date: true
      }
    });

    if (!earliestTransaction) {
      return [];
    }

    const periods: string[] = [];
    const currentDate = new Date();
    const startDate = new Date(earliestTransaction.date);

    // Generate all months from earliest transaction to current month
    while (startDate <= currentDate) {
      const period = startDate.toISOString().slice(0, 7); // "YYYY-MM"
      periods.push(period);
      startDate.setMonth(startDate.getMonth() + 1);
    }

    return periods.reverse(); // Most recent first
  }

  /**
   * Export tax report to CSV format for SAR
   */
  static async exportToCSV(report: MonthlyTaxReport): Promise<string> {
    const headers = [
      'Tipo',
      'Cuenta',
      'Descripción',
      'Base Imponible',
      'ISV',
      'Tasa Efectiva'
    ];

    const rows = [
      // Sales section
      ...report.sales.details.map((detail: any) => [
        'VENTA',
        detail.accountCode,
        detail.accountName,
        (detail.totalBase / 100).toFixed(2),
        (detail.totalTax / 100).toFixed(2),
        (detail.effectiveRate * 100).toFixed(2) + '%'
      ]),
      // Sales totals
      ['VENTA', 'TOTAL', '', 
        (report.sales.totalBase / 100).toFixed(2),
        (report.sales.totalTax / 100).toFixed(2),
        ''
      ],
      // Purchases section
      ...report.purchases.details.map((detail: any) => [
        'COMPRA',
        detail.accountCode,
        detail.accountName,
        (detail.totalBase / 100).toFixed(2),
        (detail.totalTax / 100).toFixed(2),
        (detail.effectiveRate * 100).toFixed(2) + '%'
      ]),
      // Purchases totals
      ['COMPRA', 'TOTAL', '',
        (report.purchases.totalBase / 100).toFixed(2),
        (report.purchases.totalTax / 100).toFixed(2),
        ''
      ],
      // Summary
      ['RESUMEN', 'TOTAL A PAGAR', '',
        '',
        (report.summary.totalTaxToPay / 100).toFixed(2),
        ''
      ]
    ];

    const csvContent = [
      headers.join(','),
      ...rows.map((row: any) => row.map((cell: any) => `"${cell}"`).join(','))
    ].join('\n');

    return csvContent;
  }
}
