/**
 * Módulo de cálculo de razones financieras contables
 * Basado en datos de balances y asientos contables
 */

/**
 * Tipos de razones financieras soportadas
 */
export type FinancialRatioType =
  | 'current_ratio'           // Ratio de liquidez corriente
  | 'quick_ratio'           // Ratio de liquidez rápida
  | 'debt_to_equity'        // Deuda sobre capital propio
  | 'debt_to_assets'        // Deuda sobre activos totales
  | 'equity_ratio'          // Ratio de capital propio
  | 'gross_profit_margin'   // Margen bruto de ganancia
  | 'net_profit_margin'     // Margen neto de ganancia
  | 'return_on_assets'      // Retorno sobre activos (ROA)
  | 'return_on_equity'      // Retorno sobre capital propio (ROE)
  | 'current_asset_turnover' // Rotación de activos corrientes
  | 'working_capital'       // Capital de trabajo
  | 'operating_cash_flow'   // Flow de efectivo operativo

/**
 * Interfaz para datos de razón financiera
 */
export interface FinancialRatio {
  id: FinancialRatioType;
  name: string;
  description: string;
  formula: string;
  value: number | null;
  unit: string;
  interpretation: string;
  category: 'liquidity' | 'profitability' | 'solvency' | 'efficiency' | 'health';
}

/**
 * Datos necesarios para calcular razones financieras
 */
export interface FinancialRatiosData {
  /** Activos Corrientes (AccountType: ASSET con saldo de período actual) */
  currentAssets: number;
  /** Activos Totales */
  totalAssets: number;
  /** Pasivos Corrientes */
  currentLiabilities: number;
  /** Pasivos Totales */
  totalLiabilities: number;
  /** Capital Propio / Equity */
  totalEquity: number;
  /** Ingresos (Ventas) - período */
  totalRevenue: number;
  /** Gastos - período */
  totalExpenses: number;
  /** utilidad neta = Ingresos - Gastos */
  netIncome: number;
  /** Costo de ventas / COGS */
  costOfGoodsSold: number;
  /** Inventario actual */
  currentInventory: number;
  /** Cuentas por cobrar */
  accountsReceivable: number;
  /** Cuentas por pagar */
  accountsPayable: number;
}

/**
 * Calcula todas las razones financieras disponibles
 */
export function calculateAllRatios(data: FinancialRatiosData): FinancialRatio[] {
  const ratios: FinancialRatio[] = [];

  // --- LIQUIDITY RATIOS ---

  // Current Ratio = Current Assets / Current Liabilities
  const currentRatioValue = data.currentLiabilities > 0 ? data.currentAssets / data.currentLiabilities : null;
  ratios.push({
    id: 'current_ratio',
    name: 'Ratio de Liquidez Corriente',
    description: 'Mide la capacidad de la empresa para pagar sus deudas a corto plazo',
    formula: 'Current Assets ÷ Current Liabilities',
    value: currentRatioValue,
    unit: 'x',
    interpretation:
      currentRatioValue !== null
        ? currentRatioValue >= 2.0
          ? 'Excelente: La empresa tiene el doble de activos corrientes que pasivos a corto.'
          : currentRatioValue >= 1.0
            ? 'Satisfactorio: La empresa puede cubrir sus deudas a corto plazo.'
            : 'Alerta: La empresa podría tener dificultades para pagar sus deudas a corto plazo.'
        : 'No disponible: Datos insuficientes.',
    category: 'liquidity',
  });

  // Quick Ratio = (Current Assets - Inventory) / Current Liabilities
  const quickRatioValue = data.currentLiabilities > 0 ? (data.currentAssets - data.currentInventory) / data.currentLiabilities : null;
  ratios.push({
    id: 'quick_ratio',
    name: 'Ratio de Liquidez Rápida (Acid-Test)',
    description: 'Mide la capacidad de pago a corto plazo sin contar con inventario',
    formula: '(Current Assets - Inventory) ÷ Current Liabilities',
    value: quickRatioValue,
    unit: 'x',
    interpretation:
      quickRatioValue !== null
        ? quickRatioValue >= 1.0
          ? 'Satisfactorio: La empresa puede cubrir sus deudas más apremiantes sin vender inventario.'
          : 'Alerta: La empresa podría tener dificultad para pagar sus deudas sin vender inventario.'
        : 'No disponible: Datos insuficientes.',
    category: 'liquidity',
  });

  // --- SOLVENCY RATIOS ---

  // Debt-to-Equity = Total Liabilities / Total Equity
  const debtToEquityValue = data.totalEquity !== 0 ? data.totalLiabilities / data.totalEquity : null;
  ratios.push({
    id: 'debt_to_equity',
    name: 'Deuda sobre Capital Propio',
    description: 'Mide la proporción de financiación con deuda vs. capital propio',
    formula: 'Total Liabilities ÷ Total Equity',
    value: debtToEquityValue,
    unit: 'x',
    interpretation:
      debtToEquityValue !== null
        ? debtToEquityValue <= 0.5
          ? 'Conservador: La empresa está financiada principalmente con capital propio.'
          : debtToEquityValue <= 1.0
            ? 'Moderado: Balanced financing between debt and equity.'
            : 'Apalancamiento alto: La empresa usa mucha deuda relative a su capital propio.'
        : 'No disponible: Capital propio es cero o datos insuficientes.',
    category: 'solvency',
  });

  // Debt-to-Assets = Total Liabilities / Total Assets
  const debtToAssetsValue = data.totalAssets > 0 ? data.totalLiabilities / data.totalAssets : null;
  ratios.push({
    id: 'debt_to_assets',
    name: 'Deuda sobre Activos Totales',
    description: 'Porcentaje de los activos financiados con deuda',
    formula: 'Total Liabilities ÷ Total Assets',
    value: debtToAssetsValue,
    unit: '%',
    interpretation:
      debtToAssetsValue !== null
        ? debtToAssetsValue <= 0.4
          ? 'Conservador: Menos del 40% de los activos financiados con deuda.'
          : debtToAssetsValue <= 0.6
            ? 'Moderado: 40-60% de los activos financiados con deuda.'
            : 'Alto: Más del 60% de los activos financiados con deuda.'
        : 'No disponible: Datos insuficientes.',
    category: 'solvency',
  });

  // Equity Ratio = Total Equity / Total Assets
  const equityRatioValue = data.totalAssets > 0 ? data.totalEquity / data.totalAssets : null;
  ratios.push({
    id: 'equity_ratio',
    name: 'Ratio de Capital Propio',
    description: 'Porcentaje de los activos financiados con capital propio',
    formula: 'Total Equity ÷ Total Assets',
    value: equityRatioValue,
    unit: '%',
    interpretation:
      equityRatioValue !== null
        ? equityRatioValue >= 0.6
          ? 'Sólido: Más del 60% de los activos financiados con capital propio.'
          : equityRatioValue >= 0.4
            ? 'Moderado: 40-60% financiados con capital propio.'
            : 'Bajo: Menos del 40% de los activos financiados con capital propio.'
        : 'No disponible: Datos insuficientes.',
    category: 'solvency',
  });

  // --- PROFITABILITY RATIOS ---

  // Gross Profit Margin = (Revenue - COGS) / Revenue
  const grossProfitMarginValue = data.totalRevenue > 0 ? (data.totalRevenue - data.costOfGoodsSold) / data.totalRevenue : null;
  ratios.push({
    id: 'gross_profit_margin',
    name: 'Margen Bruto de Ganancia',
    description: 'Porcentaje de ingreso que excede el costo de bienes vendidos',
    formula: '(Revenue - COGS) ÷ Revenue',
    value: grossProfitMarginValue,
    unit: '%',
    interpretation:
      grossProfitMarginValue !== null
        ? grossProfitMarginValue >= 0.4
          ? 'Sólido: El 40% o más del ingreso es ganancia bruta.'
          : grossProfitMarginValue >= 0.25
            ? 'Aceptable: El 25-40% del ingreso es ganancia bruta.'
            : 'Debe mejorar: Menos del 25% del ingreso es ganancia bruta.'
        : 'No disponible: Ingreso es cero o datos insuficientes.',
    category: 'profitability',
  });

  // Net Profit Margin = Net Income / Revenue
  const netProfitMarginValue = data.totalRevenue > 0 ? data.netIncome / data.totalRevenue : null;
  ratios.push({
    id: 'net_profit_margin',
    name: 'Margen Neto de Ganancia',
    description: 'Porcentaje de cada Lempira de ventas que se traduce en utilidad neta',
    formula: 'Net Income ÷ Revenue',
    value: netProfitMarginValue,
    unit: '%',
    interpretation:
      netProfitMarginValue !== null
        ? netProfitMarginValue >= 0.20
          ? 'Sólido: 20% o más de cada lempira de ventas es utilidad neta.'
          : netProfitMarginValue >= 0.10
            ? 'Aceptable: 10-20% de utilidad neta sobre ventas.'
            : 'Bajo: Menos del 10% de utilidad neta sobre ventas.'
        : 'No disponible: Datos insuficientes.',
    category: 'profitability',
  });

  // Return on Assets = Net Income / Total Assets
  const returnOnAssetsValue = data.totalAssets > 0 ? data.netIncome / data.totalAssets : null;
  ratios.push({
    id: 'return_on_assets',
    name: 'Retorno sobre Activos (ROA)',
    description: 'Qué tan eficientemente la empresa usa sus activos para generar utilidad',
    formula: 'Net Income ÷ Total Assets',
    value: returnOnAssetsValue,
    unit: '%',
    interpretation:
      returnOnAssetsValue !== null
        ? returnOnAssetsValue >= 0.15
          ? 'Sólido: 15% o más de retorno sobre sus activos.'
          : returnOnAssetsValue >= 0.05
            ? 'Aceptable: 5-15% de retorno sobre activos.'
            : 'Bajo: Menos del 5% de retorno sobre activos.'
        : 'No disponible: Datos insuficientes.',
    category: 'profitability',
  });

  // Return on Equity = Net Income / Total Equity
  const returnOnEquityValue = data.totalEquity > 0 ? data.netIncome / data.totalEquity : null;
  ratios.push({
    id: 'return_on_equity',
    name: 'Retorno sobre Capital Propio (ROE)',
    description: 'Qué tan eficientemente el capital propio genera utilidad',
    formula: 'Net Income ÷ Total Equity',
    value: returnOnEquityValue,
    unit: '%',
    interpretation:
      returnOnEquityValue !== null
        ? returnOnEquityValue >= 0.25
          ? 'Excelente: 25% o más de retorno sobre el capital propio.'
          : returnOnEquityValue >= 0.15
            ? 'Sólido: 15-25% de retorno sobre capital propio.'
            : 'Bajo: Menos del 15% de retorno sobre capital propio.'
        : 'No disponible: Datos insuficientes.',
    category: 'profitability',
  });

  // --- EFFICIENCY RATIOS ---

  // Current Asset Turnover = Revenue / Total Assets
  const currentAssetTurnoverValue = data.totalAssets > 0 ? data.totalRevenue / data.totalAssets : null;
  ratios.push({
    id: 'current_asset_turnover',
    name: 'Rotación de Activos Corrientes',
    description: 'Veces que los activos corrientes se convierten en ventas durante el período',
    formula: 'Revenue ÷ Total Assets',
    value: currentAssetTurnoverValue,
    unit: 'x',
    interpretation:
      currentAssetTurnoverValue !== null
        ? currentAssetTurnoverValue >= 2.0
          ? 'Sólido: Los activos corrientes se rotan 2 veces o más al año.'
          : currentAssetTurnoverValue >= 1.0
            ? 'Moderado: Los activos corrientes se rotan menos de 2 veces al año.'
            : 'Bajo: Los activos no se están utilizando eficientemente.'
        : 'No disponible: Datos insuficientes.',
    category: 'efficiency',
  });

  // Working Capital = Current Assets - Current Liabilities
  const workingCapitalValue = data.currentAssets - data.currentLiabilities;
  ratios.push({
    id: 'working_capital',
    name: 'Capital de Trabajo',
    description: 'Excedente de activos corrientes sobre pasivos corrientes',
    formula: 'Current Assets − Current Liabilities',
    value: workingCapitalValue,
    unit: 'Lempiras (HNL)',
    interpretation:
      workingCapitalValue !== null && workingCapitalValue >= 0
        ? 'Positivo: La empresa tiene excedente de liquidez a corto plazo.'
        : workingCapitalValue !== null && workingCapitalValue < 0
          ? 'Negativo: La empresa tiene déficit de liquidez a corto plazo.'
          : 'No disponible: Datos insuficientes.',
    category: 'health',
  });

  // --- HEALTH INDICATORS ---

  // Operating Cash Flow approximation (simplified)
  // Using the net income as a proxy when cash flow data not available
  const operatingCashFlowValue = data.netIncome;

  ratios.push({
    id: 'operating_cash_flow',
    name: 'Utilidad Operativa (Aproximación)',
    description: 'Utilidad neta como indicador de generación de efectivo operativo',
    formula: 'Net Income',
    value: operatingCashFlowValue,
    unit: 'Lempiras (HNL)',
    interpretation:
      operatingCashFlowValue !== null && operatingCashFlowValue >= 0
        ? 'Positiva: La empresa genera utilidad neta.'
        : operatingCashFlowValue !== null && operatingCashFlowValue < 0
          ? 'Negativa: La empresa reporta pérdida neta.'
          : 'No disponible: Datos insuficientes.',
    category: 'health',
  });

  return ratios;
}

/**
 * Obtiene datos de razones financieras consultando la API del sistema
 * y calculando las razones a partir de los datos contables reales
 */
export async function fetchAndCalculateRatios(
  tenantId: string,
  period: string = new Date().toISOString().slice(0, 7)
): Promise<FinancialRatio[]> {
  try {
    // Fetch trial balance for the period
    const tbRes = await fetch(
      `/api/accounting/trial-balance?tenantId=${tenantId}&period=${period}`,
      { cache: 'no-cache' }
    );

    if (!tbRes.ok) {
      throw new Error('No se pudo obtener la balanza de comprobación');
    }

    const trialBalance = await tbRes.json();

    // Fetch P&L data (revenue and expenses)
    const pnlRes = await fetch(
      `/api/reports/pnl?startDate=${period}-01&endDate=${period}-31&tenantId=${tenantId}`,
      { cache: 'no-cache' }
    );

    let pnlData = { revenue: [], expenses: [] };
    if (pnlRes.ok) {
      pnlData = await pnlRes.json();
    }

    // Initialize data accumulators
    let currentAssets = 0;
    let totalAssets = 0;
    let currentLiabilities = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;
    let totalRevenue = 0;
    let totalExpenses = 0;
    let netIncome = 0;
    let costOfGoodsSold = 0;
    let currentInventory = 0;
    let accountsReceivable = 0;
    let accountsPayable = 0;

    // Process trial balance accounts
    for (const account of trialBalance.accounts) {
      const amount = account.endingBalance || 0;
      const type = account.type;

      // Accumulate by category
      if (type === 'ASSET') {
        totalAssets += amount;
        if (account.code.startsWith('1')) { // Assuming code 1xxx = Current Assets
          currentAssets += amount;
        }
      } else if (type === 'LIABILITY') {
        totalLiabilities += Math.abs(amount); // Liabilities normally have credit balances
        if (account.code.startsWith('2') || account.code.startsWith('3')) { // Current liabilities
          currentLiabilities += Math.abs(amount);
        }
      } else if (type === 'EQUITY') {
        totalEquity += Math.abs(amount);
      }
    }

    // Process P&L revenue
    for (const rev of pnlData.revenue) {
      totalRevenue += rev.total || 0;
    }

    // Process P&L expenses
    for (const exp of pnlData.expenses) {
      totalExpenses += Math.abs(exp.total || 0);
    }

    // Calculate net income
    netIncome = totalRevenue - totalExpenses;

    // For COGS, inventory, AR, AP - we need to look at specific accounts
    // This is a simplified approach - in a full implementation, we'd query specific accounts
    // For now, use reasonable defaults based on the data we have
    costOfGoodsSold = totalExpenses * 0.6; // Estimate: 60% of expenses as COGS (rough estimate)
    currentInventory = 0; // Would need specific inventory account
    accountsReceivable = 0; // Would need specific accounts receivable account
    accountsPayable = 0; // Would need specific accounts payable account

    // Build data object
    const data: FinancialRatiosData = {
      currentAssets,
      totalAssets,
      currentLiabilities,
      totalLiabilities,
      totalEquity,
      totalRevenue,
      totalExpenses,
      netIncome,
      costOfGoodsSold,
      currentInventory,
      accountsReceivable,
      accountsPayable,
    };

    // Calculate all ratios
    return calculateAllRatios(data);

  } catch (error) {
    console.error('Error fetching and calculating financial ratios:', error);
    return [];
  }
}