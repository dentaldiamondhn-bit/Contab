import { db } from '@/lib/db';

// Withholding types
export type WithholdingType = 'PROFESSIONAL_SERVICES_1%' | 'PROFESSIONAL_SERVICES_12_5%' | 'OTHER';

// Withholding status
export type WithholdingStatus = 'PENDING' | 'PAID' | 'CANCELLED';

// Withholding interface
export interface Withholding {
  id: string;
  type: WithholdingType;
  invoiceNumber: string;
  invoiceDate: Date;
  providerName: string;
  providerRTN: string;
  providerAddress?: string;
  amount: number; // Base amount in cents
  withholdingRate: number; // 0.01 or 0.125
  withholdingAmount: number; // Calculated withholding in cents
  period: string; // Format: "YYYY-MM"
  description: string;
  status: WithholdingStatus;
  paymentDate?: Date;
  receiptNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Withholding calculation result
export interface WithholdingCalculation {
  baseAmount: number;
  withholdingRate: number;
  withholdingAmount: number;
  netAmount: number;
  type: WithholdingType;
  description: string;
}

// Create a new withholding
export async function createWithholding(data: Omit<Withholding, 'id' | 'withholdingAmount' | 'status' | 'createdAt' | 'updatedAt'>): Promise<Withholding> {
  const withholdingAmount = Math.round(data.amount * data.withholdingRate);
  
  const withholding = await (db as any).withholding.create({
    data: {
      ...data,
      withholdingAmount,
      status: 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  return withholding;
}

// Calculate withholding based on amount and type
export function calculateWithholding(amount: number, type: WithholdingType): WithholdingCalculation {
  let withholdingRate: number;
  let description: string;

  switch (type) {
    case 'PROFESSIONAL_SERVICES_1%':
      withholdingRate = 0.01; // 1%
      description = 'Retención 1% - Servicios Profesionales';
      break;
    case 'PROFESSIONAL_SERVICES_12_5%':
      withholdingRate = 0.125; // 12.5%
      description = 'Retención 12.5% - Servicios Profesionales';
      break;
    default:
      withholdingRate = 0.01; // Default 1%
      description = 'Retención - Otros';
      break;
  }

  const withholdingAmount = Math.round(amount * withholdingRate);
  const netAmount = amount - withholdingAmount;

  return {
    baseAmount: amount,
    withholdingRate,
    withholdingAmount,
    netAmount,
    type,
    description,
  };
}

// Get all withholdings with filtering
export async function getWithholdings(filters: {
  status?: WithholdingStatus;
  type?: WithholdingType;
  period?: string;
  providerRTN?: string;
} = {}): Promise<Withholding[]> {
  const where: any = {};
  
  if (filters.status) where.status = filters.status;
  if (filters.type) where.type = filters.type;
  if (filters.period) where.period = filters.period;
  if (filters.providerRTN) where.providerRTN = filters.providerRTN;

  return await (db as any).withholding.findMany({
    where,
    orderBy: [
      { createdAt: 'desc' }
    ],
  });
}

// Get withholding by ID
export async function getWithholdingById(id: string): Promise<Withholding | null> {
  return await (db as any).withholding.findUnique({
    where: { id },
  });
}

// Update withholding status
export async function updateWithholdingStatus(
  id: string, 
  status: WithholdingStatus,
  paymentDate?: Date,
  receiptNumber?: string
): Promise<Withholding> {
  const updateData: any = {
    status,
    updatedAt: new Date(),
  };

  if (paymentDate) updateData.paymentDate = paymentDate;
  if (receiptNumber) updateData.receiptNumber = receiptNumber;

  return await (db as any).withholding.update({
    where: { id },
    data: updateData,
  });
}

// Get withholding statistics
export interface WithholdingStatistics {
  totalWithholdings: number;
  totalAmount: number;
  totalWithheld: number;
  pendingCount: number;
  pendingAmount: number;
  paidCount: number;
  paidAmount: number;
  byType: {
    [key: string]: {
      count: number;
      amount: number;
      withheld: number;
    };
  };
  byPeriod: {
    [key: string]: {
      count: number;
      amount: number;
      withheld: number;
    };
  };
}

export async function getWithholdingStatistics(filters?: {
  startDate?: Date;
  endDate?: Date;
}): Promise<WithholdingStatistics> {
  const where: any = {};
  
  if (filters?.startDate || filters?.endDate) {
    where.invoiceDate = {};
    if (filters.startDate) where.invoiceDate.gte = filters.startDate;
    if (filters.endDate) where.invoiceDate.lte = filters.endDate;
  }

  const withholdings = await (db as any).withholding.findMany({
    where,
  });

  const stats: WithholdingStatistics = {
    totalWithholdings: withholdings.length,
    totalAmount: withholdings.reduce((sum: number, w: Withholding) => sum + w.amount, 0),
    totalWithheld: withholdings.reduce((sum: number, w: Withholding) => sum + w.withholdingAmount, 0),
    pendingCount: withholdings.filter((w: Withholding) => w.status === 'PENDING').length,
    pendingAmount: withholdings.filter((w: Withholding) => w.status === 'PENDING').reduce((sum: number, w: Withholding) => sum + w.withholdingAmount, 0),
    paidCount: withholdings.filter((w: Withholding) => w.status === 'PAID').length,
    paidAmount: withholdings.filter((w: Withholding) => w.status === 'PAID').reduce((sum: number, w: Withholding) => sum + w.withholdingAmount, 0),
    byType: {},
    byPeriod: {},
  };

  // Group by type
  withholdings.forEach((w: Withholding) => {
    if (!stats.byType[w.type]) {
      stats.byType[w.type] = { count: 0, amount: 0, withheld: 0 };
    }
    stats.byType[w.type].count++;
    stats.byType[w.type].amount += w.amount;
    stats.byType[w.type].withheld += w.withholdingAmount;
  });

  // Group by period
  withholdings.forEach((w: Withholding) => {
    if (!stats.byPeriod[w.period]) {
      stats.byPeriod[w.period] = { count: 0, amount: 0, withheld: 0 };
    }
    stats.byPeriod[w.period].count++;
    stats.byPeriod[w.period].amount += w.amount;
    stats.byPeriod[w.period].withheld += w.withholdingAmount;
  });

  return stats;
}

// Generate withholding receipt data for PDF
export function generateWithholdingReceipt(withholding: Withholding): {
  receiptNumber: string;
  receiptDate: Date;
  provider: {
    name: string;
    rtn: string;
    address?: string;
  };
  invoice: {
    number: string;
    date: Date;
    amount: number;
  };
  withholding: {
    type: string;
    rate: number;
    amount: number;
    description: string;
  };
  totals: {
    baseAmount: number;
    withholdingAmount: number;
    netAmount: number;
  };
  period: string;
} {
  const receiptNumber = withholding.receiptNumber || `RT-${withholding.id.slice(-8).toUpperCase()}`;
  
  return {
    receiptNumber,
    receiptDate: withholding.paymentDate || new Date(),
    provider: {
      name: withholding.providerName,
      rtn: withholding.providerRTN,
      address: withholding.providerAddress,
    },
    invoice: {
      number: withholding.invoiceNumber,
      date: withholding.invoiceDate,
      amount: withholding.amount,
    },
    withholding: {
      type: withholding.type,
      rate: withholding.withholdingRate,
      amount: withholding.withholdingAmount,
      description: withholding.description,
    },
    totals: {
      baseAmount: withholding.amount,
      withholdingAmount: withholding.withholdingAmount,
      netAmount: withholding.amount - withholding.withholdingAmount,
    },
    period: withholding.period,
  };
}

// Format withholding rate for display
export function formatWithholdingRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

// Format withholding type for display
export function formatWithholdingType(type: WithholdingType): string {
  switch (type) {
    case 'PROFESSIONAL_SERVICES_1%':
      return 'Servicios Profesionales (1%)';
    case 'PROFESSIONAL_SERVICES_12_5%':
      return 'Servicios Profesionales (12.5%)';
    default:
      return 'Otros';
  }
}

// Validate RTN format (Honduran)
export function validateRTN(rtn: string): boolean {
  const rtnPattern = /^\d{8}-\d{1}$/;
  if (!rtnPattern.test(rtn)) {
    return false;
  }

  const [digits, checkDigit] = rtn.split('-');
  const weights = [3, 7, 13, 17, 19, 23, 29, 37];
  
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    sum += parseInt(digits[i]) * weights[i];
  }
  
  const calculatedCheckDigit = (11 - (sum % 11)) % 11;
  const expectedCheckDigit = calculatedCheckDigit === 10 ? 0 : calculatedCheckDigit;
  
  return parseInt(checkDigit) === expectedCheckDigit;
}

// Get current period (YYYY-MM)
export function getCurrentPeriod(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

// Format currency for display
export function formatCurrency(amount: number, currency: string = 'HNL'): string {
  return new Intl.NumberFormat('es-HN', {
    style: 'currency',
    currency: currency === 'USD' ? 'USD' : 'HNL',
    minimumFractionDigits: 2,
  }).format(amount / 100); // Convert from cents to main currency
}

// Calculate monthly withholding totals
export async function getMonthlyWithholdingTotals(year: number): Promise<{
  month: number;
  totalAmount: number;
  totalWithheld: number;
  count: number;
}[]> {
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);

  const withholdings = await (db as any).withholding.findMany({
    where: {
      invoiceDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { invoiceDate: 'asc' },
  });

  // Group by month
  const monthlyData = new Map<number, {
    totalAmount: number;
    totalWithheld: number;
    count: number;
  }>();

  withholdings.forEach((w: Withholding) => {
    const month = w.invoiceDate.getMonth();
    const current = monthlyData.get(month) || { totalAmount: 0, totalWithheld: 0, count: 0 };
    
    current.totalAmount += w.amount;
    current.totalWithheld += w.withholdingAmount;
    current.count++;
    
    monthlyData.set(month, current);
  });

  // Convert to array and ensure all months are present
  const result = [];
  for (let month = 0; month < 12; month++) {
    const data = monthlyData.get(month) || { totalAmount: 0, totalWithheld: 0, count: 0 };
    result.push({
      month,
      ...data,
    });
  }

  return result;
}

// Export withholdings to CSV format
export function exportWithholdingsToCSV(withholdings: Withholding[]): string {
  const headers = [
    'Número de Recibo',
    'Fecha de Factura',
    'Número de Factura',
    'Nombre del Proveedor',
    'RTN',
    'Tipo de Retención',
    'Tasa',
    'Monto Base',
    'Monto Retenido',
    'Estado',
    'Período',
  ];

  const rows = withholdings.map(w => [
    w.receiptNumber || '',
    w.invoiceDate.toISOString().split('T')[0],
    w.invoiceNumber,
    w.providerName,
    w.providerRTN,
    formatWithholdingType(w.type),
    formatWithholdingRate(w.withholdingRate),
    formatCurrency(w.amount),
    formatCurrency(w.withholdingAmount),
    w.status,
    w.period,
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');

  return csvContent;
}
