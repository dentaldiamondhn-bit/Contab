import { TaxConfigService, TaxConfigWithAccount } from '@/lib/services/tax-config';

export interface ISVRates {
  standard: number; // 15% for most goods and services
  special: number;  // 18% for alcohol and tobacco
}

export interface ISVCategory {
  id: string;
  name: string;
  rate: keyof ISVRates;
  description: string;
}

export const ISV_RATES: ISVRates = {
  standard: 0.15, // 15%
  special: 0.18   // 18%
};

export const ISV_CATEGORIES: ISVCategory[] = [
  {
    id: 'standard',
    name: 'ISV Estándar (15%)',
    rate: 'standard',
    description: 'Aplicable a la mayoría de bienes y servicios'
  },
  {
    id: 'special',
    name: 'ISV Especial (18%)',
    rate: 'special',
    description: 'Aplicable a alcohol y tabaco'
  }
];

export interface ISVCalculation {
  subtotal: number;
  isvAmount: number;
  isvRate: number;
  total: number;
  category: ISVCategory;
  taxConfig?: TaxConfigWithAccount;
}

export class ISVCalculator {
  static async calculateISV(amount: number, category: ISVCategory, includeTaxConfig?: boolean): Promise<ISVCalculation> {
    const rate = ISV_RATES[category.rate];
    const isvAmount = Math.round(amount * rate * 100) / 100; // Round to 2 decimal places
    const total = amount + isvAmount;

    const result: ISVCalculation = {
      subtotal: amount,
      isvAmount,
      isvRate: rate,
      total,
      category
    };

    if (includeTaxConfig) {
      // Find corresponding tax config from database
      const taxConfigs = await TaxConfigService.getActiveTaxConfigs();
      const matchingConfig = taxConfigs.find(config => config.rate === rate);
      if (matchingConfig) {
        result.taxConfig = matchingConfig;
      }
    }

    return result;
  }

  static getCategoryById(categoryId: string): ISVCategory | undefined {
    return ISV_CATEGORIES.find(cat => cat.id === categoryId);
  }

  static getStandardCategory(): ISVCategory {
    return ISV_CATEGORIES.find(cat => cat.id === 'standard')!;
  }

  static getSpecialCategory(): ISVCategory {
    return ISV_CATEGORIES.find(cat => cat.id === 'special')!;
  }

  // Determine if an item should use special ISV rate (18%)
  static isSpecialRateItem(itemDescription: string): boolean {
    const specialKeywords = [
      'alcohol', 'bebidas alcohólicas', 'cerveza', 'vino', 'licor',
      'tabaco', 'cigarrillos', 'puros', 'fumar'
    ];
    
    const lowerDescription = itemDescription.toLowerCase();
    return specialKeywords.some(keyword => lowerDescription.includes(keyword));
  }

  // Auto-categorize based on item description
  static autoCategorizeItem(description: string): ISVCategory {
    return this.isSpecialRateItem(description) 
      ? this.getSpecialCategory() 
      : this.getStandardCategory();
  }

  // Get tax configurations from database
  static async getTaxConfigurations(): Promise<TaxConfigWithAccount[]> {
    return await TaxConfigService.getActiveTaxConfigs();
  }

  // Find tax config by rate
  static async findTaxConfigByRate(rate: number): Promise<TaxConfigWithAccount | null> {
    const taxConfigs = await TaxConfigService.getActiveTaxConfigs();
    return taxConfigs.find(config => config.rate === rate) || null;
  }

  // Get the numeric rate for a category
  static getISVRate(category: ISVCategory): number {
    return ISV_RATES[category.rate];
  }
}
