// Voucher types for professional accounting and auditing
export const VOUCHER_TYPES = {
  INGRESO: 'INGRESO',    // Income/Revenue vouchers
  EGRESO: 'EGRESO',      // Expense/Payment vouchers  
  DIARIO: 'DIARIO',      // General journal entries
  AJUSTE: 'AJUSTE'       // Adjusting entries
} as const;

export type VoucherType = typeof VOUCHER_TYPES[keyof typeof VOUCHER_TYPES];

// Voucher type descriptions for UI display
export const VOUCHER_TYPE_DESCRIPTIONS: Record<VoucherType, string> = {
  [VOUCHER_TYPES.INGRESO]: 'Póliza de Ingresos',
  [VOUCHER_TYPES.EGRESO]: 'Póliza de Egresos', 
  [VOUCHER_TYPES.DIARIO]: 'Póliza Diaria',
  [VOUCHER_TYPES.AJUSTE]: 'Póliza de Ajuste'
};

// Get next voucher number for a given type within the current month
export async function getNextVoucherNumber(voucherType: VoucherType, transactionDate: Date): Promise<number> {
  const { db } = await import('@/lib/db');
  
  // Helper functions for date calculations
  const startOfMonth = (date: Date) => {
    const d = new Date(date);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const endOfMonth = (date: Date) => {
    const d = new Date(date);
    d.setMonth(d.getMonth() + 1);
    d.setDate(0);
    d.setHours(23, 59, 59, 999);
    return d;
  };
  
  // Count existing vouchers of this type in the current month
  const count = await db.transaction.count({
    where: { 
      voucherType,
      date: {
        gte: startOfMonth(transactionDate),
        lte: endOfMonth(transactionDate)
      }
    }
  });
  
  return count + 1;
}

// Format voucher display (e.g., "INGRESO-001")
export function formatVoucher(voucherType: VoucherType, voucherNumber: number): string {
  return `${voucherType}-${voucherNumber.toString().padStart(3, '0')}`;
}

// Parse voucher string back to type and number
export function parseVoucher(voucherString: string): { type: VoucherType; number: number } | null {
  const match = voucherString.match(/^(INGRESO|EGRESO|DIARIO|AJUSTE)-(\d+)$/);
  
  if (!match) return null;
  
  const [, type, numberStr] = match;
  return {
    type: type as VoucherType,
    number: parseInt(numberStr, 10)
  };
}

// Validate voucher type
export function isValidVoucherType(type: string): type is VoucherType {
  return Object.values(VOUCHER_TYPES).includes(type as VoucherType);
}
