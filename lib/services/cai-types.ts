// CAI types - safe for client components
export type CAIStatus = 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'EXHAUSTED';

export interface CAI {
  id: string;
  caiCode: string;
  establishmentCode: string;
  emissionPointCode: string;
  rangeStart: number;
  rangeEnd: number;
  currentNumber: number;
  expirationDate: Date;
  status: CAIStatus;
  companyId?: string;
  companyName?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CAIAlert {
  id: string;
  caiId: string;
  type: 'EXPIRING' | 'EXPIRED' | 'RANGE_LOW' | 'RANGE_EXHAUSTED';
  message: string;
  read: boolean;
  createdAt: Date;
}

export interface CAIStatistics {
  totalCAIs: number;
  activeCAIs: number;
  expiringCAIs: number;
  expiredCAIs: number;
  exhaustedCAIs: number;
  totalRangeAvailable: number;
  totalRangeUsed: number;
  usagePercentage: number;
}