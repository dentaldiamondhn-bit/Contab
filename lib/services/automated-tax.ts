import { TaxConfigService, TaxConfigWithAccount } from '@/lib/services/tax-config';
import { ISVCalculator, ISVCategory } from '@/lib/tax/isv-config';

export interface PatientBillEntry {
  accountId: string;
  amount: number; // in cents
  description?: string;
}

export interface AutomatedTaxCalculation {
  subtotal: number; // in cents
  taxAmount: number; // in cents
  total: number; // in cents
  taxRate: number;
  taxConfig: TaxConfigWithAccount;
  journalEntries: Array<{
    accountId: string;
    amount: number; // in cents (positive for debit, negative for credit)
    description: string;
  }>;
}

export class AutomatedTaxService {
  /**
   * Creates automated journal entries for a patient bill with tax
   * Generates three entries:
   * 1. Debit: Accounts Receivable/Patient Account (total amount)
   * 2. Credit: Revenue Account (subtotal amount)
   * 3. Credit: Tax Payable Account (tax amount)
   */
  static async createPatientBillEntries(
    subtotal: number, // in cents
    revenueAccountId: string,
    receivableAccountId: string,
    patientDescription?: string,
    autoCategorizeTax: boolean = true
  ): Promise<AutomatedTaxCalculation> {
    
    // Auto-categorize tax based on description or use standard rate
    let taxCategory: ISVCategory;
    if (autoCategorizeTax && patientDescription) {
      taxCategory = ISVCalculator.autoCategorizeItem(patientDescription);
    } else {
      taxCategory = ISVCalculator.getStandardCategory();
    }

    // Calculate ISV with tax config
    const calculation = await ISVCalculator.calculateISV(
      subtotal / 100, // Convert to dollars for calculation
      taxCategory,
      true // Include tax config
    );

    if (!calculation.taxConfig) {
      throw new Error('No tax configuration found for the calculated rate');
    }

    // Convert amounts back to cents
    const subtotalCents = subtotal;
    const taxAmountCents = Math.round(calculation.isvAmount * 100);
    const totalCents = subtotalCents + taxAmountCents;

    // Generate the three journal entries
    const journalEntries = [
      {
        accountId: receivableAccountId,
        amount: totalCents, // Debit (positive) - Total amount receivable
        description: `Factura paciente - ${patientDescription || 'Servicios médicos'}`
      },
      {
        accountId: revenueAccountId,
        amount: -subtotalCents, // Credit (negative) - Revenue portion
        description: `Ingresos por servicios médicos - ${patientDescription || 'Servicios médicos'}`
      },
      {
        accountId: calculation.taxConfig.accountId,
        amount: -taxAmountCents, // Credit (negative) - Tax portion
        description: `ISV por pagar (${(calculation.isvRate * 100).toFixed(1)}%) - ${patientDescription || 'Servicios médicos'}`
      }
    ];

    return {
      subtotal: subtotalCents,
      taxAmount: taxAmountCents,
      total: totalCents,
      taxRate: calculation.isvRate,
      taxConfig: calculation.taxConfig!,
      journalEntries
    };
  }

  /**
   * Validates that the journal entries balance to zero
   */
  static validateEntriesBalance(entries: Array<{ amount: number }>): boolean {
    const sum = entries.reduce((total, entry) => total + entry.amount, 0);
    return sum === 0;
  }

  /**
   * Creates a complete transaction data object for patient billing
   */
  static async createPatientBillTransaction(
    subtotal: number,
    revenueAccountId: string,
    receivableAccountId: string,
    patientName?: string,
    description?: string,
    date?: string
  ) {
    const calculation = await this.createPatientBillEntries(
      subtotal,
      revenueAccountId,
      receivableAccountId,
      description,
      true
    );

    // Validate the entries balance
    if (!this.validateEntriesBalance(calculation.journalEntries)) {
      throw new Error('Journal entries do not balance to zero');
    }

    return {
      description: `Factura paciente: ${patientName || 'Paciente'} - ${description || 'Servicios médicos'}`,
      date: date || new Date().toISOString().split('T')[0],
      voucherType: 'INGRESO' as const,
      entries: calculation.journalEntries.map(entry => ({
        accountId: entry.accountId,
        amount: entry.amount
      })),
      calculation // Include the calculation details for reference
    };
  }

  /**
   * Gets available revenue accounts for patient billing
   */
  static async getRevenueAccounts() {
    const { db } = await import('@/lib/db');
    return await db.account.findMany({
      where: {
        type: 'REVENUE'
      },
      select: {
        id: true,
        name: true,
        code: true,
        description: true
      },
      orderBy: {
        code: 'asc'
      }
    });
  }

  /**
   * Gets available receivable accounts for patient billing
   */
  static async getReceivableAccounts() {
    const { db } = await import('@/lib/db');
    return await db.account.findMany({
      where: {
        type: 'ASSET',
        name: {
          contains: 'cuentas por cobrar'
        }
      },
      select: {
        id: true,
        name: true,
        code: true,
        description: true
      },
      orderBy: {
        code: 'asc'
      }
    });
  }
}
