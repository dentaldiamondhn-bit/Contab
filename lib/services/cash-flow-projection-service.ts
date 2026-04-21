import { db } from '@/lib/db';

// Cash flow projection service
export interface Receivable {
  id: string;
  customerName: string;
  amount: number;
  dueDate: Date;
  invoiceNumber: string;
  probability: number; // 0-1, likelihood of collection
  daysOverdue: number;
}

export interface Payable {
  id: string;
  supplierName: string;
  amount: number;
  dueDate: Date;
  invoiceNumber: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  daysUntilDue: number;
}

export interface CashFlowItem {
  date: Date;
  description: string;
  amount: number;
  type: 'INFLOW' | 'OUTFLOW';
  category: string;
  probability: number;
  source: 'RECEIVABLE' | 'PAYABLE' | 'RECURRING' | 'PROJECTED';
}

export interface DailyCashFlow {
  date: Date;
  openingBalance: number;
  inflows: number;
  outflows: number;
  netFlow: number;
  closingBalance: number;
  items: CashFlowItem[];
}

export interface CashFlowProjection {
  period: {
    start: Date;
    end: Date;
    days: number;
  };
  currentBalance: number;
  projections: DailyCashFlow[];
  summary: {
    totalInflows: number;
    totalOutflows: number;
    netChange: number;
    endingBalance: number;
    averageDailyBalance: number;
    lowestBalance: number;
    lowestBalanceDate: Date;
    daysWithNegativeBalance: number;
  };
  warnings: string[];
  recommendations: string[];
}

export interface RecurringTransaction {
  description: string;
  amount: number;
  type: 'INFLOW' | 'OUTFLOW';
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';
  dayOfMonth?: number;
  dayOfWeek?: number;
  probability: number;
}

export class CashFlowProjectionService {
  /**
   * Generate comprehensive 30-day cash flow projection
   */
  static async generateProjection(
    days: number = 30,
    includeProbability: boolean = true
  ): Promise<CashFlowProjection> {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    const currentBalance = await this.getCurrentBankBalance();
    const receivables = await this.getReceivables(endDate);
    const payables = await this.getPayables(endDate);
    const recurring = await this.getRecurringTransactions();

    const projections = await this.generateDailyProjections(
      startDate,
      endDate,
      currentBalance,
      receivables,
      payables,
      recurring,
      includeProbability
    );

    const summary = this.calculateSummary(projections, currentBalance);
    const warnings = this.generateWarnings(projections, summary);
    const recommendations = this.generateRecommendations(projections, summary);

    return {
      period: {
        start: startDate,
        end: endDate,
        days
      },
      currentBalance,
      projections,
      summary,
      warnings,
      recommendations
    };
  }

  /**
   * Get current bank balance
   */
  static async getCurrentBankBalance(): Promise<number> {
    try {
      const bankAccounts = await (db as any).bankAccount.findMany({
        where: {
          isActive: true
        },
        include: {
          transactions: {
            orderBy: {
              date: 'desc'
            },
            take: 1
          }
        }
      });

      let totalBalance = 0;
      bankAccounts.forEach((account: any) => {
        totalBalance += Number(account.balance || 0);
      });

      return totalBalance;
    } catch (error) {
      console.error('Error getting bank balance:', error);
      return 250000; // Default fallback
    }
  }

  /**
   * Get accounts receivable
   */
  static async getReceivables(cutoffDate: Date): Promise<Receivable[]> {
    try {
      // Get revenue accounts with outstanding balances
      const receivableAccounts = await (db as any).account.findMany({
        where: {
          type: 'REVENUE'
        },
        include: {
          entries: {
            include: {
              transaction: true
            }
          }
        }
      } as any);

      const receivables: Receivable[] = [];

      receivableAccounts.forEach((account: any) => {
        account.entries.forEach((entry: any) => {
          const transaction = entry.transaction;
          const amount = Number(entry.amount);
          
          if (amount > 0 && transaction.date <= cutoffDate) {
            const daysOverdue = Math.max(0, Math.floor(
              (new Date().getTime() - transaction.date.getTime()) / (1000 * 60 * 60 * 24)
            ));

            receivables.push({
              id: entry.id,
              customerName: transaction.description || 'Cliente',
              amount: amount,
              dueDate: new Date(transaction.date),
              invoiceNumber: transaction.reference || 'N/A',
              probability: this.calculateCollectionProbability(daysOverdue),
              daysOverdue
            });
          }
        });
      });

      return receivables;
    } catch (error) {
      console.error('Error getting receivables:', error);
      return this.generateSampleReceivables();
    }
  }

  /**
   * Get accounts payable
   */
  static async getPayables(cutoffDate: Date): Promise<Payable[]> {
    try {
      // Get expense accounts with outstanding balances
      const payableAccounts = await (db as any).account.findMany({
        where: {
          type: 'EXPENSE'
        },
        include: {
          entries: {
            include: {
              transaction: true
            }
          }
        }
      } as any);

      const payables: Payable[] = [];

      payableAccounts.forEach((account: any) => {
        account.entries.forEach((entry: any) => {
          const transaction = entry.transaction;
          const amount = Number(entry.amount);
          
          if (amount < 0 && transaction.date <= cutoffDate) {
            const daysUntilDue = Math.floor(
              (transaction.date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
            );

            payables.push({
              id: entry.id,
              supplierName: transaction.description || 'Proveedor',
              amount: Math.abs(amount),
              dueDate: new Date(transaction.date),
              invoiceNumber: transaction.reference || 'N/A',
              priority: this.calculatePayablePriority(daysUntilDue, Math.abs(amount)),
              daysUntilDue
            });
          }
        });
      });

      return payables;
    } catch (error) {
      console.error('Error getting payables:', error);
      return this.generateSamplePayables();
    }
  }

  /**
   * Get recurring transactions
   */
  static async getRecurringTransactions(): Promise<RecurringTransaction[]> {
    // In a real implementation, this would come from a dedicated recurring transactions table
    // For now, we'll return common business recurring items
    return [
      {
        description: 'Ventas diarias promedio',
        amount: 15000,
        type: 'INFLOW',
        frequency: 'DAILY',
        probability: 0.8
      },
      {
        description: 'Salarios quincenales',
        amount: 75000,
        type: 'OUTFLOW',
        frequency: 'WEEKLY',
        dayOfWeek: 5, // Friday
        probability: 1.0
      },
      {
        description: 'Alquiler mensual',
        amount: 50000,
        type: 'OUTFLOW',
        frequency: 'MONTHLY',
        dayOfMonth: 1,
        probability: 1.0
      },
      {
        description: 'Servicios públicos',
        amount: 8000,
        type: 'OUTFLOW',
        frequency: 'MONTHLY',
        dayOfMonth: 15,
        probability: 0.9
      },
      {
        description: 'Comisiones ventas',
        amount: 5000,
        type: 'OUTFLOW',
        frequency: 'WEEKLY',
        dayOfWeek: 1, // Monday
        probability: 0.7
      }
    ];
  }

  /**
   * Generate daily cash flow projections
   */
  static async generateDailyProjections(
    startDate: Date,
    endDate: Date,
    currentBalance: number,
    receivables: Receivable[],
    payables: Payable[],
    recurring: RecurringTransaction[],
    includeProbability: boolean
  ): Promise<DailyCashFlow[]> {
    const projections: DailyCashFlow[] = [];
    let runningBalance = currentBalance;

    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const currentDate = new Date(date);
      const dailyItems: CashFlowItem[] = [];

      // Add receivables due on this date
      receivables.forEach(receivable => {
        if (this.isSameDay(receivable.dueDate, currentDate)) {
          dailyItems.push({
            date: currentDate,
            description: `Cobro: ${receivable.customerName} (${receivable.invoiceNumber})`,
            amount: receivable.amount,
            type: 'INFLOW',
            category: 'Accounts Receivable',
            probability: receivable.probability,
            source: 'RECEIVABLE'
          });
        }
      });

      // Add payables due on this date
      payables.forEach(payable => {
        if (this.isSameDay(payable.dueDate, currentDate)) {
          dailyItems.push({
            date: currentDate,
            description: `Pago: ${payable.supplierName} (${payable.invoiceNumber})`,
            amount: payable.amount,
            type: 'OUTFLOW',
            category: 'Accounts Payable',
            probability: 1.0,
            source: 'PAYABLE'
          });
        }
      });

      // Add recurring transactions
      recurring.forEach(transaction => {
        if (this.isRecurringDate(transaction, currentDate)) {
          dailyItems.push({
            date: currentDate,
            description: transaction.description,
            amount: transaction.amount,
            type: transaction.type,
            category: 'Recurring',
            probability: transaction.probability,
            source: 'RECURRING'
          });
        }
      });

      // Calculate daily totals
      const inflows = dailyItems
        .filter(item => item.type === 'INFLOW')
        .reduce((sum, item) => {
          const amount = includeProbability ? item.amount * item.probability : item.amount;
          return sum + amount;
        }, 0);

      const outflows = dailyItems
        .filter(item => item.type === 'OUTFLOW')
        .reduce((sum, item) => {
          const amount = includeProbability ? item.amount * item.probability : item.amount;
          return sum + amount;
        }, 0);

      const netFlow = inflows - outflows;
      const openingBalance = runningBalance;
      const closingBalance = openingBalance + netFlow;

      projections.push({
        date: currentDate,
        openingBalance,
        inflows,
        outflows,
        netFlow,
        closingBalance,
        items: dailyItems
      });

      runningBalance = closingBalance;
    }

    return projections;
  }

  /**
   * Calculate projection summary
   */
  static calculateSummary(projections: DailyCashFlow[], currentBalance: number): any {
    const totalInflows = projections.reduce((sum, day) => sum + day.inflows, 0);
    const totalOutflows = projections.reduce((sum, day) => sum + day.outflows, 0);
    const netChange = totalInflows - totalOutflows;
    const endingBalance = currentBalance + netChange;
    const averageDailyBalance = projections.reduce((sum, day) => sum + day.closingBalance, 0) / projections.length;

    const lowestBalance = Math.min(...projections.map(day => day.closingBalance));
    const lowestBalanceDate = projections.find(day => day.closingBalance === lowestBalance)?.date || new Date();
    const daysWithNegativeBalance = projections.filter(day => day.closingBalance < 0).length;

    return {
      totalInflows,
      totalOutflows,
      netChange,
      endingBalance,
      averageDailyBalance,
      lowestBalance,
      lowestBalanceDate,
      daysWithNegativeBalance
    };
  }

  /**
   * Generate cash flow warnings
   */
  static generateWarnings(projections: DailyCashFlow[], summary: any): string[] {
    const warnings: string[] = [];

    if (summary.daysWithNegativeBalance > 0) {
      warnings.push(`⚠️ Se proyectan ${summary.daysWithNegativeBalance} días con saldo negativo`);
    }

    if (summary.lowestBalance < 50000) {
      warnings.push('⚠️ Saldo mínimo proyectado inferior a L. 50,000');
    }

    if (summary.netChange < 0) {
      warnings.push('📉 Flujo de caja neto negativo en el período proyectado');
    }

    const consecutiveNegativeDays = this.getConsecutiveNegativeDays(projections);
    if (consecutiveNegativeDays > 7) {
      warnings.push(`⚠️ Se proyectan ${consecutiveNegativeDays} días consecutivos con flujo negativo`);
    }

    const largeOutflows = projections.filter(day => day.outflows > 100000).length;
    if (largeOutflows > 3) {
      warnings.push('💳 Múltiples días con salidas importantes de efectivo');
    }

    return warnings;
  }

  /**
   * Generate cash flow recommendations
   */
  static generateRecommendations(projections: DailyCashFlow[], summary: any): string[] {
    const recommendations: string[] = [];

    if (summary.daysWithNegativeBalance > 0) {
      recommendations.push('🏦 Considera línea de crédito o financiamiento temporal');
      recommendations.push('📞 Acelera cobranza de cuentas por cobrar');
    }

    if (summary.netChange < 0) {
      recommendations.push('💰 Revisa estructura de costos y gastos operativos');
      recommendations.push('📈 Implementa estrategias para aumentar ingresos');
    }

    if (summary.lowestBalance < 100000) {
      recommendations.push('🛡️ Mantén fondo de emergencia mínimo de 3 meses');
    }

    const averageDailyOutflow = summary.totalOutflows / projections.length;
    if (averageDailyOutflow > 20000) {
      recommendations.push('📊 Negocia mejores términos con proveedores');
    }

    if (summary.totalInflows / summary.totalOutflows < 1.2) {
      recommendations.push('🎯 Mejora margen de utilidad en productos/servicios');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ Flujo de caja saludable. Mantén monitoreo continuo');
    }

    return recommendations;
  }

  // Helper methods
  private static calculateCollectionProbability(daysOverdue: number): number {
    if (daysOverdue <= 0) return 0.95;
    if (daysOverdue <= 15) return 0.85;
    if (daysOverdue <= 30) return 0.70;
    if (daysOverdue <= 60) return 0.50;
    if (daysOverdue <= 90) return 0.30;
    return 0.15;
  }

  private static calculatePayablePriority(daysUntilDue: number, amount: number): 'HIGH' | 'MEDIUM' | 'LOW' {
    if (daysUntilDue <= 3 || amount > 100000) return 'HIGH';
    if (daysUntilDue <= 10 || amount > 50000) return 'MEDIUM';
    return 'LOW';
  }

  private static isSameDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  private static isRecurringDate(transaction: RecurringTransaction, date: Date): boolean {
    switch (transaction.frequency) {
      case 'DAILY':
        return true;
      case 'WEEKLY':
        return date.getDay() === (transaction.dayOfWeek || 1);
      case 'MONTHLY':
        return date.getDate() === (transaction.dayOfMonth || 1);
      case 'QUARTERLY':
        return date.getDate() === (transaction.dayOfMonth || 1) && 
               date.getMonth() % 3 === 0;
      default:
        return false;
    }
  }

  private static getConsecutiveNegativeDays(projections: DailyCashFlow[]): number {
    let maxConsecutive = 0;
    let currentConsecutive = 0;

    projections.forEach(day => {
      if (day.netFlow < 0) {
        currentConsecutive++;
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
      } else {
        currentConsecutive = 0;
      }
    });

    return maxConsecutive;
  }

  private static generateSampleReceivables(): Receivable[] {
    return [
      {
        id: '1',
        customerName: 'Cliente A',
        amount: 45000,
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        invoiceNumber: 'FAC-001',
        probability: 0.9,
        daysOverdue: 0
      },
      {
        id: '2',
        customerName: 'Cliente B',
        amount: 32000,
        dueDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
        invoiceNumber: 'FAC-002',
        probability: 0.8,
        daysOverdue: 0
      }
    ];
  }

  private static generateSamplePayables(): Payable[] {
    return [
      {
        id: '1',
        supplierName: 'Proveedor X',
        amount: 28000,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        invoiceNumber: 'PROV-001',
        priority: 'HIGH',
        daysUntilDue: 7
      },
      {
        id: '2',
        supplierName: 'Proveedor Y',
        amount: 15000,
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        invoiceNumber: 'PROV-002',
        priority: 'MEDIUM',
        daysUntilDue: 15
      }
    ];
  }
}
