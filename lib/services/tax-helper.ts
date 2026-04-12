import { TaxConfigService, TaxConfigWithAccount } from '@/lib/services/tax-config';
import { ISVCalculator, ISVCategory } from '@/lib/tax/isv-config';

export interface JournalEntry {
  accountId: string;
  amount: number; // in cents (positive for debit, negative for credit)
  description?: string;
  taxable?: boolean;
  taxEntryId?: string; // Reference to the generated tax entry
}

export interface TaxableEntry {
  entry: JournalEntry;
  taxConfig?: TaxConfigWithAccount;
  taxAmount?: number; // in cents
  taxCategory?: ISVCategory;
}

export interface TaxHelperResult {
  entries: JournalEntry[];
  taxableEntries: TaxableEntry[];
  totalTaxAmount: number; // in cents
  summary: {
    subtotal: number; // in cents
    totalTax: number; // in cents
    total: number; // in cents
  };
}

export class TaxHelper {
  /**
   * Processes journal entries and automatically adds tax entries for taxable lines
   */
  static async processTaxableEntries(
    entries: JournalEntry[],
    description?: string
  ): Promise<TaxHelperResult> {
    const taxableEntries: TaxableEntry[] = [];
    const processedEntries: JournalEntry[] = [];
    let totalTaxAmount = 0;

    // Get active tax configurations
    const taxConfigs = await TaxConfigService.getActiveTaxConfigs();

    for (const entry of entries) {
      // Create a copy of the entry without tax-specific fields
      const cleanEntry = { ...entry };
      delete cleanEntry.taxable;
      delete cleanEntry.taxEntryId;

      if (entry.taxable && entry.amount > 0) {
        // This is a taxable debit entry, calculate tax
        const taxResult = await this.calculateTaxForEntry(
          entry,
          taxConfigs,
          description
        );

        if (taxResult) {
          taxableEntries.push(taxResult);
          processedEntries.push(cleanEntry);
          
          // Add the tax entry (credit to tax payable account)
          const taxEntry: JournalEntry = {
            accountId: taxResult.taxConfig!.accountId,
            amount: -taxResult.taxAmount!, // Credit (negative)
            description: `ISV (${(taxResult.taxConfig!.rate * 100).toFixed(1)}%) - ${entry.description || 'Servicio gravable'}`
          };
          
          processedEntries.push(taxEntry);
          totalTaxAmount += taxResult.taxAmount!;
        } else {
          // No tax config found, keep original entry
          processedEntries.push(cleanEntry);
        }
      } else {
        // Non-taxable entry, keep as is
        processedEntries.push(cleanEntry);
      }
    }

    // Calculate summary
    const subtotal = entries.reduce((sum, entry) => sum + entry.amount, 0);
    const total = subtotal - totalTaxAmount; // Subtract tax credits

    return {
      entries: processedEntries,
      taxableEntries,
      totalTaxAmount,
      summary: {
        subtotal,
        totalTax: totalTaxAmount,
        total
      }
    };
  }

  /**
   * Calculates tax for a single entry
   */
  static async calculateTaxForEntry(
    entry: JournalEntry,
    taxConfigs: TaxConfigWithAccount[],
    description?: string
  ): Promise<TaxableEntry | null> {
    // Auto-categorize tax based on description
    let taxCategory: ISVCategory;
    if (description) {
      taxCategory = ISVCalculator.autoCategorizeItem(description);
    } else {
      taxCategory = ISVCalculator.getStandardCategory();
    }

    // Find matching tax config by rate
    const taxRate = ISVCalculator.getISVRate(taxCategory);
    const taxConfig = taxConfigs.find(config => config.rate === taxRate);

    if (!taxConfig) {
      console.warn(`No tax configuration found for rate: ${taxRate}`);
      return null;
    }

    // Calculate tax amount (15% or 18% of the entry amount)
    const taxAmount = Math.round(entry.amount * taxConfig.rate);

    return {
      entry,
      taxConfig,
      taxAmount,
      taxCategory
    };
  }

  /**
   * Toggles taxable status for an entry and recalculates
   */
  static async toggleTaxableStatus(
    entries: JournalEntry[],
    entryIndex: number,
    description?: string
  ): Promise<TaxHelperResult> {
    const updatedEntries = [...entries];
    const targetEntry = updatedEntries[entryIndex];

    if (!targetEntry) {
      throw new Error('Entry not found');
    }

    // Toggle taxable status
    targetEntry.taxable = !targetEntry.taxable;

    // Re-process all entries
    return await this.processTaxableEntries(updatedEntries, description);
  }

  /**
   * Validates that entries balance after tax processing
   */
  static validateBalance(entries: JournalEntry[]): boolean {
    const sum = entries.reduce((total, entry) => total + entry.amount, 0);
    return sum === 0;
  }

  /**
   * Gets available tax rates for UI display
   */
  static async getAvailableTaxRates(): Promise<TaxConfigWithAccount[]> {
    return await TaxConfigService.getActiveTaxConfigs();
  }

  /**
   * Estimates tax amount for preview purposes
   */
  static async estimateTax(
    amount: number,
    description?: string
  ): Promise<{ taxAmount: number; taxRate: number; taxConfig: TaxConfigWithAccount }> {
    const taxConfigs = await TaxConfigService.getActiveTaxConfigs();
    
    // Auto-categorize
    let taxCategory: ISVCategory;
    if (description) {
      taxCategory = ISVCalculator.autoCategorizeItem(description);
    } else {
      taxCategory = ISVCalculator.getStandardCategory();
    }

    const taxRate = ISVCalculator.getISVRate(taxCategory);
    const taxConfig = taxConfigs.find(config => config.rate === taxRate);

    if (!taxConfig) {
      throw new Error('No tax configuration found');
    }

    const taxAmount = Math.round(amount * taxConfig.rate);

    return {
      taxAmount,
      taxRate,
      taxConfig
    };
  }

  /**
   * Creates a balanced transaction with tax entries
   */
  static async createBalancedTransaction(
    entries: JournalEntry[],
    description?: string
  ): Promise<TaxHelperResult> {
    const result = await this.processTaxableEntries(entries, description);

    // Check if entries balance
    if (!this.validateBalance(result.entries)) {
      const imbalance = result.entries.reduce((sum, entry) => sum + entry.amount, 0);
      
      if (imbalance !== 0) {
        // Add a balancing entry to make it zero
        const balancingEntry: JournalEntry = {
          accountId: '', // This should be set to a balancing account
          amount: -imbalance,
          description: 'Ajuste de balance'
        };
        
        result.entries.push(balancingEntry);
      }
    }

    return result;
  }
}

