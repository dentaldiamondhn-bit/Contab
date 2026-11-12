import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function createSampleTaxTransactions() {
  try {
    // Get accounts for sample transactions
    const revenueAccount = await prisma.account.findFirst({
      where: { code: '4101' } // Ingresos por Consultas Médicas
    });

    const expenseAccount = await prisma.account.findFirst({
      where: { code: '5101' } // We'll create this if it doesn't exist
    });

    const isvPayableAccount = await prisma.account.findFirst({
      where: { code: '2101' } // ISV por Pagar
    });

    const receivableAccount = await prisma.account.findFirst({
      where: { code: '1201' } // Cuentas por Cobrar - Pacientes
    });

    // Create expense account if it doesn't exist
    let labMaterialsAccount = expenseAccount;
    if (!labMaterialsAccount) {
      labMaterialsAccount = await (prisma as any).account.create({
        data: {
          name: 'Materiales de Laboratorio',
          code: '5101',
          type: 'EXPENSE',
          description: 'Compras de materiales y suministros de laboratorio',
          tenantId: 'default'
        }
      });
    }

    if (!revenueAccount || !labMaterialsAccount || !isvPayableAccount || !receivableAccount) {
      throw new Error('Required accounts not found');
    }

    const currentMonth = new Date();
    const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    // Sample sales transactions with ISV
    const salesTransactions = [
      {
        date: new Date(startDate.getTime() + 5 * 24 * 60 * 60 * 1000), // 5th day of month
        description: 'Factura paciente - Consulta médica',
        voucherType: 'INGRESO',
        voucherNumber: 1,
        entries: [
          { accountId: receivableAccount.id, amount: 11500 }, // Debit: L. 115.00 receivable
          { accountId: revenueAccount.id, amount: -10000 }, // Credit: L. 100.00 revenue
          { accountId: isvPayableAccount.id, amount: -1500 } // Credit: L. 15.00 ISV (15%)
        ]
      },
      {
        date: new Date(startDate.getTime() + 10 * 24 * 60 * 60 * 1000), // 10th day of month
        description: 'Factura paciente - Procedimiento especial',
        voucherType: 'INGRESO',
        voucherNumber: 2,
        entries: [
          { accountId: receivableAccount.id, amount: 11800 }, // Debit: L. 118.00 receivable
          { accountId: revenueAccount.id, amount: -10000 }, // Credit: L. 100.00 revenue
          { accountId: isvPayableAccount.id, amount: -1800 } // Credit: L. 18.00 ISV (18% for special)
        ]
      },
      {
        date: new Date(startDate.getTime() + 15 * 24 * 60 * 60 * 1000), // 15th day of month
        description: 'Factura paciente - Servicios de laboratorio',
        voucherType: 'INGRESO',
        voucherNumber: 3,
        entries: [
          { accountId: receivableAccount.id, amount: 23000 }, // Debit: L. 230.00 receivable
          { accountId: revenueAccount.id, amount: -20000 }, // Credit: L. 200.00 revenue
          { accountId: isvPayableAccount.id, amount: -3000 } // Credit: L. 30.00 ISV (15%)
        ]
      }
    ];

    // Sample purchase transactions with ISV
    const purchaseTransactions = [
      {
        date: new Date(startDate.getTime() + 8 * 24 * 60 * 60 * 1000), // 8th day of month
        description: 'Compra de materiales de laboratorio',
        voucherType: 'EGRESO',
        voucherNumber: 1,
        entries: [
          { accountId: labMaterialsAccount.id, amount: 20000 }, // Debit: L. 200.00 expense
          { accountId: 'cash-account-id', amount: -23000 }, // Credit: L. 230.00 cash (placeholder)
          { accountId: isvPayableAccount.id, amount: 3000 } // Debit: L. 30.00 ISV recoverable
        ]
      }
    ];

    // Create sales transactions
    for (const transaction of salesTransactions) {
      const createdTransaction = await (prisma as any).transaction.create({
        data: {
          date: transaction.date,
          description: transaction.description,
          voucherType: transaction.voucherType,
          voucherNumber: transaction.voucherNumber,
          currency: 'HNL',
          exchangeRate: 1.0,
          totalAmount: BigInt(transaction.entries.reduce((sum, entry) => sum + Math.abs(entry.amount), 0) * 100),
          tenantId: 'default'
        }
      });

      // Create journal entries separately
      for (const entry of transaction.entries) {
        await (prisma as any).journalEntry.create({
          data: {
            transactionId: createdTransaction.id,
            accountId: entry.accountId,
            amount: BigInt(entry.amount * 100),
            originalAmount: BigInt(entry.amount * 100),
            currency: 'HNL',
            exchangeRate: 1.0,
            tenantId: 'default'
          }
        });
      }
    }

    // Create purchase transactions (we need a cash account first)
    let cashAccount = await prisma.account.findFirst({
      where: { code: '1001' }
    });

    if (!cashAccount) {
      cashAccount = await (prisma as any).account.create({
        data: {
          name: 'Caja',
          code: '1001',
          type: 'ASSET',
          tenantId: 'default',
          description: 'Caja general'
        }
      });
    }

    for (const transaction of purchaseTransactions) {
      const createdTransaction = await prisma.transaction.create({
        data: {
          date: transaction.date,
          description: transaction.description,
          voucherType: transaction.voucherType,
          voucherNumber: transaction.voucherNumber,
          currency: 'HNL',
          exchangeRate: 1.0,
          totalAmount: BigInt(transaction.entries.reduce((sum, entry) => sum + Math.abs(entry.amount), 0) * 100),
          tenantId: 'default'
        }
      });

      // Create journal entries separately
      for (const entry of transaction.entries) {
        await prisma.journalEntry.create({
          data: {
            transactionId: createdTransaction.id,
            accountId: entry.accountId === 'cash-account-id' ? cashAccount!.id : entry.accountId,
            amount: BigInt(entry.amount * 100),
            originalAmount: BigInt(entry.amount * 100),
            currency: 'HNL',
            exchangeRate: 1.0,
            tenantId: 'default'
          }
        });
      }
    }

    console.log('Sample tax transactions created successfully');
    console.log(`Created ${salesTransactions.length} sales transactions`);
    console.log(`Created ${purchaseTransactions.length} purchase transactions`);
  } catch (error) {
    console.error('Error creating sample tax transactions:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  createSampleTaxTransactions()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}
