// Withholding types - safe for client components
export type WithholdingType = 'PROFESSIONAL_SERVICES_1%' | 'PROFESSIONAL_SERVICES_12_5%' | 'OTHER';

export type WithholdingStatus = 'PENDING' | 'PAID' | 'CANCELLED';

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

export interface WithholdingStatistics {
  totalWithholdings: number;
  totalAmount: number;
  totalWithholdingAmount: number;
  byType: Record<WithholdingType, { count: number; amount: number; withholdingAmount: number }>;
  byStatus: Record<WithholdingStatus, number>;
}

export interface WithholdingCalculation {
  withholdingRate: number;
  description: string;
  withholdingAmount: number;
}

export interface WithholdingReceipt {
  receiptNumber: string;
  receiptDate: Date;
  provider: {
    name: string;
    rtn: string;
    address: string;
  };
  invoice: {
    number: string;
    date: Date;
    amount: number;
  };
  withholding: {
    rate: number;
    amount: number;
  };
  totals: {
    subtotal: number;
    withholding: number;
    total: number;
  };
}