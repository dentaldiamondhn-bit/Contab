import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface TaxConfigData {
  name: string;
  rate: number;
  accountId: string;
  isActive?: boolean;
}

export interface TaxConfigWithAccount {
  id: string;
  name: string;
  rate: number;
  accountId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  account: {
    id: string;
    name: string;
    code: string;
    type: string;
  };
}

export class TaxConfigService {
  static async getAllTaxConfigs(): Promise<TaxConfigWithAccount[]> {
    return await (prisma as any).taxConfig.findMany({
      include: {
        account: {
          select: {
            id: true,
            name: true,
            code: true,
            type: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });
  }

  static async getActiveTaxConfigs(): Promise<TaxConfigWithAccount[]> {
    return await (prisma as any).taxConfig.findMany({
      where: {
        isActive: true
      },
      include: {
        account: {
          select: {
            id: true,
            name: true,
            code: true,
            type: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });
  }

  static async getTaxConfigById(id: string): Promise<TaxConfigWithAccount | null> {
    return await (prisma as any).taxConfig.findUnique({
      where: { id },
      include: {
        account: {
          select: {
            id: true,
            name: true,
            code: true,
            type: true
          }
        }
      }
    });
  }

  static async createTaxConfig(data: TaxConfigData): Promise<TaxConfigWithAccount> {
    // Verify the account exists and is a liability account
    const account = await prisma.account.findUnique({
      where: { id: data.accountId }
    });

    if (!account) {
      throw new Error('Account not found');
    }

    if (account.type !== 'LIABILITY') {
      throw new Error('Tax configuration must be linked to a liability account');
    }

    return await (prisma as any).taxConfig.create({
      data: {
        name: data.name,
        rate: data.rate,
        accountId: data.accountId,
        isActive: data.isActive ?? true
      },
      include: {
        account: {
          select: {
            id: true,
            name: true,
            code: true,
            type: true
          }
        }
      }
    });
  }

  static async updateTaxConfig(id: string, data: Partial<TaxConfigData>): Promise<TaxConfigWithAccount> {
    // If accountId is being updated, verify the new account
    if (data.accountId) {
      const account = await prisma.account.findUnique({
        where: { id: data.accountId }
      });

      if (!account) {
        throw new Error('Account not found');
      }

      if (account.type !== 'LIABILITY') {
        throw new Error('Tax configuration must be linked to a liability account');
      }
    }

    return await (prisma as any).taxConfig.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.rate !== undefined && { rate: data.rate }),
        ...(data.accountId && { accountId: data.accountId }),
        ...(data.isActive !== undefined && { isActive: data.isActive })
      },
      include: {
        account: {
          select: {
            id: true,
            name: true,
            code: true,
            type: true
          }
        }
      }
    });
  }

  static async deleteTaxConfig(id: string): Promise<void> {
    // Check if tax config is being used in transactions
    // Note: You might want to add foreign key constraints or soft deletes
    await (prisma as any).taxConfig.delete({
      where: { id }
    });
  }

  static async getLiabilityAccounts() {
    return await prisma.account.findMany({
      where: {
        type: 'LIABILITY'
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
