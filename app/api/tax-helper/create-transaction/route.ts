import { NextResponse } from 'next/server';
import { createTransaction } from '@/lib/actions/transaction';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { entries, description, date } = body;

    if (!entries || !Array.isArray(entries)) {
      return NextResponse.json(
        { error: 'Entries array is required' },
        { status: 400 }
      );
    }

    if (!description) {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      );
    }

    // Validate that entries balance to zero
    const sum = entries.reduce((total, entry) => total + entry.amount, 0);
    if (sum !== 0) {
      return NextResponse.json(
        { error: 'Entries must balance to zero' },
        { status: 400 }
      );
    }

    // Create the transaction using the existing transaction service
    const result = await createTransaction({
      description,
      date: date || new Date().toISOString().split('T')[0],
      entries: entries.map(entry => ({
        accountId: entry.accountId,
        amount: entry.amount
      }))
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        transaction: result.transaction
      });
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error creating transaction with tax:', error);
    return NextResponse.json(
      { error: 'Failed to create transaction' },
      { status: 500 }
    );
  }
}
