import { db } from '@/lib/db';

const hondurasBanks = [
  { name: "Banco Atlántida", identifier: "BANTLAN" },
  { name: "Banco de Occidente", identifier: "OCCIDENTE" },
  { name: "BAC Credomatic", identifier: "BAC" },
  { name: "Banco Ficohsa", identifier: "FICOHSA" },
  { name: "Banpaís", identifier: "BANPAIS" },
  { name: "Banco Davivienda", identifier: "DAVIVIENDA" },
  { name: "Banco Promerica", identifier: "PROMERICA" },
  { name: "Banrural", identifier: "BANRURAL" },
  { name: "Banco Lafise", identifier: "LAFISE" },
];

export async function seedBanksAndAccounts() {
  try {
    console.log('🏦 Starting bank and account seeding...');

    // First, ensure we have the main bank accounts parent account (1101 - Cuentas Bancarias)
    const mainBankAccount = await (db as any).account.upsert({
      where: { code_tenantId: { code: '1101', tenantId: 'default' } },
      update: {},
      create: {
        code: '1101',
        name: 'Cuentas Bancarias',
        type: 'ASSET',
        description: 'Cuentas bancarias de la empresa',
        isActive: true,
      },
    });

    console.log(`✅ Main bank account created/found: ${mainBankAccount.name}`);

    // Create individual bank accounts for each Honduran bank
    for (let i = 0; i < hondurasBanks.length; i++) {
      const bank = hondurasBanks[i];
      
      // Generate sequential account code: 1101-01, 1101-02, etc.
      const accountCode = `1101-${String(i + 1).padStart(2, '0')}`;
      
      // Create the bank account
      const bankAccount = await (db as any).account.upsert({
        where: { code_tenantId: { code: accountCode, tenantId: 'default' } },
        update: {
          name: `${bank.name} Lempiras`,
          description: `Cuenta bancaria en ${bank.name}`,
          isActive: true,
        },
        create: {
          code: accountCode,
          name: `${bank.name} Lempiras`,
          type: 'ASSET',
          description: `Cuenta bancaria en ${bank.name}`,
          isActive: true,
          parentId: mainBankAccount.id,
        },
      });

      // Create the bank record
      const bankRecord = await (db as any).bank.upsert({
        where: { identifier: bank.identifier },
        update: {
          name: bank.name,
          accountId: bankAccount.id,
          isActive: true,
        },
        create: {
          name: bank.name,
          identifier: bank.identifier,
          accountId: bankAccount.id,
          currency: 'HNL',
          isActive: true,
        },
      });

      console.log(`✅ Bank created: ${bank.name} -> ${accountCode} (${bank.identifier})`);
    }

    // Also create USD accounts for international transactions
    const mainUSDAccount = await (db as any).account.upsert({
      where: { code_tenantId: { code: '1102', tenantId: 'default' } },
      update: {},
      create: {
        code: '1102',
        name: 'Cuentas Bancarias USD',
        type: 'ASSET',
        description: 'Cuentas bancarias en dólares',
        isActive: true,
      },
    });

    console.log(`✅ Main USD bank account created: ${mainUSDAccount.name}`);

    // Create USD accounts for major banks
    const majorBanks = ['BAC', 'FICOHSA', 'BANTLAN'];
    for (const bankIdentifier of majorBanks) {
      const bank = hondurasBanks.find(b => b.identifier === bankIdentifier);
      if (bank) {
        const bankRecord = await (db as any).bank.findUnique({
          where: { identifier: bank.identifier }
        });
        
        if (bankRecord) {
          const usdAccountCode = `1102-${bankRecord.code.split('-')[1]}`;
          
          await (db as any).account.upsert({
            where: { code_tenantId: { code: usdAccountCode, tenantId: 'default' } },
            update: {
              name: `${bank.name} USD`,
              description: `Cuenta bancaria en ${bank.name} (USD)`,
              isActive: true,
            },
            create: {
              code: usdAccountCode,
              name: `${bank.name} USD`,
              type: 'ASSET',
              description: `Cuenta bancaria en ${bank.name} (USD)`,
              isActive: true,
              parentId: mainUSDAccount.id,
            },
          });

          console.log(`✅ USD account created: ${bank.name} -> ${usdAccountCode}`);
        }
      }
    }

    console.log('🎉 Bank and account seeding completed successfully!');
    
    // Return summary
    const totalBanks = await (db as any).bank.count();
    const totalAccounts = await db.account.count({
      where: {
        code: {
          startsWith: '110'
        }
      }
    });

    return {
      success: true,
      totalBanks,
      totalAccounts,
      message: `Created ${totalBanks} banks with ${totalAccounts} accounts`
    };

  } catch (error) {
    console.error('❌ Error seeding banks and accounts:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Helper function to get bank account code
export function generateBankAccountCode(bankIdentifier: string): string {
  const bankIndex = hondurasBanks.findIndex(b => b.identifier === bankIdentifier);
  if (bankIndex === -1) {
    throw new Error(`Bank identifier ${bankIdentifier} not found`);
  }
  return `1101-${String(bankIndex + 1).padStart(2, '0')}`;
}

// Helper function to create a new bank account
export async function createBankAccount(bankName: string, currency: 'HNL' | 'USD' = 'HNL') {
  try {
    const parentCode = currency === 'HNL' ? '1101' : '1102';
    const parentAccount = await (db as any).account.findUnique({
      where: { code_tenantId: { code: parentCode, tenantId: 'default' } }
    });

    if (!parentAccount) {
      throw new Error(`Parent account ${parentCode} not found`);
    }

    // Get the next sequential number
    const existingAccounts = await db.account.count({
      where: {
        parentId: parentAccount.id,
        code: {
          startsWith: parentCode
        }
      }
    });

    const accountCode = `${parentCode}-${String(existingAccounts + 1).padStart(2, '0')}`;
    const accountName = currency === 'HNL' ? `${bankName} Lempiras` : `${bankName} USD`;

    const newAccount = await (db as any).account.create({
      data: {
        code: accountCode,
        name: accountName,
        type: 'ASSET',
        description: `Cuenta bancaria en ${bankName} (${currency})`,
        isActive: true,
        parentId: parentAccount.id,
        tenantId: 'default',
      }
    });

    // Generate a unique identifier for the bank
    const identifier = bankName.toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 8);

    const newBank = await (db as any).bank.create({
      data: {
        name: bankName,
        identifier,
        accountId: newAccount.id,
        currency,
        isActive: true,
      }
    });

    console.log(`✅ New bank account created: ${bankName} -> ${accountCode}`);

    return {
      success: true,
      account: newAccount,
      bank: newBank
    };

  } catch (error) {
    console.error('❌ Error creating bank account:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Helper function to get all bank accounts
export async function getBankAccounts() {
  try {
    const bankAccounts = await (db as any).bank.findMany({
      include: {
        account: {
          include: {
            parent: true
          }
        }
      },
      where: {
        isActive: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    return {
      success: true,
      accounts: bankAccounts.map((bank: any) => ({
        ...bank,
        accountCode: bank.account.code,
        accountName: bank.account.name,
        currency: bank.currency,
        parentAccount: bank.account.parent?.name
      }))
    };

  } catch (error) {
    console.error('❌ Error fetching bank accounts:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Run the seeding function if this file is executed directly
if (require.main === module) {
  seedBanksAndAccounts()
    .then(result => {
      console.log('Seeding result:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}
