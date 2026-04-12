import { db } from '@/lib/db';
import { ISVCalculator, ISVCategory, ISVCalculation } from '@/lib/tax/isv-config';

export interface ISVTransactionDetails {
  amount: number;
  categoryId: string;
  description: string;
  autoCategorize?: boolean;
}

export interface ISVJournalEntries {
  mainEntry: {
    accountId: string;
    amount: number;
    description: string;
  };
  isvEntry: {
    accountId: string;
    amount: number;
    description: string;
  };
  totalEntry: {
    accountId: string;
    amount: number;
    description: string;
  };
}

export class ISVService {
  // Get ISV liability accounts
  static async getISVAccounts(): Promise<{
    standardISVAccount: { id: string; name: string } | null;
    specialISVAccount: { id: string; name: string } | null;
  }> {
    try {
      const accounts = await db.account.findMany({
        where: {
          OR: [
            { name: { contains: 'ISV 15%' } },
            { name: { contains: 'ISV 18%' } },
            { name: { contains: 'Impuesto Sobre Ventas' } },
            { code: { in: ['2101', '2102'] } } // Common ISV account codes
          ]
        }
      });

      const standardISVAccount = accounts.find((acc: any) => 
        acc.name.includes('15%') || acc.code === '2101'
      ) || null;

      const specialISVAccount = accounts.find((acc: any) => 
        acc.name.includes('18%') || acc.code === '2102'
      ) || null;

      return { standardISVAccount, specialISVAccount };
    } catch (error) {
      console.error('Error fetching ISV accounts:', error);
      throw new Error('Failed to fetch ISV liability accounts');
    }
  }

  // Create ISV liability accounts if they don't exist
  static async createISVAccounts(): Promise<void> {
    try {
      const existingAccounts = await this.getISVAccounts();
      
      if (!existingAccounts.standardISVAccount) {
        await db.account.create({
          data: {
            name: 'ISV 15% - Impuesto Sobre Ventas Estándar',
            code: '2101',
            type: 'LIABILITY',
            description: 'Cuenta pasiva para ISV al 15% - Ventas estándar'
          }
        });
      }

      if (!existingAccounts.specialISVAccount) {
        await db.account.create({
          data: {
            name: 'ISV 18% - Impuesto Sobre Ventas Especial',
            code: '2102',
            type: 'LIABILITY',
            description: 'Cuenta pasiva para ISV al 18% - Alcohol y tabaco'
          }
        });
      }
    } catch (error) {
      console.error('Error creating ISV accounts:', error);
      throw new Error('Failed to create ISV liability accounts');
    }
  }

  // Calculate ISV and generate journal entries
  static async processISVTransaction(
    details: ISVTransactionDetails,
    mainAccountId: string,
    salesAccountId?: string
  ): Promise<{
    calculation: ISVCalculation;
    journalEntries: ISVJournalEntries;
  }> {
    try {
      // Get ISV calculation
      const category = details.autoCategorize 
        ? ISVCalculator.autoCategorizeItem(details.description)
        : ISVCalculator.getCategoryById(details.categoryId)!;

      const calculation = ISVCalculator.calculateISV(details.amount, category);

      // Get appropriate ISV liability account
      const isvAccounts = await this.getISVAccounts();
      
      let isvAccountId: string;
      if (category.rate === 'special' && isvAccounts.specialISVAccount) {
        isvAccountId = isvAccounts.specialISVAccount.id;
      } else if (isvAccounts.standardISVAccount) {
        isvAccountId = isvAccounts.standardISVAccount.id;
      } else {
        throw new Error(`ISV liability account not found for rate: ${category.rate}`);
      }

      // Generate journal entries
      const journalEntries: ISVJournalEntries = {
        mainEntry: {
          accountId: mainAccountId, // Usually Cash or Bank account
          amount: calculation.total, // Total amount including ISV
          description: `${details.description} (Incluye ISV ${calculation.isvRate * 100}%)`
        },
        isvEntry: {
          accountId: isvAccountId, // ISV liability account
          amount: calculation.isvAmount, // ISV amount (credit)
          description: `ISV ${calculation.isvRate * 100}% - ${details.description}`
        },
        totalEntry: {
          accountId: salesAccountId || 'sales-revenue-default', // Sales revenue account
          amount: calculation.subtotal, // Net amount (credit)
          description: `Venta neta - ${details.description}`
        }
      };

      return { calculation, journalEntries };
    } catch (error) {
      console.error('Error processing ISV transaction:', error);
      throw new Error('Failed to process ISV transaction');
    }
  }

  // Create transaction with ISV splitting
  static async createISVTransaction(
    transactionData: {
      date: Date;
      description: string;
      voucherType: string;
      customerInfo?: string;
    },
    isvDetails: ISVTransactionDetails,
    mainAccountId: string,
    salesAccountId?: string
  ) {
    try {
      // Ensure ISV accounts exist
      await this.createISVAccounts();

      // Process ISV calculation and entries
      const { calculation, journalEntries } = await this.processISVTransaction(
        isvDetails,
        mainAccountId,
        salesAccountId
      );

      // Get next voucher number
      const lastVoucher = await db.transaction.findFirst({
        where: { type: transactionData.voucherType },
        orderBy: { voucherNumber: 'desc' }
      });

      const nextVoucherNumber = (lastVoucher?.voucherNumber || 0) + 1;

      // Create transaction with split entries
      const transaction = await db.transaction.create({
        data: {
          date: transactionData.date,
          description: `${transactionData.description} (ISV ${calculation.isvRate * 100}%)`,
          type: transactionData.voucherType,
          voucherNumber: nextVoucherNumber,
          currency: 'HNL',
          exchangeRate: 1.0,
          functionalCurrency: 'HNL',
          totalAmount: BigInt(Math.round(calculation.total * 100)),
          functionalAmount: BigInt(Math.round(calculation.total * 100)),
          entries: {
            create: [
              // Debit: Cash/Bank (total amount)
              {
                accountId: journalEntries.mainEntry.accountId,
                amount: BigInt(Math.round(calculation.total * 100)),
                originalAmount: BigInt(Math.round(calculation.total * 100)),
                currency: 'HNL',
                exchangeRate: 1.0
              },
              // Credit: ISV Liability (tax amount)
              {
                accountId: journalEntries.isvEntry.accountId,
                amount: BigInt(-Math.round(calculation.isvAmount * 100)),
                originalAmount: BigInt(-Math.round(calculation.isvAmount * 100)),
                currency: 'HNL',
                exchangeRate: 1.0
              },
              // Credit: Sales Revenue (net amount)
              {
                accountId: journalEntries.totalEntry.accountId,
                amount: BigInt(-Math.round(calculation.subtotal * 100)),
                originalAmount: BigInt(-Math.round(calculation.subtotal * 100)),
                currency: 'HNL',
                exchangeRate: 1.0
              }
            ]
          }
        },
        include: {
          entries: {
            include: {
              account: true
            }
          }
        }
      });

      return {
        transaction,
        calculation,
        journalEntries
      };
    } catch (error) {
      console.error('Error creating ISV transaction:', error);
      throw new Error('Failed to create ISV transaction');
    }
  }

  // Get ISV summary for reporting
  static async getISVSummary(startDate: Date, endDate: Date) {
    try {
      const isvAccounts = await this.getISVAccounts();
      
      if (!isvAccounts.standardISVAccount && !isvAccounts.specialISVAccount) {
        return {
          standardISV: 0,
          specialISV: 0,
          totalISV: 0,
          transactions: []
        };
      }

      const isvAccountIds = [
        isvAccounts.standardISVAccount?.id,
        isvAccounts.specialISVAccount?.id
      ].filter(Boolean) as string[];

      const transactions = await db.transaction.findMany({
        where: {
          date: { gte: startDate, lte: endDate },
          entries: {
            some: {
              accountId: { in: isvAccountIds }
            }
          }
        },
        include: {
          entries: {
            where: {
              accountId: { in: isvAccountIds }
            },
            include: {
              account: true
            }
          }
        },
        orderBy: { date: 'desc' }
      });

      let standardISV = 0;
      let specialISV = 0;

      transactions.forEach((transaction: any) => {
        transaction.entries.forEach((entry: any) => {
          const amount = Math.abs(Number(entry.amount) / 100); // Convert from cents
          if (entry.account.name.includes('15%')) {
            standardISV += amount;
          } else if (entry.account.name.includes('18%')) {
            specialISV += amount;
          }
        });
      });

      return {
        standardISV,
        specialISV,
        totalISV: standardISV + specialISV,
        transactions: transactions.map((t: any) => ({
          id: t.id,
          date: t.date,
          description: t.description,
          totalAmount: Number(t.totalAmount) / 100,
          entries: t.entries.map((e: any) => ({
            accountName: e.account.name,
            amount: Math.abs(Number(e.amount) / 100),
            isDebit: Number(e.amount) > 0
          }))
        }))
      };
    } catch (error) {
      console.error('Error getting ISV summary:', error);
      throw new Error('Failed to get ISV summary');
    }
  }
}
