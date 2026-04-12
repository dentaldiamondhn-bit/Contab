import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

enum AccountType {
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY', 
  EQUITY = 'EQUITY',
  REVENUE = 'REVENUE',
  EXPENSE = 'EXPENSE'
}

interface AccountReport {
  name: string;
  type: AccountType;
  total: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = new Date(searchParams.get('startDate') || '');
    const endDate = new Date(searchParams.get('endDate') || '');

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date parameters' },
        { status: 400 }
      );
    }

    const data = await db.account.findMany({
      where: {
        type: { in: [AccountType.REVENUE, AccountType.EXPENSE] }
      },
      include: {
        entries: {
          where: {
            transaction: {
              date: { gte: startDate, lte: endDate }
            }
          }
        }
      }
    });

    const report: AccountReport[] = data.map((account: any) => ({
      name: account.name,
      type: account.type as AccountType,
      total: account.entries.reduce((sum: number, e: any) => sum + Number(e.amount), 0)
    }));

    const revenue = report.filter((a: AccountReport) => a.type === AccountType.REVENUE);
    const expenses = report.filter((a: AccountReport) => a.type === AccountType.EXPENSE);

    return NextResponse.json({ revenue, expenses });
  } catch (error) {
    console.error('Error generating P&L report:', error);
    return NextResponse.json(
      { error: 'Failed to generate P&L report' },
      { status: 500 }
    );
  }
}
