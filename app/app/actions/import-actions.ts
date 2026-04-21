"use server"

import { db } from "@/lib/db";

export async function createTransactionBatch(transactions: any[]) {
  try {
    await (db as any).$transaction(
      transactions.map((tx) => 
        (db as any).transaction.create({
          data: {
            description: tx.description,
            date: tx.date,
            entries: {
              create: tx.entries.map((e: any) => ({
                accountId: e.accountId,
                amount: BigInt(e.amount),
              }))
            }
          }
        })
      )
    );
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}