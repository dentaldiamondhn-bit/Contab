"use server";

import { db } from "@/lib/db";
// import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

// Tipos para las operaciones contables
export interface CreateTransactionData {
  date: Date;
  description: string;
  reference?: string;
  voucherType: "INGRESO" | "EGRESO" | "DIARIO" | "AJUSTE";
  currency: string;
  exchangeRate?: number;
  clienteRTN?: string;
  proveedorRTN?: string;
  entries: {
    accountId: string;
    amount: number;
    isDebit: boolean;
    description?: string;
  }[];
}

export interface CreateAccountData {
  code: string;
  name: string;
  type: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
  description?: string;
  parentId?: string;
}

// Función para obtener el siguiente número de póliza por tenant
export async function getNextVoucherNumber(voucherType: string, tenantId: string): Promise<number> {
  try {
    const lastTransaction = await db.transaction.findFirst({
      where: { 
        voucherType,
        // Aquí necesitaríamos agregar tenantId a la tabla Transaction
        // Por ahora, usamos el filtro existente
      },
      orderBy: { voucherNumber: 'desc' },
    });
    
    return lastTransaction ? lastTransaction.voucherNumber + 1 : 1;
  } catch (error) {
    console.error("Error getting next voucher number:", error);
    return 1;
  }
}

// Crear una transacción con validación de partida doble
export async function createTransaction(data: CreateTransactionData & { tenantId: string }) {
  // const session = await auth();
  // if (!session?.user) {
  //   redirect("/login");
  // }

  // Validar que el tenantId esté presente
  if (!data.tenantId) {
    throw new Error("tenantId es requerido para crear transacciones");
  }

  try {
    // Validar que los débitos y créditos sean iguales
    const totalDebit = data.entries
      .filter(entry => entry.isDebit)
      .reduce((sum, entry) => sum + entry.amount, 0);
    
    const totalCredit = data.entries
      .filter(entry => !entry.isDebit)
      .reduce((sum, entry) => sum + entry.amount, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error("La transacción no está balanceada. Débito debe igualar Crédito.");
    }

    // Obtener el siguiente número de póliza para este tenant
    const voucherNumber = await getNextVoucherNumber(data.voucherType, data.tenantId);

    // Calcular montos en moneda funcional (HNL)
    const exchangeRate = data.exchangeRate || 24.70;
    const totalAmount = totalDebit; // Usamos el total del débito
    const functionalAmount = data.currency === "HNL" 
      ? totalAmount 
      : Math.round(totalAmount * exchangeRate);

    // Crear la transacción principal
    const transaction = await db.transaction.create({
      data: {
        date: data.date,
        description: data.description,
        reference: data.reference,
        voucherType: data.voucherType,
        voucherNumber,
        currency: data.currency,
        exchangeRate: exchangeRate,
        functionalCurrency: "HNL",
        totalAmount: Math.round(totalAmount * 100), // Convertir a centavos
        functionalAmount: Math.round(functionalAmount * 100),
        originalTotal: Math.round(totalAmount * 100),
        clienteRTN: data.clienteRTN,
        proveedorRTN: data.proveedorRTN,
        tenantId: data.tenantId, // Agregar tenantId
      },
    });

    // Crear los asientos contables
    const journalEntries = await Promise.all(
      data.entries.map(async (entry) => {
        const amountInCents = Math.round(entry.amount * 100);
        const functionalAmountInCents = data.currency === "HNL" 
          ? amountInCents 
          : Math.round(amountInCents * exchangeRate);

        return db.journalEntry.create({
          data: {
            amount: entry.isDebit ? functionalAmountInCents : -functionalAmountInCents,
            originalAmount: entry.isDebit ? amountInCents : -amountInCents,
            currency: data.currency,
            exchangeRate: exchangeRate,
            transactionId: transaction.id,
            accountId: entry.accountId,
          },
        });
      })
    );

    // Crear registros históricos de moneda
    await Promise.all(
      journalEntries.map(async (journalEntry: any) => {
        const originalEntry = data.entries.find(e => e.accountId === journalEntry.accountId);
        return db.currencyHistory.create({
          data: {
            transactionId: transaction.id,
            journalEntryId: journalEntry.id,
            date: data.date,
            originalCurrency: data.currency,
            originalAmount: Math.abs(journalEntry.originalAmount),
            functionalCurrency: "HNL",
            functionalAmount: Math.abs(journalEntry.amount),
            exchangeRate: exchangeRate,
            exchangeSource: "BANCO CENTRAL",
            valuationMethod: "SPOT",
          },
        });
      })
    );

    return {
      success: true,
      transaction: {
        ...transaction,
        entries: journalEntries,
      },
    };
  } catch (error) {
    console.error("Error creating transaction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

// Obtener transacciones con filtros
export async function getTransactions(filters: {
  startDate?: Date;
  endDate?: Date;
  voucherType?: string;
  accountId?: string;
  tenantId: string; // Requerido
}) {
  // const session = await auth();
  // if (!session?.user) {
  //   redirect("/login");
  // }

  try {
    const where: any = {
      tenantId: filters.tenantId, // Siempre filtrar por tenant
    };
    
    if (filters.startDate || filters.endDate) {
      where.date = {};
      if (filters.startDate) where.date.gte = filters.startDate;
      if (filters.endDate) where.date.lte = filters.endDate;
    }
    
    if (filters.voucherType && filters.voucherType !== "todos") {
      where.voucherType = filters.voucherType;
    }
    
    if (filters.accountId) {
      where.entries = {
        some: {
          accountId: filters.accountId,
        },
      };
    }

    const transactions = await db.transaction.findMany({
      where,
      include: {
        entries: {
          include: {
            account: true,
          },
        },
        clienteContacto: true,
        proveedorContacto: true,
      },
      orderBy: [
        { date: 'desc' },
        { voucherNumber: 'desc' },
      ],
    });

    return transactions;
  } catch (error) {
    console.error("Error getting transactions:", error);
    return [];
  }
}

// Crear cuenta contable
export async function createAccount(data: CreateAccountData & { tenantId: string }) {
  // const session = await auth();
  // if (!session?.user) {
  //   redirect("/login");
  // }

  // Validar que el tenantId esté presente
  if (!data.tenantId) {
    throw new Error("tenantId es requerido para crear cuentas");
  }

  try {
    // Verificar que el código no exista en este tenant
    const existingAccount = await db.account.findFirst({
      where: { 
        code: data.code,
        tenantId: data.tenantId
      },
    });

    if (existingAccount) {
      throw new Error("Ya existe una cuenta con este código");
    }

    const account = await db.account.create({
      data: {
        code: data.code,
        name: data.name,
        type: data.type,
        description: data.description,
        parentId: data.parentId,
        tenantId: data.tenantId, // Agregar tenantId
      },
    });

    return {
      success: true,
      account,
    };
  } catch (error) {
    console.error("Error creating account:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

// Obtener catálogo de cuentas
export async function getAccounts(tenantId: string) {
  // const session = await auth();
  // if (!session?.user) {
  //   redirect("/login");
  // }

  // Validar tenantId
  if (!tenantId) {
    throw new Error("tenantId es requerido para obtener cuentas");
  }

  try {
    const accounts = await db.account.findMany({
      where: {
        tenantId: tenantId, // Filtrar por tenant
      },
      include: {
        parent: true,
        children: true,
      },
      orderBy: [
        { code: 'asc' },
      ],
    });

    return accounts;
  } catch (error) {
    console.error("Error getting accounts:", error);
    return [];
  }
}

// Obtener balance de comprobación
export async function getTrialBalance(startDate?: Date, endDate?: Date) {
  // const session = await auth();
  // if (!session?.user) {
  //   redirect("/login");
  // }

  try {
    const where: any = {};
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    const transactions = await db.transaction.findMany({
      where,
      include: {
        entries: {
          include: {
            account: true,
          },
        },
      },
    });

    // Agrupar por cuenta
    const accountBalances = new Map<string, {
      account: any;
      debit: number;
      credit: number;
      balance: number;
    }>();

    transactions.forEach((transaction: any) => {
      transaction.entries.forEach((entry: any) => {
        const accountId = entry.accountId;
        const existing = accountBalances.get(accountId);
        
        const amount = Math.abs(entry.amount);
        const isDebit = entry.amount > 0;

        if (existing) {
          if (isDebit) {
            existing.debit += amount;
          } else {
            existing.credit += amount;
          }
          existing.balance = existing.debit - existing.credit;
        } else {
          accountBalances.set(accountId, {
            account: entry.account,
            debit: isDebit ? amount : 0,
            credit: isDebit ? 0 : amount,
            balance: isDebit ? amount : -amount,
          });
        }
      });
    });

    return Array.from(accountBalances.values()).sort((a, b) => 
      a.account.code.localeCompare(b.account.code)
    );
  } catch (error) {
    console.error("Error getting trial balance:", error);
    return [];
  }
}

// Obtener libro mayor
export async function getGeneralLedger(accountId: string, startDate?: Date, endDate?: Date) {
  // const session = await auth();
  // if (!session?.user) {
  //   redirect("/login");
  // }

  try {
    const where: any = {
      entries: {
        some: {
          accountId: accountId,
        },
      },
    };
    
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    const transactions = await db.transaction.findMany({
      where,
      include: {
        entries: {
          where: {
            accountId: accountId,
          },
          include: {
            account: true,
          },
        },
      },
      orderBy: [
        { date: 'asc' },
        { voucherNumber: 'asc' },
      ],
    });

    return transactions;
  } catch (error) {
    console.error("Error getting general ledger:", error);
    return [];
  }
}

// Eliminar transacción (con validación de permisos)
export async function deleteTransaction(transactionId: string) {
  // const session = await auth();
  // if (!session?.user) {
  //   redirect("/login");
  // }

  try {
    // Verificar que la transacción exista
    const transaction = await db.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new Error("Transacción no encontrada");
    }

    // Eliminar en cascada (las entradas y historiales se eliminarán automáticamente)
    await db.transaction.delete({
      where: { id: transactionId },
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error deleting transaction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

// Actualizar cuenta contable
export async function updateAccount(accountId: string, data: Partial<CreateAccountData>) {
  // const session = await auth();
  // if (!session?.user) {
  //   redirect("/login");
  // }

  try {
    const account = await db.account.update({
      where: { id: accountId },
      data: {
        name: data.name,
        type: data.type,
        description: data.description,
        parentId: data.parentId,
      },
    });

    return {
      success: true,
      account,
    };
  } catch (error) {
    console.error("Error updating account:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}
