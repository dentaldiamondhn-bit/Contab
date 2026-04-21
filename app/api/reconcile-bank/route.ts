import { NextRequest, NextResponse } from 'next/server';
import { reconcileBankStatement } from '@/lib/services/bank-service';

export async function POST(request: NextRequest) {
  try {
    const { bankIdentifier, transactions } = await request.json();

    if (!bankIdentifier || !transactions) {
      return NextResponse.json(
        { error: 'Bank identifier and transactions are required' },
        { status: 400 }
      );
    }

    // Transform transactions to expected format
    const statementData = transactions.map((t: any) => ({
      date: new Date(t.date),
      description: t.description,
      amount: t.debit > 0 ? -t.debit : t.credit, // Negative for debits, positive for credits
      reference: t.reference || ''
    }));

    const result = await reconcileBankStatement(bankIdentifier, statementData);

    if (result.success) {
      return NextResponse.json({
        success: true,
        reconciledEntries: (result as any).reconciledEntries,
        message: `Successfully reconciled ${(result as any).reconciledEntries?.length || 0} entries for ${bankIdentifier}`
      });
    } else {
      return NextResponse.json(
        { error: (result as any).error || 'Unknown error' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error reconciling bank statement:', error);
    return NextResponse.json(
      { error: 'Failed to reconcile bank statement' },
      { status: 500 }
    );
  }
}
