"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { transactionSchema, type TransactionFormValues } from "@/lib/validations/transaction";
import { getNextVoucherNumber, formatVoucher, VOUCHER_TYPES, type VoucherType } from "@/lib/voucher-types";
import { smartVoucherCategorization } from "@/lib/voucher-categorization";

export async function createTransaction(data: TransactionFormValues & { voucherType?: VoucherType }) {
  try {
    // Validate the data
    const validatedData = transactionSchema.parse(data);

    // Auto-detect voucher type if not provided
    let voucherType: VoucherType;
    if (data.voucherType) {
      voucherType = data.voucherType;
    } else {
      voucherType = await smartVoucherCategorization(validatedData.entries);
    }

    // Get sequential voucher number for the current month
    const nextNumber = await getNextVoucherNumber(voucherType, new Date(validatedData.date));

    // Create the transaction first
    const transaction = await (db as any).transaction.create({
      data: {
        description: validatedData.description,
        date: new Date(validatedData.date),
        voucherType,
        voucherNumber: nextNumber,
        tenantId: (data as any).tenantId,
        currency: (data as any).currency || 'HNL',
        exchangeRate: (data as any).exchangeRate || 24.70,
        totalAmount: validatedData.entries.reduce((sum, entry) => sum + BigInt(entry.amount), BigInt(0)),
      },
    });

    // Create journal entries separately
    await Promise.all(
      validatedData.entries.map((entry) =>
        (db as any).journalEntry.create({
          data: {
            transactionId: transaction.id,
            accountId: entry.accountId,
            tenantId: (data as any).tenantId,
            amount: BigInt(entry.amount),
            originalAmount: BigInt(entry.amount),
            currency: (data as any).currency || 'HNL',
            exchangeRate: (data as any).exchangeRate || 24.70,
          },
        })
      )
    );

    // Revalidate the dashboard path to refresh the data
    revalidatePath('/dashboard');
    revalidatePath('/');

    return { 
      success: true, 
      transaction: {
        ...transaction,
        voucherDisplay: formatVoucher(voucherType, nextNumber)
      }
    };
  } catch (error) {
    console.error('Failed to create transaction:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}
