import { z } from "zod";
import { VOUCHER_TYPES, type VoucherType } from "@/lib/voucher-types";

const entrySchema = z.object({
  accountId: z.string().min(1, "Account ID is required"),
  amount: z.number().int("Amount must be in cents"),
  taxable: z.boolean().optional(),
});

export const transactionSchema = z.object({
  description: z.string().min(1, "Description is required"),
  date: z.string().min(1, "Date is required"),
  voucherType: z.enum(["INGRESO", "EGRESO", "DIARIO", "AJUSTE"]).optional(),
  entries: z.array(entrySchema).min(2, "At least 2 entries are required").refine(
    (entries) => entries.reduce((sum, entry) => sum + entry.amount, 0) === 0,
    "Entries must balance to zero"
  ),
});

export type TransactionFormValues = z.infer<typeof transactionSchema>;
