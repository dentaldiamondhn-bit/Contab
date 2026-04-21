import { db } from '@/lib/db';

// Break-even analysis service
export interface FixedCosts {
  rent: number;
  salaries: number;
  utilities: number;
  insurance: number;
  depreciation: number;
  other: number;
  total: number;
}

export interface VariableCosts {
  materials: number;
  labor: number;
  commissions: number;
  shipping: number;
  other: number;
  total: number;
}

export interface BreakEvenAnalysis {
  fixedCosts: FixedCosts;
  variableCosts: VariableCosts;
  averagePricePerUnit: number;
  variableCostPerUnit: number;
  contributionMargin: number;
  contributionMarginRatio: number;
  breakEvenPoint: {
    units: number;
    revenue: number;
  };
  marginOfSafety: {
    units: number;
    revenue: number;
    percentage: number;
  };
  targetProfit: {
    units: number;
    revenue: number;
  };
}

export interface BreakEvenScenario {
  name: string;
  description: string;
  fixedCosts: FixedCosts;
  variableCosts: VariableCosts;
  averagePricePerUnit: number;
}

export class BreakEvenService {
  /**
   * Calculate comprehensive break-even analysis
   */
  static async calculateBreakEven(
    fixedCosts: FixedCosts,
    variableCosts: VariableCosts,
    averagePricePerUnit: number,
    currentSalesUnits: number = 0,
    targetProfitAmount: number = 0
  ): Promise<BreakEvenAnalysis> {
    
    const variableCostPerUnit = variableCosts.total / (currentSalesUnits || 1);
    const contributionMargin = averagePricePerUnit - variableCostPerUnit;
    const contributionMarginRatio = contributionMargin / averagePricePerUnit;

    const breakEvenUnits = fixedCosts.total / contributionMargin;
    const breakEvenRevenue = breakEvenUnits * averagePricePerUnit;

    const marginOfSafetyUnits = Math.max(0, currentSalesUnits - breakEvenUnits);
    const marginOfSafetyRevenue = marginOfSafetyUnits * averagePricePerUnit;
    const marginOfSafetyPercentage = currentSalesUnits > 0 
      ? (marginOfSafetyUnits / currentSalesUnits) * 100 
      : 0;

    const targetProfitUnits = (fixedCosts.total + targetProfitAmount) / contributionMargin;
    const targetProfitRevenue = targetProfitUnits * averagePricePerUnit;

    return {
      fixedCosts,
      variableCosts,
      averagePricePerUnit,
      variableCostPerUnit,
      contributionMargin,
      contributionMarginRatio,
      breakEvenPoint: {
        units: Math.ceil(breakEvenUnits),
        revenue: breakEvenRevenue
      },
      marginOfSafety: {
        units: Math.floor(marginOfSafetyUnits),
        revenue: marginOfSafetyRevenue,
        percentage: marginOfSafetyPercentage
      },
      targetProfit: {
        units: Math.ceil(targetProfitUnits),
        revenue: targetProfitRevenue
      }
    };
  }

  /**
   * Get fixed costs from accounting data
   */
  static async getFixedCosts(period?: { start: Date; end: Date }): Promise<FixedCosts> {
    try {
      const dateFilter = period ? {
        date: {
          gte: period.start,
          lte: period.end
        }
      } : {};

      // Get expenses from fixed cost accounts
      const fixedCostAccounts = await (db as any).account.findMany({
        where: {
          type: 'EXPENSE'
        },
        include: {
          entries: {
            where: dateFilter,
            include: {
              transaction: true
            }
          }
        }
      } as any);

      const costs: FixedCosts = {
        rent: 0,
        salaries: 0,
        utilities: 0,
        insurance: 0,
        depreciation: 0,
        other: 0,
        total: 0
      };

      fixedCostAccounts.forEach((account: any) => {
        const total = account.entries.reduce((sum: number, entry: any) => {
          return sum + Math.abs(Number(entry.amount));
        }, 0);

        switch (account.name) {
          case 'RENT':
            costs.rent += total;
            break;
          case 'SALARIES':
            costs.salaries += total;
            break;
          case 'UTILITIES':
            costs.utilities += total;
            break;
          case 'INSURANCE':
            costs.insurance += total;
            break;
          case 'DEPRECIATION':
            costs.depreciation += total;
            break;
          default:
            costs.other += total;
            break;
        }
      });

      costs.total = costs.rent + costs.salaries + costs.utilities + 
                   costs.insurance + costs.depreciation + costs.other;

      return costs;
    } catch (error) {
      console.error('Error getting fixed costs:', error);
      return {
        rent: 50000,
        salaries: 150000,
        utilities: 15000,
        insurance: 8000,
        depreciation: 5000,
        other: 7000,
        total: 235000
      };
    }
  }

  /**
   * Get variable costs from accounting data
   */
  static async getVariableCosts(period?: { start: Date; end: Date }): Promise<VariableCosts> {
    try {
      const dateFilter = period ? {
        date: {
          gte: period.start,
          lte: period.end
        }
      } : {};

      // Get expenses from variable cost accounts
      const variableCostAccounts = await (db as any).account.findMany({
        where: {
          type: 'EXPENSE'
        },
        include: {
          entries: {
            where: dateFilter,
            include: {
              transaction: true
            }
          }
        }
      } as any);

      const costs: VariableCosts = {
        materials: 0,
        labor: 0,
        commissions: 0,
        shipping: 0,
        other: 0,
        total: 0
      };

      variableCostAccounts.forEach((account: any) => {
        const total = account.entries.reduce((sum: number, entry: any) => {
          return sum + Math.abs(Number(entry.amount));
        }, 0);

        switch (account.category) {
          case 'MATERIALS':
            costs.materials += total;
            break;
          case 'LABOR':
            costs.labor += total;
            break;
          case 'COMMISSIONS':
            costs.commissions += total;
            break;
          case 'SHIPPING':
            costs.shipping += total;
            break;
          default:
            costs.other += total;
            break;
        }
      });

      costs.total = costs.materials + costs.labor + costs.commissions + 
                   costs.shipping + costs.other;

      return costs;
    } catch (error) {
      console.error('Error getting variable costs:', error);
      return {
        materials: 80000,
        labor: 60000,
        commissions: 25000,
        shipping: 15000,
        other: 10000,
        total: 190000
      };
    }
  }

  /**
   * Get average price per unit from sales data
   */
  static async getAveragePricePerUnit(period?: { start: Date; end: Date }): Promise<number> {
    try {
      const dateFilter = period ? {
        date: {
          gte: period.start,
          lte: period.end
        }
      } : {};

      // Get revenue from sales
      const revenueAccounts = await (db as any).account.findMany({
        where: {
          type: 'REVENUE'
        },
        include: {
          entries: {
            where: dateFilter,
            include: {
              transaction: true
            }
          }
        }
      } as any);

      let totalRevenue = 0;
      let totalUnits = 0;

      revenueAccounts.forEach((account: any) => {
        account.entries.forEach((entry: any) => {
          const amount = Number(entry.amount);
          if (amount > 0) {
            totalRevenue += amount;
            // Estimate units based on transaction description or metadata
            // This is a simplified approach - in real implementation, 
            // you'd have proper unit tracking
            const estimatedUnits = this.estimateUnitsFromTransaction(entry.transaction);
            totalUnits += estimatedUnits;
          }
        });
      });

      return totalUnits > 0 ? totalRevenue / totalUnits : 1000; // Default to L. 1,000
    } catch (error) {
      console.error('Error getting average price:', error);
      return 1500; // Default fallback
    }
  }

  /**
   * Estimate units from transaction (simplified implementation)
   */
  private static estimateUnitsFromTransaction(transaction: any): number {
    // In a real implementation, this would analyze transaction details,
    // invoice line items, or metadata to determine actual units sold
    // For now, we'll use a simple heuristic based on amount
    const amount = Math.abs(Number(transaction.amount || 0));
    
    // Assume average unit price of L. 1,500 for estimation
    return Math.max(1, Math.floor(amount / 1500));
  }

  /**
   * Get current sales data
   */
  static async getCurrentSalesData(period?: { start: Date; end: Date }): Promise<{
    units: number;
    revenue: number;
  }> {
    try {
      const dateFilter = period ? {
        date: {
          gte: period.start,
          lte: period.end
        }
      } : {};

      const revenueAccounts = await (db as any).account.findMany({
        where: {
          type: 'REVENUE'
        },
        include: {
          entries: {
            where: dateFilter,
            include: {
              transaction: true
            }
          }
        }
      } as any);

      let totalRevenue = 0;
      let totalUnits = 0;

      revenueAccounts.forEach((account: any) => {
        account.entries.forEach((entry: any) => {
          const amount = Number(entry.amount);
          if (amount > 0) {
            totalRevenue += amount;
            totalUnits += this.estimateUnitsFromTransaction(entry.transaction);
          }
        });
      });

      return {
        units: totalUnits,
        revenue: totalRevenue
      };
    } catch (error) {
      console.error('Error getting sales data:', error);
      return {
        units: 150,
        revenue: 225000
      };
    }
  }

  /**
   * Generate break-even scenarios for comparison
   */
  static async generateScenarios(baseAnalysis: BreakEvenAnalysis): Promise<BreakEvenScenario[]> {
    const scenarios: BreakEvenScenario[] = [];

    // Current scenario
    scenarios.push({
      name: 'Actual',
      description: 'Current business performance',
      fixedCosts: baseAnalysis.fixedCosts,
      variableCosts: baseAnalysis.variableCosts,
      averagePricePerUnit: baseAnalysis.averagePricePerUnit
    });

    // Optimistic scenario
    scenarios.push({
      name: 'Optimista',
      description: '10% price increase, 5% cost reduction',
      fixedCosts: {
        ...baseAnalysis.fixedCosts,
        total: baseAnalysis.fixedCosts.total * 0.95
      },
      variableCosts: {
        ...baseAnalysis.variableCosts,
        total: baseAnalysis.variableCosts.total * 0.95
      },
      averagePricePerUnit: baseAnalysis.averagePricePerUnit * 1.10
    });

    // Pessimistic scenario
    scenarios.push({
      name: 'Pesimista',
      description: '5% price decrease, 10% cost increase',
      fixedCosts: {
        ...baseAnalysis.fixedCosts,
        total: baseAnalysis.fixedCosts.total * 1.10
      },
      variableCosts: {
        ...baseAnalysis.variableCosts,
        total: baseAnalysis.variableCosts.total * 1.10
      },
      averagePricePerUnit: baseAnalysis.averagePricePerUnit * 0.95
    });

    // Cost reduction scenario
    scenarios.push({
      name: 'Reducción Costos',
      description: '15% cost reduction, same price',
      fixedCosts: {
        ...baseAnalysis.fixedCosts,
        total: baseAnalysis.fixedCosts.total * 0.85
      },
      variableCosts: {
        ...baseAnalysis.variableCosts,
        total: baseAnalysis.variableCosts.total * 0.85
      },
      averagePricePerUnit: baseAnalysis.averagePricePerUnit
    });

    return scenarios;
  }

  /**
   * Get break-even recommendations
   */
  static getRecommendations(analysis: BreakEvenAnalysis): string[] {
    const recommendations: string[] = [];

    if (analysis.marginOfSafety.percentage < 20) {
      recommendations.push('⚠️ Margen de seguridad bajo. Considera aumentar precios o reducir costos.');
    }

    if (analysis.contributionMarginRatio < 0.3) {
      recommendations.push('📉 Margen de contribución bajo. Revisa estructura de costos variables.');
    }

    if (analysis.fixedCosts.total > analysis.variableCosts.total * 2) {
      recommendations.push('🏢 Altos costos fijos. Evalúa optimización de estructura operativa.');
    }

    if (analysis.breakEvenPoint.revenue > 1000000) {
      recommendations.push('🎯 Punto de equilibrio alto. Considera diversificación de ingresos.');
    }

    if (analysis.variableCosts.total / analysis.breakEvenPoint.revenue > 0.7) {
      recommendations.push('📦 Costos variables elevados. Busca eficiencias en producción/compras.');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ Análisis favorable. Mantén monitoreo continuo.');
    }

    return recommendations;
  }

  /**
   * Get complete break-even analysis with current data
   */
  static async getCompleteAnalysis(
    period?: { start: Date; end: Date },
    targetProfit: number = 50000
  ): Promise<{
    analysis: BreakEvenAnalysis;
    scenarios: BreakEvenScenario[];
    recommendations: string[];
  }> {
    const fixedCosts = await this.getFixedCosts(period);
    const variableCosts = await this.getVariableCosts(period);
    const averagePrice = await this.getAveragePricePerUnit(period);
    const currentSales = await this.getCurrentSalesData(period);

    const analysis = await this.calculateBreakEven(
      fixedCosts,
      variableCosts,
      averagePrice,
      currentSales.units,
      targetProfit
    );

    const scenarios = await this.generateScenarios(analysis);
    const recommendations = this.getRecommendations(analysis);

    return {
      analysis,
      scenarios,
      recommendations
    };
  }
}
