import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createMultiCurrencyTransaction } from '@/lib/services/multi-currency-server';
import { setupAuditContext } from '@/lib/audit-context';

export async function POST(request: NextRequest) {
  try {
    // Set up audit context
    const userId = request.headers.get('x-user-id') || 'system';
    setupAuditContext(request, userId);

    const body = await request.json();
    
    // Validate required fields
    if (!body.description || !body.currency || !body.entries) {
      return NextResponse.json(
        { error: 'Missing required fields: description, currency, entries' },
        { status: 400 }
      );
    }

    // Validate entries
    if (!Array.isArray(body.entries) || body.entries.length < 2) {
      return NextResponse.json(
        { error: 'Transaction must have at least 2 entries' },
        { status: 400 }
      );
    }

    // Validate that all entries have required fields
    for (const entry of body.entries) {
      if (!entry.accountId || entry.amount === undefined) {
        return NextResponse.json(
          { error: 'All entries must have accountId and amount' },
          { status: 400 }
        );
      }
    }

    // Create the multi-currency transaction
    const transaction = await createMultiCurrencyTransaction(body, userId);

    return NextResponse.json(transaction);
  } catch (error) {
    console.error('Error creating transaction:', error);
    return NextResponse.json(
      { error: 'Failed to create transaction' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const currency = searchParams.get('currency');

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    if (currency) {
      where.currency = currency;
    }

    const [transactions, total] = await Promise.all([
      (db as any).transaction.findMany({
        where,
        include: {
          entries: {
            include: {
              account: true
            }
          }
        },
        orderBy: {
          date: 'desc'
        },
        skip,
        take: limit,
      }),
      (db as any).transaction.count({ where })
    ]);

    return NextResponse.json({
      transactions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}
