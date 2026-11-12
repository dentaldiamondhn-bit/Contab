export interface Receivable {
  id: string;
  customerName: string;
  amount: number;
  dueDate: Date;
  invoiceNumber: string;
  probability: number;
}

export interface Payable {
  id: string;
  vendorName: string;
  amount: number;
  dueDate: Date;
  invoiceNumber: string;
  priority: 'high' | 'medium' | 'low';
}

export interface DailyCashFlow {
  date: string;
  openingBalance: number;
  inflows: number;
  outflows: number;
  closingBalance: number;
  netFlow: number;
}

export interface CashFlowProjection {
  startDate: Date;
  endDate: Date;
  currentBalance: number;
  dailyFlows: DailyCashFlow[];
  totalInflows: number;
  totalOutflows: number;
  projectedBalance: number;
  minimumBalance: number;
  maximumBalance: number;
  cashGapDays: number;
}