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
  breakEvenUnits: number;
  breakEvenRevenue: number;
  marginOfSafety: number;
  marginOfSafetyPercentage: number;
}

export interface BreakEvenScenario {
  name: string;
  pricePerUnit: number;
  variableCostPerUnit: number;
  fixedCosts: number;
  expectedUnits: number;
  breakEvenUnits: number;
  profitAtExpected: number;
  isProfitable: boolean;
}

export interface BreakEvenDashboardData {
  current: BreakEvenAnalysis;
  scenarios: BreakEvenScenario[];
  lastUpdated: Date;
}