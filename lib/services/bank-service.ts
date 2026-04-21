import { db } from '@/lib/db';

// Helper function to create bank account automatically when creating a bank
export async function createBankWithAccount(bankName: string, currency: 'HNL' | 'USD' = 'HNL') {
  try {
    // Determine parent account based on currency
    const parentCode = currency === 'HNL' ? '1101' : '1102';
    
    // Ensure parent account exists
    const parentAccount = await (db as any).account.upsert({
      where: { code_tenantId: { code: parentCode, tenantId: 'default' } },
      update: {},
      create: {
        code: parentCode,
        name: currency === 'HNL' ? 'Cuentas Bancarias' : 'Cuentas Bancarias USD',
        type: 'ASSET',
        description: currency === 'HNL' 
          ? 'Cuentas bancarias de la empresa en lempiras' 
          : 'Cuentas bancarias de la empresa en dólares',
        isActive: true,
      },
    });

    // Get next sequential number for this parent
    const existingAccounts = await db.account.count({
      where: {
        parentId: parentAccount.id,
        code: {
          startsWith: parentCode
        }
      }
    });

    // Generate account code: 1101-01, 1101-02, etc.
    const accountCode = `${parentCode}-${String(existingAccounts + 1).padStart(2, '0')}`;
    const accountName = currency === 'HNL' ? `${bankName} Lempiras` : `${bankName} USD`;

    // Create the accounting account
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

    // Generate bank identifier
    const identifier = bankName.toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 8);

    // Create the bank record linked to the account
    const newBank = await (db as any).bank.create({
      data: {
        name: bankName,
        identifier,
        accountId: newAccount.id,
        currency,
        isActive: true,
      }
    });

    console.log(`✅ Bank account created: ${bankName} -> ${accountCode} (${identifier})`);

    return {
      success: true,
      bank: newBank,
      account: newAccount,
      message: `Cuenta bancaria creada: ${accountCode} - ${accountName}`
    };

  } catch (error) {
    console.error('❌ Error creating bank with account:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Helper function to get bank account by bank identifier
export async function getBankAccountByIdentifier(identifier: string) {
  try {
    const bank = await (db as any).bank.findUnique({
      where: { identifier },
      include: {
        account: {
          include: {
            parent: true
          }
        }
      }
    });

    if (!bank) {
      return {
        success: false,
        error: `Bank with identifier ${identifier} not found`
      };
    }

    return {
      success: true,
      bank: {
        ...bank,
        accountCode: bank.account.code,
        accountName: bank.account.name,
        parentAccount: bank.account.parent?.name,
        currency: bank.currency
      }
    };

  } catch (error) {
    console.error('❌ Error fetching bank account:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Helper function to reconcile bank statement entries
export async function reconcileBankStatement(
  bankIdentifier: string, 
  statementData: Array<{
    date: Date;
    description: string;
    amount: number;
    reference?: string;
  }>
) {
  try {
    const bankResult = await getBankAccountByIdentifier(bankIdentifier);
    
    if (!bankResult.success) {
      return bankResult;
    }

    const bank = bankResult.bank;
    const reconciledEntries = [];

    for (const entry of statementData) {
      // Create a journal entry for each bank statement line
      const journalEntry = await (db as any).journalEntry.create({
        data: {
          amount: entry.amount,
          description: entry.description,
          reference: entry.reference || `BANK-${bank.identifier}-${Date.now()}`,
          accountId: bank.accountId,
          transactionId: undefined, // Can be linked to a transaction later
          createdAt: entry.date,
          updatedAt: new Date(),
        }
      });

      reconciledEntries.push(journalEntry);
    }

    return {
      success: true,
      reconciledEntries,
      message: `Reconciled ${reconciledEntries.length} entries for ${bank.name}`
    };

  } catch (error) {
    console.error('❌ Error reconciling bank statement:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Helper function to get bank balance
export async function getBankBalance(bankIdentifier: string) {
  try {
    const bankResult = await getBankAccountByIdentifier(bankIdentifier);
    
    if (!bankResult.success) {
      return bankResult;
    }

    const bank = bankResult.bank;

    // Calculate balance from journal entries
    const entries = await db.journalEntry.findMany({
      where: {
        accountId: bank.accountId
      }
    });

    const balance = entries.reduce((total: number, entry: any) => {
      return total + Number(entry.amount);
    }, 0);

    return {
      success: true,
      bank: bank,
      balance,
      entryCount: entries.length,
      message: `Balance for ${bank.name}: L. ${balance.toLocaleString('es-HN')}`
    };

  } catch (error) {
    console.error('❌ Error getting bank balance:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
