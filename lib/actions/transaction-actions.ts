// lib/actions/transaction-actions.ts
// Acciones de servidor para crear transacciones con validación contable

import { validateTransaction, prepareTransaction, validateEntry } from '@/lib/accounting-utils';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export interface CreateTransactionRequest {
  date: string;
  description: string;
  voucher_type: 'INGRESO' | 'EGRESO' | 'DIARIO';
  voucher_number?: number;
  currency?: string;
  exchange_rate?: number;
  entries: {
    account_id: string;
    debit: number;
    credit: number;
    description?: string;
  }[];
}

/**
 * Crea una nueva transacción con validación contable completa
 */
export async function createTransaction(data: CreateTransactionRequest) {
  try {
    // Obtener usuario autenticado y su tenant
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error('No autorizado');
    }

    // Obtener el tenant del usuario
    const profile = await prisma.profile.findUnique({
      where: { id: session.user.id },
      include: { tenant: true }
    });

    if (!profile?.tenant_id) {
      throw new Error('Usuario no asociado a un tenant');
    }

    // Preparar datos de la transacción
    const transactionData = {
      tenant_id: profile.tenant_id,
      ...data,
      // Si no se proporciona número de voucher, generar uno automáticamente
      voucher_number: data.voucher_number || await getNextVoucherNumber(profile.tenant_id, data.voucher_type)
    };

    // Validar la transacción completa
    validateTransaction(transactionData);

    // Preparar para base de datos
    const preparedTransaction = prepareTransaction(transactionData);

    // Crear transacción y partidas en una transacción de base de datos
    const result = await prisma.$transaction(async (tx) => {
      // Crear la transacción principal
      const transaction = await tx.transaction.create({
        data: {
          tenant_id: preparedTransaction.tenant_id,
          date: new Date(preparedTransaction.date),
          description: preparedTransaction.description,
          voucher_type: preparedTransaction.voucher_type,
          voucher_number: preparedTransaction.voucher_number,
          currency: preparedTransaction.currency,
          exchange_rate: preparedTransaction.exchange_rate,
          status: 'POSTED'
        }
      });

      // Crear todas las partidas contables
      const journalEntries = await Promise.all(
        preparedTransaction.entries.map((entry) =>
          tx.journalEntry.create({
            data: {
              tenant_id: preparedTransaction.tenant_id,
              transaction_id: transaction.id,
              account_id: entry.account_id,
              debit: entry.debit,
              credit: entry.credit
            }
          })
        )
      );

      return {
        transaction,
        entries: journalEntries
      };
    });

    return {
      success: true,
      data: result
    };

  } catch (error) {
    console.error('Error al crear transacción:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Obtiene el siguiente número de voucher disponible
 */
async function getNextVoucherNumber(tenantId: string, voucherType: string): Promise<number> {
  const lastTransaction = await prisma.transaction.findFirst({
    where: {
      tenant_id: tenantId,
      voucher_type: voucherType
    },
    orderBy: {
      voucher_number: 'desc'
    }
  });

  return (lastTransaction?.voucher_number || 0) + 1;
}

/**
 * Valida una póliza antes de guardar (endpoint de validación)
 */
export async function validateTransactionEntries(entries: { account_id: string; debit: number; credit: number }[]) {
  try {
    validateEntry(entries);
    return {
      success: true,
      message: 'Póliza balanceada correctamente'
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error de validación'
    };
  }
}

/**
 * Obtiene el balance de comprobación para un tenant
 */
export async function getTrialBalance(tenantId: string) {
  try {
    // Obtener todas las cuentas del tenant
    const accounts = await prisma.account.findMany({
      where: { tenant_id: tenantId },
      orderBy: { code: 'asc' }
    });

    // Obtener todas las partidas del tenant
    const entries = await prisma.journalEntry.findMany({
      where: { tenant_id: tenantId },
      include: {
        account: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true
          }
        }
      }
    });

    // Calcular balances por cuenta
    const trialBalance = accounts.map(account => {
      const accountEntries = entries.filter(e => e.account_id === account.id);
      const totalDebit = accountEntries.reduce((sum, e) => sum + e.debit, 0);
      const totalCredit = accountEntries.reduce((sum, e) => sum + e.credit, 0);
      const balance = totalDebit - totalCredit;

      // Determinar si el saldo va al debe o al haber según el tipo de cuenta
      let debit = 0;
      let credit = 0;

      if (account.type === 'ASSET' || account.type === 'EXPENSE') {
        debit = balance > 0 ? balance : 0;
        credit = balance < 0 ? Math.abs(balance) : 0;
      } else {
        debit = balance < 0 ? Math.abs(balance) : 0;
        credit = balance > 0 ? balance : 0;
      }

      return {
        account_id: account.id,
        code: account.code,
        name: account.name,
        type: account.type,
        debit,
        credit,
        balance: Math.abs(balance),
        balance_type: balance === 0 ? 'ZERO' : (debit > 0 ? 'DEBIT' : 'CREDIT')
      };
    });

    // Calcular totales
    const totals = trialBalance.reduce(
      (acc, account) => ({
        total_debit: acc.total_debit + account.debit,
        total_credit: acc.total_credit + account.credit
      }),
      { total_debit: 0, total_credit: 0 }
    );

    return {
      success: true,
      data: {
        accounts: trialBalance,
        totals,
        is_balanced: totals.total_debit === totals.total_credit
      }
    };

  } catch (error) {
    console.error('Error al obtener balance de comprobación:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}
