import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    
    if (!year) {
      return NextResponse.json({ error: 'Year parameter is required' }, { status: 400 });
    }

    // Get trial balance for the specified year
    const accounts = await db.account.findMany({
      where: {
        entries: {
          some: {
            transaction: {
              date: {
                gte: new Date(`${year}-01-01`),
                lte: new Date(`${year}-12-31`)
              }
            }
          }
        }
      },
      include: {
        entries: {
          where: {
            transaction: {
              date: {
                gte: new Date(`${year}-01-01`),
                lte: new Date(`${year}-12-31`)
              }
            }
          },
          include: {
            transaction: true
          }
        }
      },
      orderBy: [
        { type: 'asc' },
        { code: 'asc' }
      ]
    });

    // Calculate balances for each account
    const trialBalance = accounts.map((account: any) => {
      const balance = account.entries.reduce((sum: number, entry: any) => {
        return sum + Number(entry.amount);
      }, 0);

      return {
        id: account.id,
        name: account.name,
        code: account.code,
        type: account.type,
        balance,
        debit: account.type === 'ASSET' || account.type === 'EXPENSE' ? Math.max(0, balance) : 0,
        credit: account.type === 'LIABILITY' || account.type === 'EQUITY' || account.type === 'REVENUE' ? Math.max(0, -balance) : 0
      };
    });

    // Calculate totals
    const totalDebits = trialBalance.reduce((sum: number, account: any) => sum + account.debit, 0);
    const totalCredits = trialBalance.reduce((sum: number, account: any) => sum + account.credit, 0);

    return NextResponse.json({
      year,
      trialBalance,
      totalDebits,
      totalCredits,
      isBalanced: Math.abs(totalDebits - totalCredits) < 0.01
    });

  } catch (error) {
    console.error('Error generating trial balance:', error);
    return NextResponse.json({ error: 'Failed to generate trial balance' }, { status: 500 });
  }
}
