import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    
    if (!year) {
      return NextResponse.json({ error: 'Year parameter is required' }, { status: 400 });
    }

    // Get adjusting entries for the specified year
    const adjustingEntries = await db.transaction.findMany({
      where: {
        type: 'AJUSTE',
        date: {
          gte: new Date(`${year}-01-01`),
          lte: new Date(`${year}-12-31`)
        }
      },
      include: {
        entries: {
          include: {
            account: true
          }
        }
      },
      orderBy: {
        date: 'desc'
      }
    });

    return NextResponse.json({ adjustingEntries });

  } catch (error) {
    console.error('Error fetching adjusting entries:', error);
    return NextResponse.json({ error: 'Failed to fetch adjusting entries' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { date, description, entries } = body;

    if (!date || !description || !entries || !Array.isArray(entries)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate that entries sum to zero
    const totalAmount = entries.reduce((sum: number, entry: any) => sum + Number(entry.amount), 0);
    if (Math.abs(totalAmount) > 0.01) {
      return NextResponse.json({ error: 'Entries must sum to zero' }, { status: 400 });
    }

    // Get the next voucher number for AJUSTE type
    const lastVoucher = await db.transaction.findFirst({
      where: { type: 'AJUSTE' },
      orderBy: { voucherNumber: 'desc' }
    });

    const nextVoucherNumber = (lastVoucher?.voucherNumber || 0) + 1;

    // Create the adjusting entry transaction
    const transaction = await db.transaction.create({
      data: {
        date: new Date(date),
        description,
        type: 'AJUSTE',
        voucherNumber: nextVoucherNumber,
        currency: 'HNL',
        exchangeRate: 1.0,
        functionalCurrency: 'HNL',
        totalAmount: BigInt(0),
        functionalAmount: BigInt(0),
        entries: {
          create: entries.map((entry: any) => ({
            accountId: entry.accountId,
            amount: BigInt(entry.amount),
            originalAmount: BigInt(entry.amount),
            currency: 'HNL',
            exchangeRate: 1.0
          }))
        }
      },
      include: {
        entries: {
          include: {
            account: true
          }
        }
      }
    });

    return NextResponse.json({ transaction });

  } catch (error) {
    console.error('Error creating adjusting entry:', error);
    return NextResponse.json({ error: 'Failed to create adjusting entry' }, { status: 500 });
  }
}
