"use server";

import { revalidatePath } from "next/cache";
import { createTransaction } from "./transaction";
import { AutomatedTaxService } from "@/lib/services/automated-tax";

export interface PatientBillFormValues {
  subtotal: number; // in cents
  revenueAccountId: string;
  receivableAccountId: string;
  patientName?: string;
  description?: string;
  date?: string;
}

export async function createPatientBill(data: PatientBillFormValues) {
  try {
    // Validate input
    if (!data.subtotal || data.subtotal <= 0) {
      return {
        success: false,
        error: "Subtotal must be greater than 0"
      };
    }

    if (!data.revenueAccountId || !data.receivableAccountId) {
      return {
        success: false,
        error: "Revenue and receivable accounts are required"
      };
    }

    // Create the automated tax calculation and transaction
    const transactionData = await AutomatedTaxService.createPatientBillTransaction(
      data.subtotal,
      data.revenueAccountId,
      data.receivableAccountId,
      data.patientName,
      data.description,
      data.date
    );

    // Create the transaction using the existing transaction service
    const result = await createTransaction({
      description: transactionData.description,
      date: transactionData.date,
      voucherType: transactionData.voucherType,
      entries: transactionData.entries
    });

    if (result.success) {
      // Revalidate paths to refresh the UI
      revalidatePath('/dashboard');
      revalidatePath('/');
      
      return {
        success: true,
        transaction: result.transaction,
        taxCalculation: transactionData.calculation
      };
    } else {
      return result;
    }
  } catch (error) {
    console.error('Failed to create patient bill:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function previewPatientBillTax(subtotal: number, description?: string) {
  try {
    if (!subtotal || subtotal <= 0) {
      return {
        success: false,
        error: "Subtotal must be greater than 0"
      };
    }

    // Get default accounts for preview
    const [revenueAccounts, receivableAccounts] = await Promise.all([
      AutomatedTaxService.getRevenueAccounts(),
      AutomatedTaxService.getReceivableAccounts()
    ]);

    const defaultRevenueAccount = revenueAccounts[0];
    const defaultReceivableAccount = receivableAccounts[0];

    if (!defaultRevenueAccount || !defaultReceivableAccount) {
      return {
        success: false,
        error: "Default accounts not configured. Please set up revenue and receivable accounts."
      };
    }

    // Create the calculation
    const calculation = await AutomatedTaxService.createPatientBillEntries(
      subtotal,
      defaultRevenueAccount.id,
      defaultReceivableAccount.id,
      description,
      true
    );

    return {
      success: true,
      calculation,
      availableAccounts: {
        revenue: revenueAccounts,
        receivable: receivableAccounts
      }
    };
  } catch (error) {
    console.error('Failed to preview patient bill tax:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
