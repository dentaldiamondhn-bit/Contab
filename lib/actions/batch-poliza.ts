"use server";

import { db } from "@/lib/db";
import { renderToBuffer } from "@react-pdf/renderer";
import { BatchPolizaDocument } from "@/components/components/components/reports/BatchPolizaDocument";

export async function generateBatchPolizaPDF(transactionIds: string[]) {
  try {
    // Fetch all transactions with their entries and accounts
    const transactions = await db.transaction.findMany({
      where: {
        id: { in: transactionIds }
      },
      include: {
        entries: {
          include: {
            account: {
              select: {
                code: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: [
        { voucherType: 'asc' },
        { voucherNumber: 'asc' }
      ]
    });

    if (transactions.length === 0) {
      throw new Error("No transactions found");
    }

    // Format transactions for the PDF component
    const formattedTransactions = transactions.map((t: any) => ({
      ...t,
      date: t.date,
      entries: t.entries.map((e: any) => ({
        ...e,
        amount: e.amount
      }))
    }));

    // Determine month from first transaction
    const monthName = new Date(transactions[0].date).toLocaleDateString('es-ES', { 
      month: 'long', 
      year: 'numeric' 
    });

    // Generate PDF
    const pdfBuffer = await renderToBuffer(
      BatchPolizaDocument({ 
        transactions: formattedTransactions, 
        month: monthName
      })
    );

    return {
      success: true,
      pdfBuffer,
      filename: `polizas_${monthName.replace(/\s+/g, '_')}.pdf`
    };

  } catch (error) {
    console.error('Failed to generate batch PDF:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function getTransactionsForBatchPDF(dateRange?: { start: Date; end: Date }) {
  try {
    const whereClause = dateRange ? {
      date: {
        gte: dateRange.start,
        lte: dateRange.end
      }
    } : {};

    const transactions = await db.transaction.findMany({
      where: whereClause,
      include: {
        entries: {
          include: {
            account: {
              select: {
                code: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: [
        { date: 'desc' },
        { voucherType: 'asc' },
        { voucherNumber: 'asc' }
      ]
    });

    return {
      success: true,
      transactions
    };

  } catch (error) {
    console.error('Failed to fetch transactions:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
